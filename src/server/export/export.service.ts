import { once } from 'node:events';
import { PassThrough, Readable } from 'node:stream';
import { stringify } from 'csv-stringify';
import ExcelJS from 'exceljs';
import { db } from '../db';
import { GLOBAL_AREA_CODE, RESPONDENT_ROLE_LABELS } from '../common/constants';
import { safeCell } from './csv-cell.util';

export const EXPORT_COLUMNS = [
  'responseId',
  'campana',
  'enviadoEn',
  'duracionSegundos',
  'areaPropia',
  'areaPropiaOtra',
  'cargo',
  'componenteId',
  'preguntaCodigo',
  'preguntaTexto',
  'areaEvaluada',
  'valorNumerico',
  'valorOpcion',
  'valorOpciones',
  'valorTexto',
  'tema',
] as const;

export type ExportFormat = 'csv' | 'xlsx';

type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], string | number | null>;

/** Tamaño de lote: acota la memoria sin multiplicar los viajes a la base. */
const BATCH_SIZE = 500;

/**
 * Exporta las respuestas completadas como descarga.
 *
 * El dataset no se materializa en memoria: se pagina por cursor y cada lote sale por el
 * stream de la respuesta conforme llega. El primer lote se lee ANTES de responder, para que
 * una base caída termine en un 500 con su JSON y no en un archivo a medio escribir.
 */
export async function exportAnswers(
  format: ExportFormat,
  campaignId?: string,
): Promise<Response> {
  const rows = await startRows(campaignId);
  const filename = `diagnostico-linktic-${stamp()}.${format}`;

  const body = format === 'xlsx' ? xlsxStream(rows) : csvStream(rows);
  return new Response(Readable.toWeb(body) as ReadableStream<Uint8Array>, {
    headers: {
      'Content-Type':
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function csvStream(rows: AsyncIterable<ExportRow>): Readable {
  const csv = stringify({
    header: true,
    columns: [...EXPORT_COLUMNS],
    bom: true,
  });

  void (async () => {
    try {
      for await (const row of rows) {
        // Respeta la contrapresión: si el navegador descarga lento, se espera en vez de
        // acumular el archivo entero en memoria.
        if (!csv.write(row)) await once(csv, 'drain');
      }
      csv.end();
    } catch (error) {
      csv.destroy(error as Error);
    }
  })();

  return csv;
}

/** Igual que el CSV pero en XLSX, con el writer por streaming de exceljs. */
function xlsxStream(rows: AsyncIterable<ExportRow>): Readable {
  const output = new PassThrough();

  void (async () => {
    try {
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: output,
      });
      const sheet = workbook.addWorksheet('Respuestas');
      sheet.columns = EXPORT_COLUMNS.map((key) => ({
        header: key,
        key,
        width: 22,
      }));
      sheet.getRow(1).font = { bold: true };

      for await (const row of rows) {
        sheet.addRow(row).commit();
      }

      sheet.commit();
      await workbook.commit();
    } catch (error) {
      output.destroy(error as Error);
    }
  })();

  return output;
}

/** Lee el primer lote ya, y devuelve todas las filas —ese lote incluido— como iterable. */
async function startRows(campaignId?: string): Promise<AsyncIterable<ExportRow>> {
  const iterator = iterateRows(campaignId);
  const first = await iterator.next();

  return (async function* () {
    if (first.done) return;
    yield first.value;
    yield* iterator;
  })();
}

/**
 * Recorre las respuestas por cursor sobre el id de `answers`.
 *
 * Se pagina por cursor y no por offset porque un `skip` grande obliga a Postgres a recorrer
 * y descartar las filas anteriores en cada lote.
 */
async function* iterateRows(
  campaignId?: string,
): AsyncGenerator<ExportRow, void, undefined> {
  let cursor: bigint | undefined;

  for (;;) {
    const batch = await db().answer.findMany({
      where: {
        response: {
          status: 'COMPLETED',
          ...(campaignId ? { campaignId } : {}),
        },
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        questionCode: true,
        targetArea: true,
        valueNumber: true,
        valueOption: true,
        valueOptions: true,
        valueText: true,
        theme: true,
        question: { select: { componentId: true, label: true } },
        response: {
          select: {
            id: true,
            submittedAt: true,
            durationSeconds: true,
            ownArea: true,
            ownAreaOther: true,
            respondentRole: true,
            campaign: { select: { name: true } },
          },
        },
      },
    });

    if (batch.length === 0) return;

    for (const answer of batch) {
      yield {
        responseId: answer.response.id,
        campana: safeCell(answer.response.campaign.name),
        enviadoEn: answer.response.submittedAt?.toISOString() ?? null,
        duracionSegundos: answer.response.durationSeconds,
        areaPropia: answer.response.ownArea,
        areaPropiaOtra: safeCell(answer.response.ownAreaOther),
        cargo: safeCell(
          answer.response.respondentRole
            ? (RESPONDENT_ROLE_LABELS[answer.response.respondentRole] ??
                answer.response.respondentRole)
            : null,
        ),
        componenteId: answer.question.componentId,
        preguntaCodigo: answer.questionCode,
        preguntaTexto: safeCell(answer.question.label),
        // El centinela es un detalle de almacenamiento: en el reporte se deja vacío.
        areaEvaluada:
          answer.targetArea === GLOBAL_AREA_CODE ? '' : answer.targetArea,
        valorNumerico:
          answer.valueNumber === null ? null : Number(answer.valueNumber),
        valorOpcion: answer.valueOption,
        valorOpciones: answer.valueOptions.join('; '),
        valorTexto: safeCell(answer.valueText),
        tema: safeCell(answer.theme),
      };
    }

    cursor = batch[batch.length - 1].id;
  }
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}
