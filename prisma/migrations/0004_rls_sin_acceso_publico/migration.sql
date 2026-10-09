-- RLS en todas las tablas, sin políticas (Contexto.md §5.3).
--
-- Supabase publica el esquema `public` en su API REST para los roles `anon` y
-- `authenticated`, y les concede todos los privilegios sobre las tablas que se crean ahí.
-- Hasta esta migración ninguna tabla tenía RLS: con la clave pública del proyecto se podían
-- leer las respuestas crudas —saltándose la cohorte mínima— y escribir en cualquier tabla.
--
-- Con RLS activo y sin políticas, esos roles no ven ni escriben ninguna fila. La app no se
-- entera: conecta como `postgres`, que tiene BYPASSRLS, y no usa la API REST de Supabase.
--
-- Toda tabla nueva tiene que activarlo en su propia migración: `prisma/migrations.spec.ts`
-- falla si una tabla creada en `migrations/` no lo hace.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "indicator_thresholds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "indicator_weights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "procesos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "survey_responses" ENABLE ROW LEVEL SECURITY;

-- Además se retiran los privilegios de esos roles, también los que recibirían las tablas
-- futuras: dos barreras en vez de una. Los roles solo existen en Supabase; en otro
-- Postgres (una base local de pruebas) el bloque no hace nada.
DO $$
DECLARE
  rol text;
BEGIN
  FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', rol);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', rol);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', rol);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', rol);
    END IF;
  END LOOP;
END $$;
