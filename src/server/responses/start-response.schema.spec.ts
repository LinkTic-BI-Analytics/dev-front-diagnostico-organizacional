import { describe, expect, it } from 'vitest';
import { startResponseSchema } from './start-response.schema';

/**
 * El documento es la llave contra la nómina: si la forma en que la persona lo escribe no
 * llega igual a la forma en que se cargó, la API le diría que no es colaborador.
 */

const parse = (numeroDocumento: unknown) =>
  startResponseSchema.safeParse({ numeroDocumento });

describe('startResponseSchema', () => {
  it('quita puntos, espacios y guiones', () => {
    expect(parse('1.023.456.789').data).toEqual({ numeroDocumento: '1023456789' });
    expect(parse(' 1023 456-789 ').data).toEqual({ numeroDocumento: '1023456789' });
  });

  it('pasa las letras a mayúsculas, para pasaportes y cédulas de extranjería', () => {
    expect(parse('ab123456').data).toEqual({ numeroDocumento: 'AB123456' });
  });

  it('rechaza lo que no puede ser un documento', () => {
    expect(parse('').success).toBe(false);
    expect(parse('123').success).toBe(false);
    expect(parse('1023456789/').success).toBe(false);
    expect(parse('1'.repeat(21)).success).toBe(false);
    expect(parse(1023456789).success).toBe(false);
  });

  it('no acepta campos de más', () => {
    expect(
      startResponseSchema.safeParse({ numeroDocumento: '1023456789', ownArea: 'PMO' })
        .success,
    ).toBe(false);
  });
});
