import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getQuestionIndex } from './survey.service';

/**
 * Regresión de un bug encontrado solo al correr el flujo real contra la base de datos.
 *
 * `getSchema` resolvía las opciones de catálogo (áreas, procesos) pero `getQuestionIndex`
 * —que es de donde el motor de reglas saca las opciones válidas— devolvía únicamente las
 * estáticas de `question_options`. El resultado: el servidor ofrecía "Innovación" como
 * opción y luego rechazaba esa misma respuesta con "La opción no es válida".
 *
 * Los tests de las reglas no lo detectaron porque sus fixtures traen las opciones ya
 * puestas: el fallo estaba en quién alimenta al motor, no en el motor.
 */

const prisma = vi.hoisted(() => ({
  question: { findMany: vi.fn() },
  area: { findMany: vi.fn() },
  proceso: { findMany: vi.fn() },
}));

vi.mock('../db', () => ({ db: () => prisma }));

const areas = [
  { code: 'COMERCIAL', name: 'Comercial' },
  { code: 'PMO', name: 'PMO' },
];
const procesos = [{ code: 'PROYECTOS', name: 'Gestión de proyectos' }];

beforeEach(() => {
  prisma.question.findMany.mockResolvedValue([
    {
      code: 'c8_areas_iniciativas',
      optionSource: 'AREAS',
      options: [
        {
          id: BigInt(1),
          questionCode: 'c8_areas_iniciativas',
          value: 'NINGUNA',
          label: 'Ninguna',
          allowsText: true,
          exclusive: false,
          sortOrder: 1,
        },
      ],
    },
    {
      code: 'c10_proceso_reprocesos',
      optionSource: 'PROCESOS',
      options: [],
    },
    {
      code: 'c1_frecuencia',
      optionSource: 'STATIC',
      options: [
        {
          id: BigInt(2),
          questionCode: 'c1_frecuencia',
          value: 'DIARIA',
          label: 'Diaria',
          allowsText: false,
          exclusive: false,
          sortOrder: 1,
        },
      ],
    },
  ]);
  prisma.area.findMany.mockResolvedValue(areas);
  prisma.proceso.findMany.mockResolvedValue(procesos);
});

describe('getQuestionIndex', () => {
  it('resuelve las áreas como opciones válidas de una pregunta AREAS', async () => {
    const index = await getQuestionIndex();
    const values = index
      .get('c8_areas_iniciativas')!
      .options.map((o) => o.value);

    expect(values).toContain('COMERCIAL');
    expect(values).toContain('PMO');
  });

  it('conserva además las opciones estáticas, como "Otra"', async () => {
    const index = await getQuestionIndex();
    const ninguna = index
      .get('c8_areas_iniciativas')!
      .options.find((o) => o.value === 'NINGUNA');

    expect(ninguna).toMatchObject({ allowsText: true });
  });

  it('resuelve los procesos en una pregunta PROCESOS', async () => {
    const index = await getQuestionIndex();
    expect(
      index.get('c10_proceso_reprocesos')!.options.map((o) => o.value),
    ).toEqual(['PROYECTOS']);
  });

  it('no inventa opciones en una pregunta estática', async () => {
    const index = await getQuestionIndex();
    expect(index.get('c1_frecuencia')!.options.map((o) => o.value)).toEqual([
      'DIARIA',
    ]);
  });

  it('excluye el centinela global del catálogo de áreas', async () => {
    prisma.question.findMany.mockResolvedValue([]);
    prisma.area.findMany.mockClear();
    prisma.area.findMany.mockResolvedValue([]);

    await getQuestionIndex();

    // El centinela nunca es una opción para el encuestado: es un detalle de almacenamiento.
    const [{ where }] = prisma.area.findMany.mock.calls[0] as [
      { where: { active?: boolean; isEvaluable?: boolean; code?: unknown } },
    ];
    expect(where.active).toBe(true);
    expect(where.isEvaluable).toBe(true);
    expect(where.code).toBeDefined();
  });
});
