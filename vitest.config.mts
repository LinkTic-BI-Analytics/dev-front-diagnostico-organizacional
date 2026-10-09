import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Tests de la lógica de servidor: fórmulas, reglas del instrumento, cohorte, catálogo y
 * sesión. Ninguno necesita base de datos ni navegador.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/server/**/*.spec.ts', 'prisma/**/*.spec.ts'],
  },
});
