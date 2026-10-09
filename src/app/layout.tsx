import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

/**
 * Geist es la tipografía de interfaz de la línea gráfica aprobada: la misma que usan las
 * demás herramientas de análisis de la organización. Variable, así que un solo archivo
 * cubre todos los pesos. La mono queda para fórmulas y códigos de indicador.
 */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Diagnóstico Organizacional · LinkTIC',
  description:
    'Instrumento interno de percepción organizacional. La información recopilada será ' +
    'utilizada exclusivamente con fines de mejora organizacional y fortalecimiento institucional.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-CO" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
