import { LinkticIsotipo } from '@/components/brand/Logo';
import { SurveyWizard } from '@/components/survey/SurveyWizard';

/** El home ES la encuesta: nadie debe tener que buscar un enlace para responderla. */
export default function HomePage() {
  return (
    /*
     * La superficie pública de la línea gráfica: plano claro con dos halos de la marca y el
     * contenido en una tarjeta blanca. La columna se ensancha en pantalla grande porque la
     * encuesta se responde sobre todo desde un PC: lo que en 672 px son cuatro scrolls de
     * opciones de dos palabras, aquí cabe en uno. El ancho extra es para las LISTAS, no para
     * el texto: los párrafos siguen acotados a su medida de lectura.
     */
    <div className="lk-halos relative isolate flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-6 sm:px-6">
        <LinkticIsotipo height={26} priority />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
          Diagnóstico organizacional
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-5 pb-10 sm:px-6">
        <SurveyWizard />
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-center text-xs leading-relaxed text-foreground-muted sm:px-6">
        <p>
          La información recopilada será utilizada exclusivamente con fines de mejora
          organizacional y fortalecimiento institucional.
        </p>
        <p className="mt-1 text-foreground-subtle">evolucionamos contigo</p>
      </footer>
    </div>
  );
}
