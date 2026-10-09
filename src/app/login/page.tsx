'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LinkticIsotipo, LinkticLogo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/icons';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/admin-client';

/**
 * `useSearchParams` obliga a un límite de Suspense para que Next pueda prerenderizar la
 * página: el parámetro `next` solo se conoce en el navegador.
 */
export default function LoginPage() {
  return (
    <main className="lk-portada lk-sobre-oscuro relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden className="lk-reticula" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="lk-anim flex items-center justify-center gap-3">
          <LinkticIsotipo height={30} surface="dark" priority />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Diagnóstico organizacional
          </p>
        </div>

        <div className="lk-anim lk-delay-1 mt-5 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40">
          <div aria-hidden className="lk-accent-bar h-1.5" />
          <div className="px-6 pt-8 pb-8 sm:px-8">
            <LinkticLogo width={150} priority className="mx-auto" />
            <Suspense fallback={<p role="status" className="mt-6 text-center text-sm text-foreground-muted">Cargando…</p>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="lk-anim lk-delay-2 mt-6 text-center text-sm text-slate-300">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded px-2 underline decoration-slate-400 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
          >
            ¿Viene a responder? Ir a la encuesta
          </Link>
        </p>
        <p className="lk-anim lk-delay-3 mt-6 text-center text-xs text-slate-400">
          Diagnóstico Organizacional LinkTIC · Documento confidencial
        </p>
      </div>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setRetryAfter(null);

    try {
      await login(token);
      // La cookie de sesión la puso el servidor; el token no se guarda en ninguna parte.
      const next = searchParams.get('next');
      router.push(next?.startsWith('/admin') ? next : '/admin');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        // El backend devuelve cuántos segundos hay que esperar tras agotar los intentos.
        const body = caught.body as { retryAfterSeconds?: number } | undefined;
        if (caught.status === 429 && body?.retryAfterSeconds) {
          setRetryAfter(body.retryAfterSeconds);
        }
      } else {
        setError('No pudimos conectar con el servidor. Verifique su conexión.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-6 text-center text-2xl text-foreground">Panel de diagnóstico</h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-foreground-muted">
        Este espacio es confidencial. Ingrese la clave que le compartieron para ver los
        resultados del diagnóstico.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Clave de acceso</span>
          <span className="relative">
            <input
              type={visible ? 'text' : 'password'}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              autoComplete="current-password"
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
              className="min-h-12 w-full rounded-xl border border-border-strong bg-white pr-12 pl-4 text-[15px] text-foreground transition-shadow focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lk-blue/15"
            />
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? 'Ocultar la clave' : 'Mostrar la clave'}
              aria-pressed={visible}
              className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-subtle hover:text-foreground"
            >
              <Icon name={visible ? 'eyeOff' : 'eye'} size={17} />
            </button>
          </span>
        </label>

        {error && (
          <div id="login-error" role="alert" className="flex items-start gap-2.5 rounded-xl bg-danger-subtle px-4 py-3">
            <Icon name="alertCircle" size={17} className="mt-0.5 shrink-0 text-danger" />
            <div className="flex flex-col gap-1">
              <p className="text-sm text-danger">{error}</p>
              {retryAfter !== null && (
                <p className="text-xs text-danger">
                  Podrá intentar de nuevo en {Math.ceil(retryAfter / 60)} minutos.
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || token.length === 0}
          className="lk-button min-h-12 rounded-xl px-4 text-[15px] font-semibold"
        >
          {busy ? 'Verificando…' : 'Ingresar'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-foreground-subtle">
        Contiene percepciones del personal sobre las áreas de la organización. No comparta la
        clave ni capturas de los resultados fuera del comité que lidera el diagnóstico.
      </p>
    </>
  );
}
