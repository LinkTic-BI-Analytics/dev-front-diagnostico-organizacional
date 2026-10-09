import Link from 'next/link';
import { LinkticLogo } from '@/components/brand/Logo';

export const metadata = { title: 'Gracias · Diagnóstico Organizacional LinkTIC' };

export default function GraciasPage() {
  return (
    <div className="lk-halos relative isolate flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <main className="lk-tarjeta lk-anim w-full max-w-lg overflow-hidden">
        <div aria-hidden className="lk-accent-bar h-1.5" />
        <div className="flex flex-col items-center gap-5 px-6 pt-9 pb-9 text-center sm:px-10">
          <LinkticLogo width={150} priority />

          {/* El visto se dibuja al llegar: confirma que el envío se completó sin pedir leer. */}
          <span className="flex size-16 items-center justify-center rounded-full bg-tone-good-subtle text-tone-good">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true">
              <path
                d="M5 12.5 10 17.5 19 7.5"
                stroke="currentColor"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lk-check"
              />
            </svg>
          </span>

          <h1 className="lk-text-gradient text-[1.75rem] leading-tight sm:text-3xl">
            Gracias por su participación
          </h1>

          {/* Texto de cierre literal del instrumento. */}
          <p className="text-sm leading-relaxed text-foreground-muted">
            Su experiencia es fundamental para comprender cómo trabajamos como organización. La
            información recopilada permitirá identificar oportunidades de mejora, fortalecer la
            colaboración entre áreas y orientar decisiones estratégicas que contribuyan a una
            LinkTIC más ágil, integrada y centrada en la generación de valor.
          </p>

          <p className="w-full rounded-xl bg-brand-subtle px-4 py-3 text-sm text-foreground">
            Sus respuestas quedaron registradas. Ya puede cerrar esta ventana.
          </p>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
      <p className="mt-6 text-xs text-foreground-subtle">evolucionamos contigo</p>
    </div>
  );
}
