import type {
  AspectMatrixRow,
  CountedOption,
  DistributionRow,
  IndicesByAreaPayload,
  IndicesByRolePayload,
  InfluenceLevel,
  InfluenceNode,
  InfluenceZone,
  ItemStat,
  MonitoringPayload,
  NetworkPayload,
  QualityPayload,
  NpsResult,
  OverviewPayload,
  PerceptionGapRow,
  RadarPoint,
  ThresholdBand,
} from './admin.types';
import { ASPECT_LABELS } from './admin.types';
import { classify, formatDuration, formatIndex, formatNps, formatNumber, formatRelative } from './score-scale';

/**
 * El motor de lecturas del panel.
 *
 * Un panel que solo pinta números obliga a cada lector a sacar su propia conclusión, y en
 * una presentación gerencial eso significa que cada quien saca una distinta. Aquí vive la
 * conclusión, escrita una sola vez y calculada desde el mismo dato que se pinta al lado.
 *
 * Tres reglas que se respetan en todo el archivo:
 *
 * 1. **Nunca se afirma más de lo que el dato sostiene.** Si falta el dato, la lectura lo
 *    dice; no se rellena con una frase optimista.
 * 2. **El tono sale de la banda, no de un umbral escrito aquí.** Los umbrales viven en
 *    `indicator_thresholds` y un admin puede moverlos sin desplegar; esto los lee.
 * 3. **Se nombra siempre el caso concreto.** «La comunicación está en riesgo» sirve;
 *    «hay oportunidades de mejora» no.
 */

export type Tone = 'good' | 'neutral' | 'warn' | 'bad';

export interface Insight {
  tone: Tone;
  /** La conclusión, en una frase. Es lo que se lee de un vistazo. */
  headline: string;
  /** El dato que la sostiene. Opcional: no toda lectura necesita nota al pie. */
  detail?: string;
  /**
   * El fragmento literal del titular que carga la conclusión («en riesgo», «partida en
   * dos»). Las cabeceras lo destacan con el degradado de la marca; si falta, el titular se
   * pinta parejo.
   */
  emphasis?: string;
}

/**
 * Tono de una banda por su posición en la lista, no por su etiqueta.
 *
 * Las bandas llegan ordenadas de mejor a peor (`sortOrder`) y sus nombres son editables:
 * leer la palabra «Crítico» sería atarse a un texto que el cliente puede cambiar.
 */
export function toneOfBand(band: ThresholdBand | null, bands: ThresholdBand[]): Tone {
  if (!band || bands.length === 0) return 'neutral';
  const index = bands.findIndex((entry) => entry.label === band.label);
  if (index < 0) return 'neutral';
  const tones: Tone[] = ['good', 'neutral', 'warn', 'bad'];
  return tones[Math.min(index, tones.length - 1)];
}

/** Las cifras de las lecturas usan el mismo formato que las tarjetas: «57,6», no «57.6». */
const nf = (value: number, decimals = 0) => formatNumber(value, decimals);

/** Ordena puntos del radar de peor a mejor, descartando los que no tienen dato. */
function withValue(points: RadarPoint[]): (RadarPoint & { value: number })[] {
  return points.filter(
    (point): point is RadarPoint & { value: number } => point.value !== null,
  );
}

// ---------------------------------------------------------------- índice compuesto

export function imcInsight(
  imc: OverviewPayload['imc'],
  bands: ThresholdBand[],
): Insight {
  if (imc.value === null) {
    return {
      tone: 'neutral',
      headline: 'Todavía no hay suficientes respuestas para calcular el índice.',
    };
  }

  const tone = toneOfBand(imc.band, bands);
  const label = imc.band?.label ?? 'sin banda';
  const frases: Record<Tone, string> = {
    good: `La colaboración entre áreas es hoy una fortaleza de LinkTIC: ${nf(imc.value, 1)} sobre 100.`,
    neutral: `La colaboración entre áreas funciona, sin holgura: ${nf(imc.value, 1)} sobre 100.`,
    warn: `La colaboración entre áreas está en riesgo: ${nf(imc.value, 1)} sobre 100.`,
    bad: `La colaboración entre áreas es crítica: ${nf(imc.value, 1)} sobre 100.`,
  };

  const enfasis: Record<Tone, string> = {
    good: 'una fortaleza',
    neutral: 'sin holgura',
    warn: 'en riesgo',
    bad: 'crítica',
  };

  return {
    tone,
    headline: frases[tone],
    detail: `Banda «${label}», calculada sobre ${imc.respondents} ${imc.respondents === 1 ? 'respuesta' : 'respuestas'}.`,
    emphasis: enfasis[tone],
  };
}

// ---------------------------------------------------------------- perfil de índices

export function radarInsight(points: RadarPoint[], bands: ThresholdBand[]): Insight {
  const conDato = withValue(points);
  if (conDato.length < 2) {
    return { tone: 'neutral', headline: 'Faltan índices con dato para leer el perfil.' };
  }

  const ordenados = [...conDato].sort((a, b) => a.value - b.value);
  const peor = ordenados[0];
  const mejor = ordenados[ordenados.length - 1];
  const distancia = mejor.value - peor.value;

  const tone = toneOfBand(peor.band, bands);
  const parejo = distancia < 10;

  return {
    tone,
    headline: parejo
      ? `El perfil es parejo: los ${conDato.length} índices caben en ${nf(distancia, 1)} puntos, así que no hay un frente único que atacar.`
      : `${peor.label} es el eslabón débil (${nf(peor.value, 1)}) y ${mejor.label} el más fuerte (${nf(mejor.value, 1)}).`,
    emphasis: parejo ? 'parejo' : peor.label,
    detail: parejo
      ? `Entre ${peor.label} (${nf(peor.value, 1)}) y ${mejor.label} (${nf(mejor.value, 1)}).`
      : `${nf(distancia, 1)} puntos separan el extremo débil del fuerte.`,
  };
}

/**
 * Qué índices le restan más al compuesto. No es el más bajo sin más: un índice flojo que
 * pesa poco resta menos que uno mediocre que pesa mucho, y es la resta la que decide
 * dónde mover la aguja del IMC.
 */
export function compositeInsight(
  points: RadarPoint[],
  weights: { indicatorCode: string; weight: number }[],
): Insight {
  const pesos = new Map(weights.map((entry) => [entry.indicatorCode, entry.weight]));
  const restas = withValue(points)
    .filter((point) => pesos.has(point.code))
    .map((point) => ({ point, resta: (pesos.get(point.code) ?? 0) * (100 - point.value) }))
    .sort((a, b) => b.resta - a.resta);

  if (restas.length < 2) {
    return { tone: 'neutral', headline: 'Faltan índices con dato para descomponer el compuesto.' };
  }

  const total = restas.reduce((sum, entry) => sum + entry.resta, 0);
  const [primero, segundo] = restas;
  const par = `${primero.point.label} y ${segundo.point.label}`;

  return {
    tone: 'neutral',
    headline: `${par} son los que más le restan al índice compuesto`,
    emphasis: par,
    detail: `Entre los dos explican ${nf(primero.resta + segundo.resta, 1)} de los ${nf(total, 1)} puntos que le faltan al IMC para llegar a 100.`,
  };
}

/** Los índices que hay que atacar primero, de peor a mejor. */
export function priorities(
  points: RadarPoint[],
  bands: ThresholdBand[],
  limit = 3,
): { point: RadarPoint & { value: number }; tone: Tone; action: string }[] {
  const ACCIONES: Record<string, string> = {
    IREL: 'Revisar los pares de áreas peor calificados en el mapa de relacionamiento.',
    ICOM: 'Revisar canales y trazabilidad: qué información llega tarde y por dónde.',
    ISI: 'Revisar el circuito de solicitudes entre áreas y quién responde por él.',
    IAG: 'Fijar tiempos de respuesta comprometidos y medirlos.',
    IINT: 'Aclarar roles y responsabilidades en los procesos que cruzan áreas.',
    ICOL: 'Crear espacios de trabajo conjunto donde hoy solo hay traspaso de tareas.',
    IINN: 'Abrir iniciativas conjuntas con las áreas que hoy no colaboran con nadie.',
    NIO: 'Verificar si el bajo nivel de interacción es un problema o el diseño del proceso.',
  };

  return withValue(points)
    .sort((a, b) => a.value - b.value)
    .slice(0, limit)
    .map((point) => ({
      point,
      tone: toneOfBand(point.band, bands),
      action: ACCIONES[point.code] ?? 'Revisar el componente que alimenta este índice.',
    }));
}

/** Lo que sí está funcionando. Un panel que solo señala fallas no se usa dos veces. */
export function strengths(
  points: RadarPoint[],
  bands: ThresholdBand[],
  limit = 3,
): { point: RadarPoint & { value: number }; tone: Tone }[] {
  return withValue(points)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((point) => ({ point, tone: toneOfBand(point.band, bands) }));
}

/**
 * Cómo titular la lista de arriba.
 *
 * «Lo que sostiene» es verdad solo si algo está realmente sólido. Cuando el mejor índice
 * también está en riesgo, ese título le dice a gerencia que hay una base que en realidad
 * no existe — y ese es justo el error que un panel no puede cometer.
 */
export function strengthsHeading(
  items: { tone: Tone }[],
): { title: string; note?: string } {
  if (items.length === 0) return { title: 'Lo que sostiene' };
  const mejor = items[0].tone;
  if (mejor === 'good') return { title: 'Lo que sostiene' };
  if (mejor === 'neutral') return { title: 'Lo mejor que hay hoy' };
  return {
    title: 'Lo menos malo',
    note: 'Ningún índice llega a un nivel aceptable: no hay una base sobre la cual apoyarse.',
  };
}

// ---------------------------------------------------------------- NPS

export function npsInsight(nps: NpsResult): Insight {
  if (nps.value === null || nps.total === 0) {
    return { tone: 'neutral', headline: 'Sin calificaciones de recomendación todavía.' };
  }

  const share = (count: number) => Math.round((count / nps.total) * 100);
  const promotores = share(nps.promoters);
  const detractores = share(nps.detractors);
  const pasivos = share(nps.passives);

  // Un NPS cercano a cero puede ser indiferencia o polarización, y son diagnósticos
  // opuestos. La lectura tiene que distinguirlos: es el punto de mostrar la composición.
  const polarizado = promotores >= 30 && detractores >= 30;
  const indiferente = pasivos >= 50;

  const tone: Tone =
    nps.value >= 30 ? 'good' : nps.value >= 0 ? 'neutral' : nps.value >= -20 ? 'warn' : 'bad';

  if (polarizado) {
    return {
      tone: 'warn',
      headline: `La experiencia está partida en dos: ${promotores} % recomienda trabajar con su área y ${detractores} % no lo haría.`,
      detail: `El NPS neto (${formatNps(nps.value)}) esconde esa división. Conviene leerlo por área antes que en global.`,
      emphasis: 'partida en dos',
    };
  }

  if (indiferente) {
    return {
      tone: 'warn',
      headline: `Domina la indiferencia: ${pasivos} % son pasivos, ni recomiendan ni desaconsejan.`,
      detail: 'Es el perfil de una relación que funciona pero no genera adhesión.',
      emphasis: 'indiferencia',
    };
  }

  const frases: Record<Tone, string> = {
    good: `Hay adhesión real: ${promotores} % recomendaría trabajar con su área, contra ${detractores} % que no.`,
    neutral: `La experiencia se sostiene apenas: ${promotores} % promotores contra ${detractores} % detractores.`,
    warn: `Pesan más los detractores: ${detractores} % no recomendaría trabajar con su área, contra ${promotores} % que sí.`,
    bad: `La experiencia de servicio interno está rota: ${detractores} % detractores contra ${promotores} % promotores.`,
  };

  const enfasis: Record<Tone, string> = {
    good: 'adhesión real',
    neutral: 'se sostiene apenas',
    warn: 'los detractores',
    bad: 'está rota',
  };

  return {
    tone,
    headline: frases[tone],
    detail: `${nps.total} ${nps.total === 1 ? 'calificación' : 'calificaciones'} de área.`,
    emphasis: enfasis[tone],
  };
}

// ---------------------------------------------------------------- recolección

export function collectionInsight(
  participation: OverviewPayload['participation'],
  completion: OverviewPayload['completion'],
  n: number,
  minCohortSize: number,
): Insight {
  const abandono =
    completion.started > 0
      ? ((completion.started - completion.completed) / completion.started) * 100
      : null;

  if (participation.rate === null) {
    return {
      tone: 'neutral',
      headline: `${n} ${n === 1 ? 'respuesta completa' : 'respuestas completas'}. No se puede calcular la participación.`,
      detail:
        'Falta registrar cuántas personas tiene cada área; sin ese dato no se sabe qué porción de la empresa habló.',
    };
  }

  const tone: Tone =
    participation.rate >= 70
      ? 'good'
      : participation.rate >= 50
        ? 'neutral'
        : participation.rate >= 30
          ? 'warn'
          : 'bad';

  const frases: Record<Tone, string> = {
    good: `Habló ${nf(participation.rate, 1)} % de la empresa: el corte es representativo.`,
    neutral: `Habló ${nf(participation.rate, 1)} % de la empresa. Alcanza para leer tendencias, no para cerrar conclusiones por área.`,
    warn: `Solo habló ${nf(participation.rate, 1)} % de la empresa: las cifras orientan, no concluyen.`,
    bad: `Con ${nf(participation.rate, 1)} % de participación las cifras no son representativas todavía.`,
  };

  const detalle = [
    `${participation.completed} de ${participation.population} personas.`,
    abandono !== null && abandono >= 20
      ? `${nf(abandono, 0)} % de quienes la abrieron no la terminaron.`
      : null,
    `Los cortes con menos de ${minCohortSize} respuestas se ocultan para preservar el anonimato.`,
  ]
    .filter(Boolean)
    .join(' ');

  return { tone, headline: frases[tone], detail: detalle };
}

// ---------------------------------------------------------------- mapa

export function gapInsight(rows: PerceptionGapRow[]): Insight {
  const conDato = rows.filter(
    (row): row is PerceptionGapRow & { gap: number } => row.gap !== null,
  );
  if (conDato.length === 0) {
    return { tone: 'neutral', headline: 'Ningún área tiene los dos lados de la brecha.' };
  }

  // La brecha es `recibido − otorgado`. Positiva significa que el área recibe mejores
  // notas de las que reparte —es la exigente—; negativa, que reparte mejores notas de las
  // que recibe. Es fácil leerlo al revés, y el signo cambia por completo la conclusión.
  const ordenadas = [...conDato].sort((a, b) => a.gap - b.gap);
  const generosa = ordenadas[0];
  const exigente = ordenadas[ordenadas.length - 1];

  const mayor = Math.abs(generosa.gap) > Math.abs(exigente.gap) ? generosa : exigente;
  const tone: Tone = Math.abs(mayor.gap) >= 15 ? 'warn' : 'neutral';

  return {
    tone,
    headline:
      mayor.gap > 0
        ? `${mayor.areaName} es la más exigente: califica ${nf(mayor.gap, 1)} puntos por debajo de la nota que ella misma recibe.`
        : `A ${mayor.areaName} la califican ${nf(Math.abs(mayor.gap), 1)} puntos por debajo de como ella califica a las demás.`,
    detail:
      'Una brecha grande no es buen ni mal desempeño: es una expectativa desalineada entre lo que un área cree dar y lo que las demás reciben.',
  };
}

export function aspectsInsight(rows: AspectMatrixRow[], bands: ThresholdBand[]): Insight {
  if (rows.length === 0) return { tone: 'neutral', headline: 'Sin evaluaciones por aspecto.' };

  const promedios = Object.keys(ASPECT_LABELS).map((code) => {
    const valores = rows
      .map((row) => row.aspects[code])
      .filter((value): value is number => typeof value === 'number');
    return {
      code,
      label: ASPECT_LABELS[code],
      value: valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null,
    };
  });

  const conDato = promedios.filter(
    (entry): entry is { code: string; label: string; value: number } => entry.value !== null,
  );
  if (conDato.length === 0) return { tone: 'neutral', headline: 'Sin evaluaciones por aspecto.' };

  const ordenados = [...conDato].sort((a, b) => a.value - b.value);
  const peor = ordenados[0];
  const mejor = ordenados[ordenados.length - 1];
  const distancia = mejor.value - peor.value;
  const banda = bands.find((b) => peor.value >= b.minValue && peor.value <= b.maxValue) ?? null;

  // Con los cinco aspectos casi empatados, nombrar «el más flojo» inventa una jerarquía
  // que el dato no sostiene: cuatro puntos de diferencia no señalan a nadie.
  if (distancia < 8) {
    return {
      tone: toneOfBand(banda, bands),
      headline: `Los cinco aspectos van parejos, entre ${nf(peor.value, 1)} y ${nf(mejor.value, 1)}: ningún aspecto concreto explica el resultado.`,
      detail:
        'Cuando no hay un aspecto que se despegue, la palanca no es una conversación con un área sino un cambio de proceso que los mueva a todos.',
    };
  }

  return {
    tone: toneOfBand(banda, bands),
    headline: `${peor.label} es el aspecto más flojo en toda la empresa (${nf(peor.value, 1)}), y ${mejor.label} el más sólido (${nf(mejor.value, 1)}).`,
    detail:
      'Un aspecto flojo en TODAS las áreas es un problema de sistema, no de un área concreta: la solución es un cambio de proceso, no una conversación.',
  };
}

export function rankingInsight(
  rows: { areaName: string; irel: number | null }[],
  suppressed: number,
): Insight {
  const conDato = rows.filter(
    (row): row is { areaName: string; irel: number } => row.irel !== null,
  );
  if (conDato.length === 0) {
    return {
      tone: 'neutral',
      headline: 'Ningún área alcanza todavía la cohorte mínima para publicarse.',
      detail: suppressed > 0 ? `${suppressed} ocultas por tener muy pocas respuestas.` : undefined,
    };
  }

  const ordenadas = [...conDato].sort((a, b) => b.irel - a.irel);
  const mejor = ordenadas[0];
  const peor = ordenadas[ordenadas.length - 1];
  const distancia = mejor.irel - peor.irel;

  return {
    tone: distancia >= 20 ? 'warn' : 'neutral',
    headline:
      distancia >= 20
        ? `La experiencia de trabajar con un área u otra es muy desigual: ${nf(distancia, 1)} puntos entre ${mejor.areaName} y ${peor.areaName}.`
        : `Las áreas se evalúan de forma pareja: ${nf(distancia, 1)} puntos entre la mejor y la peor.`,
    detail: `${mejor.areaName} ${nf(mejor.irel, 1)} · ${peor.areaName} ${nf(peor.irel, 1)}${suppressed > 0 ? ` · ${suppressed} ${suppressed === 1 ? 'área oculta' : 'áreas ocultas'} por cohorte insuficiente` : ''}.`,
  };
}

export function byAreaInsight(payload: IndicesByAreaPayload): Insight {
  if (payload.rows.length === 0) {
    return {
      tone: 'neutral',
      headline: 'Ningún área alcanza la cohorte mínima para desglosarse.',
      detail: 'Con más respuestas se podrá ver si la percepción crítica se concentra en un área.',
    };
  }

  const promedio = (indicators: Record<string, number | null>) => {
    const valores = Object.values(indicators).filter(
      (value): value is number => typeof value === 'number',
    );
    return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
  };

  const conMedia = payload.rows
    .map((row) => ({ ...row, media: promedio(row.indicators) }))
    .filter((row): row is typeof row & { media: number } => row.media !== null)
    .sort((a, b) => a.media - b.media);

  if (conMedia.length < 2) {
    return { tone: 'neutral', headline: 'Se necesitan al menos dos áreas con dato para comparar.' };
  }

  const critica = conMedia[0];
  const conforme = conMedia[conMedia.length - 1];
  const distancia = conforme.media - critica.media;

  return {
    tone: distancia >= 15 ? 'warn' : 'neutral',
    headline:
      distancia >= 15
        ? `La gente de ${critica.areaName} ve la organización mucho peor que la de ${conforme.areaName}: ${nf(distancia, 1)} puntos de diferencia.`
        : `Las áreas coinciden bastante en cómo ven la organización: ${nf(distancia, 1)} puntos entre la más crítica y la más conforme.`,
    detail:
      distancia >= 15
        ? 'Una diferencia así suele ser una experiencia de trabajo distinta, no una opinión distinta. Vale la pena escuchar a esa área aparte.'
        : undefined,
  };
}

// ---------------------------------------------------------------- cualitativo

export function barriersInsight(barriers: CountedOption[]): Insight {
  if (barriers.length === 0) return { tone: 'neutral', headline: 'Nadie ha señalado obstáculos.' };

  const ordenados = [...barriers].sort((a, b) => b.share - a.share);
  const top = ordenados[0];
  const segundo = ordenados[1];
  const dominante = segundo ? top.share - segundo.share >= 15 : true;

  return {
    tone: top.share >= 50 ? 'warn' : 'neutral',
    headline: dominante
      ? `El obstáculo dominante es ${top.label.toLowerCase()}: lo señala ${nf(top.share, 0)} % de los encuestados.`
      : `No hay un obstáculo único: ${top.label.toLowerCase()} (${nf(top.share, 0)} %) y ${segundo.label.toLowerCase()} (${nf(segundo.share, 0)} %) van casi empatados.`,
    detail: dominante
      ? 'Un obstáculo que se despega del resto es la palanca más barata: arreglarlo mueve todo lo demás.'
      : 'Sin un obstáculo dominante, atacar uno solo deja el problema en pie.',
  };
}

export function motivesInsight(motives: {
  promoters: CountedOption[];
  detractors: CountedOption[];
}): Insight {
  const { promoters, detractors } = motives;
  if (promoters.length === 0 && detractors.length === 0) {
    return { tone: 'neutral', headline: 'Sin motivos registrados todavía.' };
  }

  // Un motivo que aparece fuerte en los dos lados es la señal más útil de todo el panel:
  // significa que el mismo atributo se experimenta de forma opuesta según con quién trate.
  const porValor = new Map(detractors.map((option) => [option.value, option]));
  const ambos = promoters
    .map((option) => ({ option, contra: porValor.get(option.value) }))
    .filter(
      (entry): entry is { option: CountedOption; contra: CountedOption } =>
        entry.contra !== undefined && entry.option.share >= 15 && entry.contra.share >= 15,
    )
    .sort((a, b) => b.option.share + b.contra.share - (a.option.share + a.contra.share));

  if (ambos.length > 0) {
    const { option, contra } = ambos[0];
    return {
      tone: 'warn',
      headline: `${option.label} divide: es la razón de ${nf(option.share, 0)} % de los promotores y de ${nf(contra.share, 0)} % de los detractores.`,
      detail:
        'El mismo atributo se vive de forma opuesta según el área con la que se trate: el problema no es la empresa, es la desigualdad entre áreas.',
    };
  }

  const topDetractor = [...detractors].sort((a, b) => b.share - a.share)[0];
  const topPromotor = [...promoters].sort((a, b) => b.share - a.share)[0];

  return {
    tone: topDetractor ? 'neutral' : 'good',
    headline: topDetractor
      ? `Lo que más resta es ${topDetractor.label.toLowerCase()} (${nf(topDetractor.share, 0)} % de los detractores)${topPromotor ? `; lo que más suma es ${topPromotor.label.toLowerCase()} (${nf(topPromotor.share, 0)} %)` : ''}.`
      : `Lo que más suma es ${topPromotor.label.toLowerCase()} (${nf(topPromotor.share, 0)} % de los promotores).`,
  };
}

export function strengthenInsight(areas: CountedOption[]): Insight {
  if (areas.length === 0) {
    return { tone: 'neutral', headline: 'Nadie ha señalado un área a fortalecer.' };
  }
  const top = [...areas].sort((a, b) => b.share - a.share)[0];
  return {
    tone: 'neutral',
    headline: `${top.label} es el área que más personas piden fortalecer: ${nf(top.share, 0)} % la menciona.`,
    detail:
      'Es una petición de más relación, no una queja de desempeño: suele señalar un área con la que cuesta trabajar por diseño, no por actitud.',
  };
}

export function openAnswersInsight(
  answers: { theme: string | null }[],
  total: number,
): Insight {
  if (answers.length === 0) {
    return { tone: 'neutral', headline: 'Nadie ha dejado una respuesta abierta todavía.' };
  }
  const clasificadas = answers.filter((answer) => answer.theme).length;
  const cobertura = total > 0 ? (answers.length / total) * 100 : 0;

  return {
    tone: clasificadas === answers.length ? 'good' : 'neutral',
    headline: `${answers.length} ${answers.length === 1 ? 'persona escribió' : 'personas escribieron'} qué cambiarían (${nf(cobertura, 0)} % de quienes respondieron).`,
    detail:
      clasificadas === answers.length
        ? 'Todas están clasificadas por tema.'
        : `${answers.length - clasificadas} sin clasificar. Asignarles un tema permite contarlas junto a las cerradas.`,
  };
}

export function innovationInsight(
  edges: { sourceArea: string; targetArea: string; initiatives: number }[],
): Insight {
  if (edges.length === 0) {
    return {
      tone: 'warn',
      headline: 'Ningún área declara haber desarrollado iniciativas nuevas con otra en seis meses.',
      detail: 'La innovación conjunta es hoy inexistente, no baja.',
    };
  }

  const participantes = new Set(edges.flatMap((edge) => [edge.sourceArea, edge.targetArea]));
  const total = edges.reduce((sum, edge) => sum + edge.initiatives, 0);

  return {
    tone: 'neutral',
    headline: `${participantes.size} áreas aparecen en alguna iniciativa conjunta, con ${total} ${total === 1 ? 'mención' : 'menciones'} en total.`,
    detail: 'Las áreas que no aparecen aquí son las que no han desarrollado nada con nadie.',
  };
}

// ---------------------------------------------------------------- monitoreo

type Totals = MonitoringPayload['totals'];

const completas = (n: number) => `${n} ${n === 1 ? 'encuesta completa' : 'encuestas completas'}`;

/**
 * El titular del monitoreo: cuánto se ha recogido y qué es lo que más pesa ahora mismo.
 * Con población registrada manda la participación; sin ella, el abandono, que es lo único
 * que se puede corregir mientras la encuesta sigue abierta.
 */
export function monitoringInsight(totals: Totals, now: number = Date.now()): Insight {
  if (totals.started === 0) {
    return {
      tone: 'neutral',
      headline: 'Todavía nadie ha abierto la encuesta.',
      detail: 'En cuanto llegue la primera, este tablero se actualiza solo.',
    };
  }

  const detalle = [
    totals.lastSubmittedAt ? `La última se envió ${formatRelative(totals.lastSubmittedAt, now)}.` : 'Ninguna se ha enviado todavía.',
    totals.activeNow > 0
      ? `${totals.activeNow} ${totals.activeNow === 1 ? 'persona está respondiendo' : 'personas están respondiendo'} ahora.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  if (totals.participationRate !== null) {
    const tasa = totals.participationRate;
    const tone: Tone = tasa >= 70 ? 'good' : tasa >= 50 ? 'neutral' : tasa >= 30 ? 'warn' : 'bad';
    const fragmento = `${nf(tasa, 1)}\u202f% de la empresa`;
    return {
      tone,
      headline: `${completas(totals.completed)}: ya habló el ${fragmento}`,
      emphasis: fragmento,
      detail: detalle,
    };
  }

  const abandono = totals.completionRate === null ? null : 100 - totals.completionRate;
  if (abandono !== null && abandono >= 35 && totals.started >= 5) {
    const cuanto = abandono >= 50 ? 'más de la mitad' : `el ${nf(abandono, 0)}\u202f%`;
    return {
      tone: 'warn',
      headline: `${completas(totals.completed)}, pero ${cuanto} de quienes la abren no la termina`,
      emphasis: 'no la termina',
      detail: detalle,
    };
  }

  return {
    tone: totals.completionRate !== null && totals.completionRate >= 80 ? 'good' : 'neutral',
    headline: `${completas(totals.completed)} de ${totals.started} abiertas`,
    emphasis: completas(totals.completed),
    detail: detalle,
  };
}

/** Si la recolección sigue viva: los envíos de la última semana contra los anteriores. */
export function paceInsight(
  timeline: MonitoringPayload['timeline'],
  lastSubmittedAt: string | null,
  now: number = Date.now(),
): Insight {
  if (timeline.length === 0) {
    return { tone: 'neutral', headline: 'Todavía no hay actividad que trazar.' };
  }
  const ultimos = timeline.slice(-7).reduce((sum, day) => sum + day.completed, 0);
  const diasSinEnvio = lastSubmittedAt
    ? Math.round((now - new Date(lastSubmittedAt).getTime()) / 86_400_000)
    : null;

  if (diasSinEnvio !== null && diasSinEnvio >= 3) {
    return {
      tone: 'warn',
      headline: `La recolección se detuvo: ${diasSinEnvio} días sin una encuesta completa`,
      detail:
        'Las curvas planas al final son la señal de que la convocatoria dejó de mover gente. Un recordatorio suele reactivarla.',
    };
  }

  const pico = [...timeline].sort((a, b) => b.completed - a.completed)[0];
  return {
    tone: 'neutral',
    headline: `${completas(ultimos)} en los últimos siete días`,
    detail: pico.completed > 0 ? `El día con más envíos fue el ${pico.date.split('-').reverse().join('/')}: ${pico.completed}.` : undefined,
  };
}

/** Dónde se abandona: el paso con la caída más grande respecto al anterior. */
export function dropOffInsight(rows: { label: string; value: number }[]): Insight {
  if (rows.length < 2 || rows[0].value === 0) {
    return { tone: 'neutral', headline: 'Todavía no hay recorridos que seguir.' };
  }
  let peor = { index: -1, caida: 0 };
  rows.forEach((row, index) => {
    if (index === 0) return;
    const caida = rows[index - 1].value - row.value;
    if (caida > peor.caida) peor = { index, caida };
  });
  const final = rows[rows.length - 1].value;
  const conserva = (final / rows[0].value) * 100;

  if (peor.index < 0) {
    return {
      tone: 'good',
      headline: 'Nadie abandona a mitad de camino: quien empieza, termina.',
    };
  }

  const paso = rows[peor.index].label;
  const antes = peor.index === 1;
  return {
    tone: conserva < 60 ? 'warn' : 'neutral',
    headline: antes
      ? `La mayor pérdida ocurre antes de empezar: ${peor.caida} abren la encuesta y no guardan ni el primer componente`
      : `«${paso}» es donde más se abandona: ${peor.caida} ${peor.caida === 1 ? 'encuesta no pasa' : 'encuestas no pasan'} de ahí`,
    detail: `De cada 100 que la abren, ${nf(conserva, 0)} la envían.`,
  };
}

/** La duración de quienes terminan, contra los 15 minutos que estima el instrumento. */
export function durationInsight(median: number | null): Insight {
  if (median === null) {
    return { tone: 'neutral', headline: 'Todavía no hay encuestas terminadas con duración.' };
  }
  const texto = formatDuration(median);
  if (median < 300) {
    return {
      tone: 'warn',
      headline: `La mitad la termina en menos de ${texto}: demasiado rápido para leer 46 preguntas`,
      detail:
        'Puede ser gente que responde sin leer o envíos de prueba. Conviene revisarlo antes de sacar conclusiones del corte.',
    };
  }
  if (median > 25 * 60) {
    return {
      tone: 'warn',
      headline: `La mitad tarda más de ${texto}: bastante más de los 15 minutos prometidos`,
      detail: 'Una encuesta más larga de lo anunciado es la causa más común de abandono.',
    };
  }
  return {
    tone: 'good',
    headline: `La mitad la termina en ${texto}, cerca de los 15 minutos estimados`,
  };
}

/** Cuántas áreas ya tienen respuestas suficientes para publicarse sin romper el anonimato. */
export function coverageInsight(
  areas: MonitoringPayload['byArea'],
  minCohortSize: number,
): Insight {
  const evaluables = areas.filter((area) => area.areaCode !== 'OTRA');
  const listas = evaluables.filter((area) => area.completed >= minCohortSize).length;
  const vacias = evaluables.filter((area) => area.completed === 0).length;
  const fragmento = `${listas} de ${evaluables.length} áreas`;

  return {
    tone: listas === evaluables.length ? 'good' : listas >= evaluables.length / 2 ? 'neutral' : 'warn',
    headline:
      listas === 0
        ? `Ninguna de las ${evaluables.length} áreas tiene todavía respuestas suficientes para leerse por separado`
        : `${fragmento} ya tienen respuestas suficientes para leerse por separado`,
    emphasis: listas === 0 ? undefined : fragmento,
    detail: `Un área se publica con al menos ${minCohortSize} respuestas propias.${vacias > 0 ? ` ${vacias} no ${vacias === 1 ? 'tiene' : 'tienen'} ninguna todavía.` : ''}`,
  };
}

/** Qué niveles de cargo faltan: sin ellos, los cortes por nivel quedan cojos. */
export function rolesInsight(roles: MonitoringPayload['byRole']): Insight {
  const total = roles.reduce((sum, role) => sum + role.completed, 0);
  if (total === 0) return { tone: 'neutral', headline: 'Todavía no hay encuestas completas por cargo.' };

  const ausentes = roles.filter((role) => role.completed === 0).map((role) => role.label.toLowerCase());
  if (ausentes.length > 0) {
    const lista =
      ausentes.length === 1
        ? ausentes[0]
        : `${ausentes.slice(0, -1).join(', ')} y ${ausentes[ausentes.length - 1]}`;
    return {
      tone: 'warn',
      headline: `Falta la voz de ${lista}: ninguna encuesta completa de ese nivel`,
      detail: 'Los cortes por cargo solo comparan niveles que respondieron.',
    };
  }
  const ordenados = [...roles].sort((a, b) => b.completed - a.completed);
  const empatados = ordenados.filter((role) => role.completed === ordenados[0].completed);
  // Con un empate arriba no hay «el más representado»: nombrar a uno inventaría una
  // diferencia que el dato no tiene.
  return {
    tone: 'good',
    headline:
      empatados.length === 1
        ? `Los ${roles.length} niveles de cargo ya respondieron; ${ordenados[0].label.toLowerCase()} es el más representado`
        : `Los ${roles.length} niveles de cargo ya tienen al menos una encuesta completa`,
  };
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];

/** La franja en la que más se responde: cuándo conviene mandar el recordatorio. */
export function scheduleInsight(cells: MonitoringPayload['heatmap']): Insight {
  if (cells.length === 0) return { tone: 'neutral', headline: 'Todavía no hay envíos para ubicar.' };
  const porDia = new Array(7).fill(0) as number[];
  const porHora = new Array(24).fill(0) as number[];
  for (const cell of cells) {
    porDia[cell.weekday] += cell.completed;
    porHora[cell.hour] += cell.completed;
  }
  const dia = porDia.indexOf(Math.max(...porDia));
  const hora = porHora.indexOf(Math.max(...porHora));
  return {
    tone: 'neutral',
    headline: `Se responde sobre todo los ${DIAS[dia]} y hacia las ${hora}:00`,
    detail: 'Un recordatorio rinde más si llega justo antes de la franja en la que la gente ya responde.',
  };
}

// ---------------------------------------------------------------- afirmaciones

/** Las afirmaciones 0-10 con dato, sin la pregunta de recomendación (otra escala). */
export function scaleItems(items: ItemStat[]): (ItemStat & { index: number; mean: number })[] {
  return items.filter(
    (item): item is ItemStat & { index: number; mean: number } =>
      item.indicatorCode !== 'NPS_INT' && item.index !== null && item.mean !== null,
  );
}

/** La afirmación peor calificada, con nombre propio: es lo que un plan de mejora ataca. */
export function weakestItemInsight(items: ItemStat[], bands: ThresholdBand[]): Insight {
  const conDato = scaleItems(items);
  if (conDato.length === 0) {
    return { tone: 'neutral', headline: 'Todavía no hay afirmaciones con dato.' };
  }
  const ordenadas = [...conDato].sort((a, b) => a.index - b.index);
  const peor = ordenadas[0];
  const mejor = ordenadas[ordenadas.length - 1];
  const banda = bands.find((band) => peor.index >= band.minValue && peor.index <= band.maxValue) ?? null;
  const cita = `«${peor.label}»`;

  return {
    tone: toneOfBand(banda, bands),
    headline: `${cita} es la afirmación peor calificada: ${nf(peor.mean, 1)} de 10`,
    emphasis: cita,
    detail: `Es del componente ${peor.componentId} (${peor.componentTitle}). La mejor calificada es «${mejor.label}», con ${nf(mejor.mean, 1)}.`,
  };
}

/**
 * La afirmación que más divide. Una dispersión alta no es una nota media: es que una
 * parte de la empresa vive la afirmación como cierta y otra como falsa, y eso suele
 * señalar experiencias distintas según el área o el nivel.
 */
export function consensusInsight(items: ItemStat[]): Insight {
  const conDato = scaleItems(items).filter((item) => item.consensus !== null);
  if (conDato.length < 2) {
    return { tone: 'neutral', headline: 'Faltan afirmaciones con dato para medir el consenso.' };
  }
  const ordenadas = [...conDato].sort((a, b) => (a.consensus ?? 0) - (b.consensus ?? 0));
  const dividida = ordenadas[0];
  const promedio = conDato.reduce((sum, item) => sum + (item.consensus ?? 0), 0) / conDato.length;

  return {
    tone: (dividida.consensus ?? 100) < 40 ? 'warn' : 'neutral',
    headline: `«${dividida.label}» es la afirmación que más divide: consenso de ${nf(dividida.consensus ?? 0, 0)} sobre 100`,
    detail: `El consenso medio de las ${conDato.length} afirmaciones es ${nf(promedio, 0)}. Lo bajo y compartido es un problema de sistema; lo bajo y dividido suele ser un problema de algunas áreas.`,
  };
}

/** Cuántas afirmaciones caen en las bandas bajas: el tamaño del frente de mejora. */
export function lowItemsCount(items: ItemStat[], bands: ThresholdBand[]): number {
  return scaleItems(items).filter((item) => {
    const tone = toneOfBand(
      bands.find((band) => item.index >= band.minValue && item.index <= band.maxValue) ?? null,
      bands,
    );
    return tone === 'warn' || tone === 'bad';
  }).length;
}

// ---------------------------------------------------------------- niveles de cargo

const INDEX_NAMES: Record<string, string> = {
  IREL: 'el relacionamiento',
  ICOM: 'la comunicación',
  ISI: 'el servicio interno',
  IAG: 'la agilidad',
  IINT: 'la integración',
  ICOL: 'la colaboración',
  IINN: 'la innovación',
  NIO: 'la interacción',
};

/**
 * La brecha jerárquica: cuánto mejor (o peor) ve la organización la dirección que los
 * equipos. Es la diferencia que más pesa en un plan: si la dirección no ve el problema que
 * ven los equipos, no lo va a priorizar.
 */
export function hierarchyInsight(payload: IndicesByRolePayload): Insight {
  const direccion = payload.groups.find((group) => group.key === 'DIRECCION');
  const equipos = payload.groups.find((group) => group.key === 'EQUIPOS');
  if (!direccion || !equipos) {
    return {
      tone: 'neutral',
      headline: 'Hace falta que la dirección y los equipos alcancen la cohorte mínima para compararlos.',
      detail: `${payload.groups.length} de 3 grupos de cargo tienen hoy respuestas suficientes.`,
    };
  }

  const brechas = Object.keys(INDEX_NAMES)
    .map((code) => ({
      code,
      gap:
        direccion.indicators[code] !== null && direccion.indicators[code] !== undefined &&
        equipos.indicators[code] !== null && equipos.indicators[code] !== undefined
          ? (direccion.indicators[code] as number) - (equipos.indicators[code] as number)
          : null,
    }))
    .filter((entry): entry is { code: string; gap: number } => entry.gap !== null)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  if (brechas.length === 0) {
    return { tone: 'neutral', headline: 'Sin índices comparables entre la dirección y los equipos.' };
  }

  const mayor = brechas[0];
  const magnitud = Math.abs(mayor.gap);
  const imcGap =
    direccion.imc !== null && equipos.imc !== null ? direccion.imc - equipos.imc : null;

  if (magnitud < 5) {
    return {
      tone: 'good',
      headline: 'La dirección y los equipos ven la organización casi igual',
      detail: `La mayor diferencia está en ${INDEX_NAMES[mayor.code]}: ${nf(magnitud, 1)} puntos.`,
    };
  }

  return {
    tone: magnitud >= 15 ? 'warn' : 'neutral',
    headline:
      mayor.gap > 0
        ? `La dirección ve ${INDEX_NAMES[mayor.code]} ${nf(magnitud, 1)} puntos mejor que los equipos`
        : `Los equipos ven ${INDEX_NAMES[mayor.code]} ${nf(magnitud, 1)} puntos mejor que la dirección`,
    emphasis: `${nf(magnitud, 1)} puntos`,
    detail:
      imcGap !== null
        ? `En el índice compuesto la diferencia es de ${nf(Math.abs(imcGap), 1)} puntos a favor de ${imcGap >= 0 ? 'la dirección' : 'los equipos'}. Una brecha así suele significar que el problema no se ve desde donde se decide.`
        : undefined,
  };
}

/** El nivel que ve peor la organización, contra el que la ve mejor. */
export function rolesSpreadInsight(payload: IndicesByRolePayload): Insight {
  const conImc = payload.roles.filter((row): row is typeof row & { imc: number } => row.imc !== null);
  if (conImc.length < 2) {
    return {
      tone: 'neutral',
      headline: 'Se necesitan al menos dos niveles de cargo con la cohorte mínima para compararlos.',
      detail: payload.suppressedRoles > 0 ? `${payload.suppressedRoles} niveles ocultos por tener pocas respuestas.` : undefined,
    };
  }
  const ordenados = [...conImc].sort((a, b) => a.imc - b.imc);
  const critico = ordenados[0];
  const conforme = ordenados[ordenados.length - 1];
  const distancia = conforme.imc - critico.imc;
  return {
    tone: distancia >= 15 ? 'warn' : 'neutral',
    headline:
      distancia >= 8
        ? `El nivel ${critico.label.toLowerCase()} es el más crítico (${nf(critico.imc, 1)}) y ${conforme.label.toLowerCase()} el más conforme (${nf(conforme.imc, 1)})`
        : `Los niveles de cargo coinciden en cómo ven la organización: ${nf(distancia, 1)} puntos entre el más crítico y el más conforme`,
  };
}

// ---------------------------------------------------------------- red de interacción

/** El área de la que más depende el resto: la que más personas nombran como interlocutora. */
export function demandInsight(payload: NetworkPayload): Insight {
  const conMenciones = payload.demand.filter((row) => row.mentions > 0);
  if (conMenciones.length === 0) {
    return { tone: 'neutral', headline: 'Todavía nadie ha declarado con qué áreas interactúa.' };
  }
  const top = conMenciones[0];
  const sinMenciones = payload.demand.length - conMenciones.length;
  return {
    tone: 'neutral',
    headline: `${top.areaName} es el área más demandada: la nombra el ${nf(top.mentionShare, 0)}\u202f% de quienes respondieron`,
    emphasis: top.areaName,
    detail: `${top.principal} ${top.principal === 1 ? 'persona la tiene' : 'personas la tienen'} como su relación principal.${sinMenciones > 0 ? ` ${sinMenciones} ${sinMenciones === 1 ? 'área no aparece' : 'áreas no aparecen'} como interlocutora frecuente de nadie.` : ''}`,
  };
}

/**
 * Las áreas críticas para la colaboración: muy demandadas y mal valoradas. Son la palanca
 * más rentable del diagnóstico, porque mejorar la relación con ellas mejora el día a día
 * de muchas personas a la vez.
 */
export function importanceInsight(payload: NetworkPayload): Insight {
  const filas = payload.importance;
  if (filas.length < 2) {
    return {
      tone: 'neutral',
      headline: 'Faltan áreas con relacionamiento publicable para cruzar demanda y desempeño.',
      detail: 'El cruce aparece cuando las áreas más nombradas alcanzan la cohorte mínima de evaluaciones.',
    };
  }
  const mediana = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const mMenciones = mediana(filas.map((row) => row.mentions));
  const mIrel = mediana(filas.map((row) => row.irel));
  const criticas = filas
    .filter((row) => row.mentions >= mMenciones && row.irel < mIrel)
    .sort((a, b) => b.mentions - a.mentions);

  if (criticas.length === 0) {
    return {
      tone: 'good',
      headline: 'Las áreas más demandadas son también de las mejor valoradas',
      detail: 'Ninguna área cae en el cuadrante crítico: alta demanda y relacionamiento por debajo de la mediana.',
    };
  }
  const nombres = criticas.slice(0, 2).map((row) => row.areaName);
  const lista = nombres.length === 1 ? nombres[0] : `${nombres[0]} y ${nombres[1]}`;
  return {
    tone: 'warn',
    headline: `${lista} ${nombres.length === 1 ? 'es crítica' : 'son críticas'} para la colaboración: muy demandadas y por debajo en relacionamiento`,
    emphasis: lista,
    detail: 'Mejorar la relación con un área muy demandada mejora el día a día de muchas personas a la vez: es la palanca más rentable del mapa.',
  };
}

export function frequencyInsight(rows: DistributionRow[]): Insight {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) return { tone: 'neutral', headline: 'Sin datos de frecuencia de interacción.' };
  const shareOf = (values: string[]) =>
    rows.filter((row) => values.includes(row.value)).reduce((sum, row) => sum + row.share, 0);
  const intensa = shareOf(['DIARIA', 'VARIAS_SEMANA']);
  const esporadica = shareOf(['MENSUAL', 'ESPORADICA']);
  return {
    tone: 'neutral',
    headline: `El ${nf(intensa, 0)}\u202f% interactúa con otras áreas a diario o varias veces por semana`,
    detail:
      intensa >= 60
        ? 'Con una interacción tan frecuente, cada fricción entre áreas se repite muchas veces por semana.'
        : esporadica >= 40
          ? `El ${nf(esporadica, 0)}\u202f% lo hace solo una vez al mes o menos: ahí los acuerdos de servicio pesan más que la relación del día a día.`
          : `Otro ${nf(100 - intensa - esporadica, 0)}\u202f% interactúa semanalmente y el ${nf(esporadica, 0)}\u202f%, una vez al mes o menos.`,
  };
}

export function interactionTypesInsight(rows: CountedOption[]): Insight {
  const conDato = rows.filter((row) => row.count > 0);
  if (conDato.length === 0) return { tone: 'neutral', headline: 'Sin datos del tipo de interacción.' };
  const top = conDato[0];
  const estrategica = rows.find((row) => row.value === 'ESTRATEGICA');
  return {
    tone: 'neutral',
    headline: `La interacción es sobre todo ${top.label.toLowerCase()}: la marca el ${nf(top.share, 0)}\u202f%`,
    detail: estrategica
      ? `La estratégica la marca el ${nf(estrategica.share, 0)}\u202f%. Selección múltiple: los porcentajes suman más de 100.`
      : undefined,
  };
}

/** Lo que las demás áreas ven en cada una: valor aportado contra necesidad de fortalecer. */
export function valueInsight(rows: NetworkPayload['valueVsStrengthen']): Insight {
  if (rows.length === 0) return { tone: 'neutral', headline: 'Nadie ha señalado áreas de valor ni a fortalecer.' };
  const porValor = [...rows].sort((a, b) => b.value - a.value)[0];
  const porFortalecer = [...rows].sort((a, b) => b.strengthen - a.strengthen)[0];
  const ambas = rows.find((row) => row.value >= 2 && row.strengthen >= 2);
  return {
    tone: ambas ? 'warn' : 'neutral',
    headline: ambas
      ? `${ambas.areaName} divide: unos la ven como la que más valor aporta y otros piden fortalecerla`
      : `${porValor.areaName} es la que más valor aporta según las demás; ${porFortalecer.areaName}, la que más piden fortalecer`,
    detail: `${porValor.areaName}: ${porValor.value} ${porValor.value === 1 ? 'mención' : 'menciones'} de valor · ${porFortalecer.areaName}: ${porFortalecer.strengthen} de fortalecer.`,
  };
}

export function isolationInsight(innovation: NetworkPayload['innovation'], totalAreas: number): Insight {
  if (innovation.respondents === 0) {
    return { tone: 'neutral', headline: 'Sin datos de iniciativas conjuntas.' };
  }
  return {
    tone: innovation.noneShare >= 40 || innovation.isolated.length > totalAreas / 2 ? 'warn' : 'neutral',
    headline: `${innovation.isolated.length} de ${totalAreas} áreas no aparecen en ninguna iniciativa conjunta`,
    detail: `El ${nf(innovation.noneShare, 0)}\u202f% de quienes respondieron no ha desarrollado nada nuevo con otra área en seis meses.`,
  };
}

// ---------------------------------------------------------------- calidad del corte

/**
 * Qué tanto se puede confiar en el corte. Una respuesta en línea recta (la misma nota en
 * todo) o hecha a la carrera no miente sobre la persona, pero tampoco informa: diluye las
 * diferencias que el instrumento busca.
 */
export function qualityInsight(quality: QualityPayload): Insight {
  if (quality.completed === 0) return { tone: 'neutral', headline: 'Todavía no hay encuestas completas que revisar.' };
  const rapidas = quality.speeders.share ?? 0;
  const rectas = quality.straightLining.share ?? 0;
  const dudosas = Math.max(rapidas, rectas);
  return {
    tone: dudosas >= 30 ? 'bad' : dudosas >= 15 ? 'warn' : 'good',
    headline:
      dudosas >= 15
        ? `El ${nf(dudosas, 0)}\u202f% de las respuestas ${rapidas >= rectas ? 'se hizo en menos de 5 minutos' : 'da la misma nota a todo'}: el corte hay que leerlo con cautela`
        : 'El corte es confiable: pocas respuestas a la carrera o con la misma nota en todo',
    detail: `${quality.speeders.count} en menos de 5 min · ${quality.straightLining.count} en línea recta · ${quality.openAnswers.count} con respuesta abierta.`,
  };
}

// ============ INFLUENCIAS (KPI 32) ============

/** Cómo se nombra el nodo de la red: un área o una gestión. Las dos son femeninas. */
export interface InfluenceUnit {
  one: string;
  many: string;
}

export const ZONE_LABELS: Record<InfluenceZone, string> = {
  MOTRIZ: 'Motriz',
  ENLACE: 'De enlace',
  DEPENDIENTE: 'Dependiente',
  AUTONOMA: 'Autónoma',
};

const count = (value: number, unit: InfluenceUnit) => `${value} ${value === 1 ? unit.one : unit.many}`;

/**
 * Una nota en la mitad baja del semáforo (con cuatro bandas: «En riesgo» o «Crítico»). Por
 * posición, no por nombre: las etiquetas son editables.
 */
export function isLowScore(value: number | null, bands: ThresholdBand[]): boolean {
  const band = classify(value, bands);
  if (!band) return false;
  return bands.indexOf(band) >= Math.ceil(bands.length / 2);
}

/** La que más mueve: la primera motriz; si no hay, la de enlace que más mueve. */
function topMover(level: InfluenceLevel): InfluenceNode | null {
  const motrices = level.nodes.filter((node) => node.zone === 'MOTRIZ');
  const pool = motrices.length > 0 ? motrices : level.nodes.filter((node) => node.zone === 'ENLACE');
  return [...pool].sort((a, b) => b.motricidad - a.motricidad)[0] ?? null;
}

/** La que más resiente: la dependiente que más depende, entre las que tienen la dependencia medida. */
function topMoved(level: InfluenceLevel): InfluenceNode | null {
  const medidas = level.nodes.filter((node) => node.grantedBy > 0);
  const dependientes = medidas.filter((node) => node.zone === 'DEPENDIENTE');
  const pool = dependientes.length > 0 ? dependientes : medidas.filter((node) => node.zone === 'ENLACE');
  return [...pool].sort((a, b) => b.dependencia - a.dependencia)[0] ?? null;
}

/** El titular de la sección: quién mueve el sistema y quién lo resiente. */
export function influenceInsight(level: InfluenceLevel, unit: InfluenceUnit, bands: ThresholdBand[]): Insight {
  const mover = topMover(level);
  const moved = topMoved(level);
  if (!mover) {
    return {
      tone: 'neutral',
      headline: `Todavía no hay relaciones entre ${unit.many} para leer quién mueve a quién`,
    };
  }
  const tone: Tone = isLowScore(mover.irelReceived, bands) ? 'warn' : 'neutral';
  if (!moved || moved.code === mover.code) {
    return {
      tone,
      headline: `${mover.name} mueve el sistema: ${count(mover.clients, unit)} dependen de ella`,
      emphasis: 'mueve el sistema',
    };
  }
  return {
    tone,
    headline: `${mover.name} mueve el sistema y ${moved.name} lo resiente`,
    emphasis: 'mueve el sistema',
    detail: `${mover.name} sostiene a ${count(mover.clients, unit)}${mover.irelReceived !== null ? ` y recibe un relacionamiento de ${formatIndex(mover.irelReceived, 1)}` : ''}; ${moved.name} depende de ${count(moved.providers, unit)}. Mejorar a las motrices se siente en cadena; atender solo a las dependientes alivia sin resolver la causa.`,
  };
}

/** La tarjeta de la red: lo más urgente que dicen las flechas visibles. */
export function influenceNetworkInsight(level: InfluenceLevel, unit: InfluenceUnit, bands: ThresholdBand[]): Insight {
  if (level.edges.length === 0) {
    return {
      tone: 'neutral',
      headline: `Ninguna relación entre ${unit.many} alcanza todavía la cohorte`,
      detail:
        level.suppressedEdges > 0
          ? `${level.suppressedEdges} relaciones existen, pero cada una la sostienen menos personas que la cohorte mínima. Se ven las ${unit.many} en su zona, sin las flechas.`
          : undefined,
    };
  }
  const names = new Map(level.nodes.map((node) => [node.code, node.name]));
  const bajas = level.edges.filter((edge) => isLowScore(edge.irel, bands));
  if (bajas.length > 0) {
    const peor = [...bajas].sort((a, b) => b.weight - a.weight)[0];
    return {
      tone: 'warn',
      headline:
        bajas.length === level.edges.length
          ? `Todas las relaciones visibles están por debajo de lo aceptable`
          : `${bajas.length} de las ${level.edges.length} relaciones visibles están por debajo de lo aceptable`,
      emphasis: 'por debajo de lo aceptable',
      detail: `La más intensa de ellas: ${names.get(peor.to)} depende de ${names.get(peor.from)} y le da ${formatIndex(peor.irel, 1)} de relacionamiento.`,
    };
  }
  const fuerte = level.edges[0];
  return {
    tone: 'good',
    headline: `La relación más intensa: ${names.get(fuerte.to)} depende de ${names.get(fuerte.from)}`,
    emphasis: 'más intensa',
    detail: 'Ninguna relación visible está por debajo de lo aceptable.',
  };
}

/** La tarjeta de la matriz: de quién dependen más. */
export function influenceMatrixInsight(level: InfluenceLevel, unit: InfluenceUnit): Insight {
  const top = [...level.nodes].sort((a, b) => b.clients - a.clients || b.motricidad - a.motricidad)[0];
  if (!top || top.clients === 0) {
    return { tone: 'neutral', headline: `Todavía no hay relaciones entre ${unit.many}` };
  }
  return {
    tone: 'neutral',
    headline: `${top.name} es de la que más dependen: la buscan ${count(top.clients, unit)}`,
    emphasis: top.name,
    detail:
      level.suppressedEdges > 0
        ? `Los márgenes suman todas las relaciones; ${level.suppressedEdges} de ellas no se dibujan en la matriz porque no alcanzan la cohorte.`
        : undefined,
  };
}

/** La tarjeta del plano: cuántas mueven y cuántas resienten. */
export function influencePlaneInsight(level: InfluenceLevel, unit: InfluenceUnit): Insight {
  const by = (zone: InfluenceZone) => level.nodes.filter((node) => node.zone === zone).length;
  const motrices = by('MOTRIZ');
  const enlace = by('ENLACE');
  const dependientes = by('DEPENDIENTE');
  const autonomas = by('AUTONOMA');
  const sinMedir = level.nodes.filter((node) => node.grantedBy === 0).length;
  if (level.nodes.length < 2) {
    return { tone: 'neutral', headline: `Hacen falta al menos dos ${unit.many} relacionadas para dibujar el plano` };
  }
  return {
    tone: 'neutral',
    headline: `${count(motrices, unit)} ${motrices === 1 ? 'mueve' : 'mueven'} el sistema y ${count(dependientes, unit)} ${dependientes === 1 ? 'depende' : 'dependen'} de él`,
    detail: `${enlace} de enlace —un cambio en ellas se propaga— y ${autonomas} ${autonomas === 1 ? 'autónoma' : 'autónomas'}.${sinMedir > 0 ? ` ${sinMedir} sin la dependencia medida, porque nadie de ellas evaluó a otras.` : ''}`,
  };
}

/**
 * Las palancas: mueven a muchas (motrices o de enlace) y, primero, las peor calificadas.
 * Mejorar el servicio de una de ellas se siente en cadena.
 */
export function influenceLevers(level: InfluenceLevel, limit = 4): InfluenceNode[] {
  return level.nodes
    .filter((node) => node.zone === 'MOTRIZ' || node.zone === 'ENLACE')
    .sort(
      (a, b) =>
        (a.irelReceived ?? Number.POSITIVE_INFINITY) - (b.irelReceived ?? Number.POSITIVE_INFINITY) ||
        b.motricidad - a.motricidad,
    )
    .slice(0, limit);
}

/**
 * Los síntomas: dependen de muchas y mueven poco. Lo que les falla viene, en buena parte, de
 * otras; atacarlas de frente alivia sin resolver la causa. Solo las que tienen la dependencia
 * medida: sin respuestas propias no se sabe de quién dependen.
 */
export function influenceSymptoms(level: InfluenceLevel, limit = 4): InfluenceNode[] {
  return level.nodes
    .filter((node) => node.zone === 'DEPENDIENTE' && node.grantedBy > 0)
    .sort((a, b) => b.dependencia - a.dependencia)
    .slice(0, limit);
}
