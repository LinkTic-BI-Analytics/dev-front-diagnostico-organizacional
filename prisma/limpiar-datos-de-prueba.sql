-- Borra TODAS las respuestas de prueba del diagnóstico.
--
-- Las 68 respuestas que hay en la base al 5-oct-2026 (53 completas y 15 incompletas) son
-- simuladas: las sembró `npm run prisma:simulacion` para verificar el panel con
-- la distribución de 16 gestiones y 53 subprocesos. Ninguna viene de una persona real, así
-- que se borran todas — no hay nada que conservar.
--
-- Ejecutar ANTES de abrir la recolección real. Después de abrirla, este archivo borraría
-- datos reales: no se ejecuta sin revisar primero qué hay.
--
-- Comprobar antes qué se va a borrar:
--   SELECT status, count(*) FROM mod_encuestas.survey_responses GROUP BY status;

BEGIN;

-- Las tablas viven en `mod_encuestas` (src/server/env.ts — DATABASE_SCHEMA), no en `public`,
-- que es donde busca el editor SQL de Supabase.
SET LOCAL search_path TO mod_encuestas;

-- Las respuestas cuelgan de la encuesta; se borran primero por si la FK no cascadea.
DELETE FROM answers
WHERE response_id IN (SELECT id FROM survey_responses);

DELETE FROM survey_responses;

-- Quien envió una encuesta de prueba quedó marcado como que ya respondió: sin quitar la
-- marca, no podría responder la de verdad. La nómina en sí no se toca.
UPDATE colaboradores SET ya_respondio = false WHERE ya_respondio;

-- Comprobar el resultado ANTES de confirmar. Deben salir tres ceros.
SELECT
  (SELECT count(*) FROM survey_responses)                 AS respuestas_restantes,
  (SELECT count(*) FROM answers)                          AS respuestas_a_preguntas,
  (SELECT count(*) FROM colaboradores WHERE ya_respondio) AS colaboradores_marcados;

COMMIT;
