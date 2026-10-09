'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  clearDraftPointer,
  readDraftPointer,
  saveDraftPointer,
} from '@/lib/draft-storage';
import {
  fromStored,
  getDraft,
  getSchema,
  saveStep,
  startResponse,
  submitSurvey,
  toPayload,
} from '@/lib/survey-client';
import { validateIdentity, validateStep } from '@/lib/zod-schema-builder';
import {
  EMPTY_IDENTITY,
  fieldName,
  type AnswerValue,
  type Identity,
  type MissingItem,
  type RuleViolation,
  type SurveySchema,
} from '@/lib/survey-schema.types';
import {
  PIVOT_KEY,
  buildSteps,
  questionsForStep,
  resolveEvaluableAreas,
  type WizardStep,
} from './wizard-steps';

/** Minutos que el instrumento declara para diligenciarse completo. */
const TARGET_MINUTES = 15;

type Answers = Record<string, AnswerValue | undefined>;

export interface WizardState {
  schema: SurveySchema | null;
  loading: boolean;
  loadError: string | null;
  resumable: boolean;
  started: boolean;
  steps: WizardStep[];
  stepIndex: number;
  answers: Answers;
  errors: Record<string, string>;
  stepError: string | null;
  busy: boolean;
  submitted: boolean;
  remainingMinutes: number | null;
  identity: Identity;
  identityErrors: Record<string, string>;
}

export function useSurveyWizard() {
  const [schema, setSchema] = useState<SurveySchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [resumable, setResumable] = useState(false);
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [identityErrors, setIdentityErrors] = useState<Record<string, string>>({});

  /**
   * Hay respuestas escritas en este paso que todavía no viajaron al borrador. El borrador
   * se guarda al pasar de pantalla, así que cerrar la pestaña a media pantalla pierde solo
   * esa pantalla — poco, pero suficiente para que alguien no vuelva.
   */
  const [dirty, setDirty] = useState(false);

  /** Duración de los pasos ya completados, para estimar lo que falta. */
  const [stepDurations, setStepDurations] = useState<number[]>([]);
  const stepStartedAt = useRef<number>(0);

  useEffect(() => {
    stepStartedAt.current = Date.now();
  }, [stepIndex]);

  /*
   * El navegador pregunta antes de cerrar si queda algo sin guardar. Solo se arma cuando
   * de verdad hay algo que perder: un aviso que salta siempre se aprende a ignorar.
   */
  useEffect(() => {
    if (!dirty || submitted) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, submitted]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await getSchema();
        if (cancelled) return;
        setSchema(loaded);
        setResumable(readDraftPointer() !== null);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'No pudimos cargar la encuesta. Intente de nuevo en unos minutos.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const evaluableAreas = useMemo(() => {
    const pivot = answers[PIVOT_KEY];
    const selected = pivot?.kind === 'options' ? pivot.values : undefined;
    return resolveEvaluableAreas(schema?.areas ?? [], selected);
  }, [answers, schema]);

  const steps = useMemo(
    () => (schema ? buildSteps(schema, evaluableAreas.map((area) => area.code)) : []),
    [schema, evaluableAreas],
  );

  const currentStep = steps[stepIndex] as WizardStep | undefined;

  const currentComponent = useMemo(() => {
    if (!schema || currentStep?.kind !== 'component') return null;
    return schema.components.find((component) => component.id === currentStep.componentId) ?? null;
  }, [schema, currentStep]);

  const currentEntries = useMemo(() => {
    if (!currentComponent || currentStep?.kind !== 'component') return [];
    return questionsForStep(currentComponent, currentStep, evaluableAreas);
  }, [currentComponent, currentStep, evaluableAreas]);

  /**
   * Minutos restantes con el ritmo real del encuestado. Antes de tener dos pasos medidos
   * se extrapola desde los 15 minutos que declara el instrumento, para no mostrar una
   * estimación errática al principio.
   */
  const remainingMinutes = useMemo(() => {
    if (steps.length === 0) return null;
    const remaining = steps.length - stepIndex - 1;
    if (remaining <= 0) return 0;

    const perStepMs =
      stepDurations.length >= 2
        ? stepDurations.reduce((sum, ms) => sum + ms, 0) / stepDurations.length
        : (TARGET_MINUTES * 60_000) / steps.length;

    return Math.max(1, Math.round((remaining * perStepMs) / 60_000));
  }, [steps.length, stepIndex, stepDurations]);

  const setAnswer = useCallback((key: string, value: AnswerValue | undefined) => {
    setDirty(true);
    setAnswers((previous) => {
      if (value === undefined) {
        if (!(key in previous)) return previous;
        const next = { ...previous };
        delete next[key];
        return next;
      }
      return { ...previous, [key]: value };
    });
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  /**
   * Comprueba la identificación contra el catálogo. Devuelve `true` si está completa; el
   * servidor la vuelve a exigir al enviar, así que esto solo evita el viaje de ida.
   */
  const checkIdentity = useCallback(() => {
    if (!schema) return false;
    const problems = validateIdentity(
      identity,
      schema.areas.filter((area) => area.isEvaluable).map((area) => area.code),
      schema.roles.map((role) => role.value),
    );
    setIdentityErrors(problems);
    if (Object.keys(problems).length > 0) {
      setStepError('Indique su área y su cargo para continuar.');
      return false;
    }
    setStepError(null);
    return true;
  }, [schema, identity]);

  /** Abre un borrador nuevo. */
  const begin = useCallback(async () => {
    if (!checkIdentity()) return;

    setBusy(true);
    setStepError(null);
    try {
      const { draftToken: token } = await startResponse();
      setDraftToken(token);
      saveDraftPointer(token, 0);
      setStarted(true);
      setStepIndex(1);
    } catch (error) {
      setStepError(
        error instanceof ApiError
          ? error.message
          : 'No pudimos iniciar la encuesta. Intente de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }, [checkIdentity]);

  /** Retoma el borrador guardado en este navegador. */
  const resume = useCallback(async () => {
    const pointer = readDraftPointer();
    if (!pointer || !schema) return;

    setBusy(true);
    setStepError(null);
    try {
      const draft = await getDraft(pointer.draftToken);
      if (draft.status === 'COMPLETED') {
        clearDraftPointer();
        setSubmitted(true);
        return;
      }

      const questionByCode = new Map(
        schema.components.flatMap((component) =>
          component.questions.map((question) => [question.code, question] as const),
        ),
      );

      const restored: Answers = {};
      for (const stored of draft.answers) {
        const question = questionByCode.get(stored.questionCode);
        if (!question) continue;
        const value = fromStored(question, stored);
        if (value !== undefined) {
          restored[fieldName(stored.questionCode, stored.targetArea)] = value;
        }
      }

      setDraftToken(pointer.draftToken);
      setAnswers(restored);
      setIdentity({
        ownArea: draft.ownArea ?? '',
        respondentRole: draft.respondentRole ?? '',
      });
      setStarted(true);
      // `lastStep` es el id del último componente guardado; el paso siguiente arranca ahí.
      setStepIndex(Math.max(1, draft.lastStep));
    } catch (error) {
      // Un borrador que ya no existe en el servidor no debe bloquear el arranque.
      clearDraftPointer();
      setResumable(false);
      setStepError(
        error instanceof ApiError
          ? 'No encontramos su borrador anterior. Puede empezar de nuevo.'
          : 'No pudimos recuperar su borrador.',
      );
    } finally {
      setBusy(false);
    }
  }, [schema]);

  const goBack = useCallback(() => {
    setStepError(null);
    setErrors({});
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const goToComponent = useCallback(
    (componentId: number) => {
      // El componente 0 es la identificación, que no es un paso del instrumento sino la
      // bienvenida. Es la misma convención que usa el back al reportar faltantes.
      if (componentId === 0) {
        setStepIndex(0);
        setStepError(null);
        return;
      }

      const target = steps.findIndex(
        (step) => step.kind === 'component' && step.componentId === componentId,
      );
      if (target >= 0) {
        setStepIndex(target);
        setStepError(null);
      }
    },
    [steps],
  );

  /** Cierra la encuesta. Si faltan respuestas, lleva al paso del primer componente incompleto. */
  const finish = useCallback(async () => {
    if (!draftToken) return;

    setBusy(true);
    setStepError(null);
    try {
      await submitSurvey(draftToken);
      clearDraftPointer();
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError && error.isValidationError) {
        const body = error.body as { missing?: MissingItem[] } | undefined;
        const missing = body?.missing ?? [];

        // El componente 0 es la identificación, que vive en el paso de bienvenida.
        const identityMissing = missing.filter((item) => item.componentId === 0);
        if (identityMissing.length > 0) {
          setIdentityErrors(
            Object.fromEntries(
              identityMissing.map((item) => [
                item.questionCode,
                item.questionCode === 'ownArea'
                  ? 'Indique a qué área pertenece.'
                  : 'Indique su cargo.',
              ]),
            ),
          );
          setStepIndex(0);
          setStepError('Falta la identificación: indique su área y su cargo.');
          return;
        }

        if (missing.length > 0) {
          const fieldErrors: Record<string, string> = {};
          for (const item of missing) {
            fieldErrors[fieldName(item.questionCode, item.targetArea)] =
              'Esta pregunta es obligatoria.';
          }
          setErrors(fieldErrors);
          goToComponent(missing[0].componentId);
          setStepError('Faltan respuestas obligatorias en este componente.');
          return;
        }
      }
      setStepError(
        error instanceof ApiError ? error.message : 'No pudimos enviar la encuesta.',
      );
    } finally {
      setBusy(false);
    }
  }, [draftToken, goToComponent]);

  /** Valida el paso, lo guarda y avanza. */
  const goNext = useCallback(async () => {
    if (!schema || !currentStep) return;

    if (currentStep.kind === 'welcome') {
      if (!checkIdentity()) return;
      setStepIndex((index) => index + 1);
      return;
    }

    if (currentStep.kind === 'review') {
      await finish();
      return;
    }

    const validationErrors = validateStep(
      currentEntries.map((entry) => ({
        question: entry.question,
        targetArea: entry.targetArea,
        value: answers[fieldName(entry.question.code, entry.targetArea)],
      })),
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStepError('Revise las respuestas señaladas antes de continuar.');
      return;
    }

    if (!draftToken) {
      setStepError('La sesión de la encuesta se perdió. Recargue la página.');
      return;
    }

    setBusy(true);
    setStepError(null);
    try {
      const payloads = currentEntries.map((entry) =>
        toPayload(
          entry.question,
          answers[fieldName(entry.question.code, entry.targetArea)],
          entry.targetArea,
        ),
      );

      // La identificación viaja con cada paso: es el único canal que tiene el borrador
      // para recibirla, y reenviarla es idempotente.
      await saveStep(draftToken, currentStep.componentId, payloads, {
        ownArea: identity.ownArea || undefined,
        respondentRole: identity.respondentRole || undefined,
      });

      saveDraftPointer(draftToken, currentStep.componentId);
      setDirty(false);
      const elapsed = Date.now() - stepStartedAt.current;
      setStepDurations((previous) => [...previous, elapsed]);
      setErrors({});
      setStepIndex((index) => index + 1);
    } catch (error) {
      applyServerErrors(error, setErrors, setStepError);
    } finally {
      setBusy(false);
    }
  }, [
    schema,
    currentStep,
    currentEntries,
    answers,
    draftToken,
    identity,
    checkIdentity,
    finish,
  ]);


  return {
    state: {
      schema,
      loading,
      loadError,
      resumable,
      started,
      steps,
      stepIndex,
      answers,
      errors,
      stepError,
      busy,
      submitted,
      remainingMinutes,
      identity,
      identityErrors,
    } satisfies WizardState,
    currentStep,
    currentComponent,
    currentEntries,
    evaluableAreas,
    actions: { begin, resume, goBack, goNext, goToComponent, setAnswer, setIdentity, finish },
  };
}

/** Traduce un 422 del servidor a errores por campo. */
function applyServerErrors(
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
  setStepError: (message: string) => void,
) {
  if (error instanceof ApiError && error.isValidationError) {
    const body = error.body as { violations?: RuleViolation[] } | undefined;
    const violations = body?.violations ?? [];
    if (violations.length > 0) {
      const fieldErrors: Record<string, string> = {};
      for (const violation of violations) {
        fieldErrors[fieldName(violation.questionCode, violation.targetArea)] =
          violation.message;
      }
      setErrors(fieldErrors);
      setStepError('Revise las respuestas señaladas.');
      return;
    }
  }

  setStepError(
    error instanceof ApiError
      ? error.message
      : 'No pudimos guardar sus respuestas. Revise su conexión e intente de nuevo.',
  );
}
