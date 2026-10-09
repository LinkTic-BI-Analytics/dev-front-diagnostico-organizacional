# Diagnóstico Organizacional LinkTIC

Digitaliza el **Instrumento de Diagnóstico Organizacional** de LinkTIC: una encuesta interna de
percepción organizacional de 10 componentes que hasta ahora se diligenciaba en papel
([`docs/fuentes/Diagnóstico Organizacional.pdf`](docs/fuentes/)).

- **La encuesta** (`/`), pública y anónima, seccionada por componentes para completarse en
  15 minutos o menos.
- **El panel de administración** (`/admin`), protegido por sesión: indicadores, KPIs, el mapa
  de relacionamiento entre áreas y el monitoreo en vivo de la recolección.
- **La API** (`/api/v1`) que sirve a las dos, en el mismo proyecto.

Es **un solo proyecto de Next.js**, conectado a su repositorio de GitHub y desplegado en
Vercel, con la base de datos en Supabase.

**La especificación funcional es [`docs/Contexto.md`](docs/Contexto.md)** —el instrumento, las
fórmulas, los KPIs y los supuestos—. Si algo del código no cuadra con ese documento, el
documento manda.

---

## Stack

| Pieza | Versión | Para qué |
|---|---|---|
| Next.js (App Router) | 16.3.8 | Pantallas y API (route handlers); `proxy.ts` sobre `/admin` |
| React | 19.2.8 | Interfaz |
| Prisma + `@prisma/adapter-pg` | 7.9.1 | Acceso a PostgreSQL, migraciones y siembra |
| PostgreSQL | Supabase | Base de datos, conectada al proyecto en Vercel |
| zod · jose | 4.4.3 · 6.2.12 | Validación (navegador y servidor) · sesión JWT |
| Tailwind CSS · Recharts | 4.3.3 · 3.10.1 | Estilos (CSS-first) · gráficas |
| Vitest | 5.0.3 | Tests de la lógica de servidor |
| TypeScript | 6.0.3 | No la 7: su 7.0 salió sin API programática y rompe ESLint type-aware |
| Node.js | 24.x | La versión que usa Vercel (`engines` en `package.json`) |

---

## Arranque local

Requiere Node 20.19 o superior (en Vercel corre 24.x).

```bash
npm install                        # genera también el cliente de Prisma
cp .env.example .env.local         # y complete las variables marcadas [REQUERIDA]
# o, con el proyecto enlazado a Vercel:  npx vercel env pull .env.local

npm run dev                        # http://localhost:3000 — la API en /api/v1
```

Con una base nueva, antes de `npm run dev`:

```bash
npm run prisma:deploy              # crea las tablas (migraciones)
npm run prisma:seed                # siembra el catálogo del instrumento (idempotente)
npm run prisma:simulacion          # opcional: 68 respuestas simuladas para ver el panel
```

El panel está en `http://localhost:3000/login`, con el valor de `ADMIN_ACCESS_TOKEN`.

**`.env.local` apunta a la base real.** Los scripts de Prisma lo leen igual que Next, así que
`prisma:seed`, `prisma:simulacion` y `prisma:deploy` escriben en la base que diga ese archivo.
Para probar sin tocarla, pase la cadena de una base local en la misma línea del comando
(`DATABASE_URL=… DIRECT_URL=… npm run prisma:seed`); el detalle está en
[`docs/PROYECTO.md`](docs/PROYECTO.md#arranque).

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + `next build` — es lo que corre Vercel |
| `npm start` | Sirve el build |
| `npm run typecheck` | `tsc --noEmit` sobre todo el proyecto |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm test` | Vitest: 247 tests, sin base de datos |
| `npm run prisma:deploy` | Aplica las migraciones pendientes |
| `npm run prisma:seed` | Siembra el catálogo del instrumento |
| `npm run prisma:simulacion` | Siembra las respuestas simuladas |

La tabla completa está en [`docs/PROYECTO.md`](docs/PROYECTO.md#scripts).

---

## Estructura

```
├── src/
│   ├── app/                 pantallas (encuesta, login, panel) y la API en app/api/v1
│   ├── server/              lógica de servidor: servicios, reglas, indicadores, KPIs, sesión
│   ├── components/          interfaz: wizard, gráficas, shell del panel
│   ├── lib/                 lo que corre en el navegador: cliente de la API, lecturas, filtros
│   ├── proxy.ts             sesión sobre /admin/*
│   └── instrumentation.ts   avisos al arrancar
├── prisma/                  schema, migraciones, catálogo, siembra, simulación y limpieza
├── public/                  logotipos
├── docs/                    documentación (ver abajo)
├── .env.example             plantilla de variables; .env.local no se versiona
├── next.config.ts           cabeceras de seguridad de la API
├── vercel.json              región de las funciones (yul1, junto a la base)
├── CHANGELOG.md             historial de cambios
└── AGENTS.md · CLAUDE.md    instrucciones para agentes de código (las escribe Next)
```

---

## Despliegue

**Un proyecto de Vercel conectado al repositorio de GitHub:** cada push a `main` despliega a
producción y cada rama o pull request genera un preview. La base de Supabase se conecta al
proyecto desde Vercel, que inyecta las cadenas de conexión.

Lo mínimo para el primer despliegue: conectar la base, declarar `ADMIN_ACCESS_TOKEN`,
`JWT_SECRET` y `HASH_SALT`, y aplicar las migraciones pendientes con `npm run prisma:deploy`.
El paso a paso —región, Node, variables por ambiente, dominio propio y lista de verificación
antes de abrir la recolección— está en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

---

## Verificación

```bash
npm run typecheck && npm run lint && npm test && npm run build && npx prisma validate
```

Si `tsc` se queja de `PageProps`, `LayoutProps` o `RouteContext` tras añadir una ruta,
`npx next typegen` regenera los tipos de ruta.

---

## Estado

**Verificado el 9-oct-2026:** instalación limpia (`npm ci`), tipos, lint, 247 tests en 17
suites, build con Node 24 y con Node 26, y una prueba de extremo a extremo sobre una base local
(login, las 16 rutas de lectura del panel, las exportaciones y una encuesta completa). El detalle está en
el [historial](CHANGELOG.md).

**Pendiente antes de abrir la recolección real:**

1. **Aplicar la migración `0004_rls_sin_acceso_publico` en producción.** Hoy las tablas de
   Supabase no tienen RLS y su API REST puede leerlas con la clave pública del proyecto.
2. **Rotar `ADMIN_ACCESS_TOKEN`** por una cadena aleatoria larga.
3. **Borrar las respuestas simuladas** con
   [`prisma/limpiar-datos-de-prueba.sql`](prisma/limpiar-datos-de-prueba.sql).
4. **Desplegar** con la guía y verificar la encuesta en un teléfono real; ninguna de las dos
   cosas se ha hecho todavía.

**Supuestos que LinkTIC debe confirmar** (completos en
[`docs/Contexto.md` §11](docs/Contexto.md#11-decisiones-de-diseño-y-supuestos)):

1. **El alcance de los componentes 3, 4, 6 y 7.** Están implementados como percepción
   **global** de la organización; hacerlos por área multiplicaría la encuesta por cinco. Es el
   supuesto que más afecta a los datos.
2. **Las opciones de la pregunta 8.1**, que el PDF no lista: se usa el catálogo de áreas más
   `NINGUNA`.
3. **La población por área** (`areas.headcount`), sin la cual la tasa de participación queda
   "sin definir".
4. **La atribución de los motivos del NPS**: se responden una vez, y el encuestado se clasifica
   por el promedio de las áreas que calificó.

---

## Documentación

| Documento | Qué contiene |
|---|---|
| [`docs/Contexto.md`](docs/Contexto.md) | **La especificación funcional**: instrumento, catálogo, fórmulas, KPIs, arquitectura y supuestos |
| [`docs/PROYECTO.md`](docs/PROYECTO.md) | **El manual técnico**: rutas, estructura, decisiones, la API (30 endpoints), modelo de datos y tests |
| [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) | Vercel paso a paso: proyecto, base, región, variables, migraciones, dominio propio y lista de verificación |
| [`docs/VARIABLES-DE-ENTORNO.md`](docs/VARIABLES-DE-ENTORNO.md) | Las 12 variables, la integración de Supabase en Vercel y el diagnóstico de fallos |
| [`docs/MARCA.md`](docs/MARCA.md) | La línea gráfica aprobada y su relación con el Manual de Marca |
| [`CHANGELOG.md`](CHANGELOG.md) | Qué cambió y por qué, con lo verificado en cada cambio |
| [`docs/fuentes/`](docs/fuentes/) | El instrumento en papel y el Manual de Marca (PDF) |
| [`docs/diseno-encuesta/`](docs/diseno-encuesta/) | Lienzo de diseño de los cuatro bloques de color de la encuesta |
