import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Supabase publica el esquema `public` en su API REST: una tabla sin RLS queda legible y
 * escribible con la clave pública del proyecto. Este test lee las migraciones y exige que
 * toda tabla creada en ellas active RLS (Contexto.md §5.3).
 */

const MIGRATIONS = join(__dirname, 'migrations');

function migrationsSql(): string {
  return readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => readFileSync(join(MIGRATIONS, name, 'migration.sql'), 'utf8'))
    .join('\n');
}

function tablesMatching(sql: string, pattern: RegExp): Set<string> {
  return new Set([...sql.matchAll(pattern)].map((match) => match[1]));
}

describe('migraciones', () => {
  const sql = migrationsSql();
  const created = tablesMatching(sql, /CREATE TABLE "([^"]+)"/g);
  const withRls = tablesMatching(
    sql,
    /ALTER TABLE "([^"]+)" ENABLE ROW LEVEL SECURITY/g,
  );

  it('encuentra las tablas del esquema', () => {
    expect(created.size).toBeGreaterThanOrEqual(11);
  });

  it('activa RLS en toda tabla que crean', () => {
    const missing = [...created].filter((table) => !withRls.has(table));
    expect(missing).toEqual([]);
  });

  it('activa RLS también en la tabla de control de Prisma', () => {
    expect(withRls.has('_prisma_migrations')).toBe(true);
  });
});
