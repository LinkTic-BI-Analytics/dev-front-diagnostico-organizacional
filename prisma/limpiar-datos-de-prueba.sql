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
--   SELECT status, count(*) FROM survey_responses GROUP BY status;

BEGIN;

-- Las respuestas cuelgan de la encuesta; se borran primero por si la FK no cascadea.
DELETE FROM answers
WHERE response_id IN (SELECT id FROM survey_responses);

DELETE FROM survey_responses;

-- Comprobar el resultado ANTES de confirmar. Deben salir dos ceros.
SELECT
  (SELECT count(*) FROM survey_responses) AS respuestas_restantes,
  (SELECT count(*) FROM answers)          AS respuestas_a_preguntas;

COMMIT;
