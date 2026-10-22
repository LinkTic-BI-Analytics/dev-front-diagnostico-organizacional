import { describe, expect, it } from 'vitest';
import { leerNomina, parseCsv } from './nomina';

/**
 * Los casos salen del export real del ERP (22-oct-2026): documentos con espacios, puntos,
 * sin comillas o con un carácter invisible delante, y cargos con salto de línea.
 */

const ENCABEZADO = '"numero_identificacion","colaborador","cargo","proceso","categoria"\n';

describe('parseCsv', () => {
  it('respeta comillas, comas y saltos de línea dentro de un campo', () => {
    expect(parseCsv('a,"b, c","d\ne"\r\nf,"g ""h""",\n')).toEqual([
      ['a', 'b, c', 'd\ne'],
      ['f', 'g "h"', ''],
    ]);
  });
});

describe('leerNomina', () => {
  it('normaliza el documento como lo hace la API', () => {
    const { filas, invalidas } = leerNomina(
      ENCABEZADO +
        '"1018511959 ",Karen Duque,Operador,"201 - GESTIÓN DE PROYECTOS",BALU\n' +
        ' 91447386,Hamilton Moya,Especialista,"201 - GESTIÓN DE PROYECTOS",CNE\n' +
        '"80.040.004",Sergio Zuluaga,Líder,"201 - GESTIÓN DE PROYECTOS",AERONÁUTICA\n' +
        '"1637379.",Wilderson Gonzalez,Desarrollador,"204 - GESTIÓN DE MARKETING",CODE\n' +
        '\u20601000621040,Xol Ruiz,Analista,"201 - GESTIÓN DE PROYECTOS",DOCUMENTADORES\n',
    );
    expect(invalidas).toEqual([]);
    expect(filas.map((fila) => fila.numeroDocumento)).toEqual([
      '1018511959',
      '91447386',
      '80040004',
      '1637379',
      '1000621040',
    ]);
  });

  it('limpia el texto y lleva la categoría a subproceso', () => {
    const { filas } = leerNomina(
      ENCABEZADO +
        '"1018419364",Jhonatan Fajardo,"Profesional de Apoyo Junior \n","201 - GESTIÓN DE PROYECTOS",TIENDAS\n' +
        '"1067940318",Ivan Jimenez, Operador ,"201 - GESTIÓN DE PROYECTOS",\n',
    );
    expect(filas).toEqual([
      {
        numeroDocumento: '1018419364',
        nombre: 'Jhonatan Fajardo',
        cargo: 'Profesional de Apoyo Junior',
        proceso: '201 - GESTIÓN DE PROYECTOS',
        subproceso: 'TIENDAS',
      },
      {
        numeroDocumento: '1067940318',
        nombre: 'Ivan Jimenez',
        cargo: 'Operador',
        proceso: '201 - GESTIÓN DE PROYECTOS',
        subproceso: null,
      },
    ]);
  });

  it('reporta duplicados e inválidos en vez de cargarlos', () => {
    const { filas, invalidas, duplicados } = leerNomina(
      ENCABEZADO +
        '"1010185802",Jhon Rueda,Arquitecto,"242 - LA FABRIC",ARQUITECTURA\n' +
        '"1.010.185.802",Jhon Rueda,Arquitecto,"242 - LA FABRIC",ARQUITECTURA\n' +
        '"12",Sin Documento,Cargo,"242 - LA FABRIC",DATA\n',
    );
    expect(filas).toHaveLength(1);
    expect(duplicados).toEqual([{ documento: '1010185802', filas: [2, 3] }]);
    expect(invalidas).toEqual([{ fila: 4, documento: '12', nombre: 'Sin Documento' }]);
  });

  it('acepta los encabezados con que se pidió la tabla', () => {
    const { filas } = leerNomina(
      'Número de documento,Colaborador,Cargo,Proceso ,Subproceso\n1023456789,Ana,Analista,PMO,Datos\n',
    );
    expect(filas[0]).toMatchObject({ numeroDocumento: '1023456789', subproceso: 'Datos' });
  });
});
