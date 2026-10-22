-- La nómina de colaboradores y la marca de quién ya respondió.
--
-- La identificación pide ahora el número de documento: la API lo busca en `colaboradores`
-- y rechaza a quien no esté o ya tenga `ya_respondio`. La encuesta se responde una sola vez.
--
-- La encuesta sigue siendo anónima. El documento queda en `survey_responses` solo mientras
-- es borrador; al enviarla se marca `ya_respondio` —sin hora ni vínculo con la respuesta—
-- y se borra de la respuesta.

-- AlterTable
ALTER TABLE "survey_responses" ADD COLUMN     "numero_documento" TEXT;

-- CreateTable
CREATE TABLE "colaboradores" (
    "numero_documento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "proceso" TEXT,
    "subproceso" TEXT,
    "ya_respondio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("numero_documento")
);

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_numero_documento_fkey" FOREIGN KEY ("numero_documento") REFERENCES "colaboradores"("numero_documento") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS sin políticas, como el resto de tablas (0004_rls_sin_acceso_publico): la nómina tiene
-- nombres y documentos, y la API REST de Supabase no debe verla.
ALTER TABLE "colaboradores" ENABLE ROW LEVEL SECURITY;
