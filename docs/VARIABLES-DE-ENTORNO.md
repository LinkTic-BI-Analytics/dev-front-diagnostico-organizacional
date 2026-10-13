# Variables de entorno

Referencia única de las variables del sistema. Desde el 8-oct-2026 las pantallas y la API son
**un solo proyecto de Next.js**, así que hay un solo archivo de configuración y
**12 variables** —antes eran 21, repartidas entre dos proyectos—: 10 propias y 2 declaradas sin
consumir. Con la base de Supabase conectada al proyecto en Vercel, las dos de base de datos
las pone la integración y no hay que escribirlas.

| Archivo | Versionado | Contiene secretos |
|---|---|---|
| `.env.example` | Sí | No — plantilla con marcadores |
| `.env.local` | **No** | **Sí** — credenciales de Supabase, token, secretos de firma |

El `.gitignore` ignora `.env*` con excepción explícita del ejemplo. Las secciones de los dos
archivos van en el mismo orden, para que un diff muestre diferencias de valor y no de
estructura.

En local, `.env.local` se puede escribir a mano desde la plantilla o traer de Vercel con
`npx vercel env pull .env.local` (con el proyecto enlazado: `npx vercel link`). Next lo carga solo, y
los scripts de Prisma también: `prisma.config.ts` y los seeds lo leen con el mismo cargador de
Next (`prisma/load-env.ts`). **Por eso los scripts de Prisma escriben en la base que diga
`.env.local`**; para probar contra una base local, ver
[PROYECTO.md](PROYECTO.md#probar-contra-una-base-local-sin-tocar-la-real).

[`Contexto.md` §8](Contexto.md#8-variables-de-entorno) resume esta misma configuración.

---

## La regla de los secretos

Todo lo que lleva el prefijo `NEXT_PUBLIC_` queda **incrustado en el bundle del navegador** y es
visible para cualquiera que abra el inspector. Por eso ningún secreto lo lleva: las variables
de las secciones 1 a 3 se leen solo en el servidor (route handlers, proxy y scripts), desde un
único módulo, [`src/server/env.ts`](../src/server/env.ts).

Ese módulo lee cada valor al usarse y no al importarse: `next build` carga los route handlers
para recoger su configuración, y un error a nivel de módulo tumbaría el build en un entorno sin
secretos (CI, un preview sin variables). Verificado: el build pasa sin ninguna variable de base
de datos.

---

## La integración de Supabase en Vercel

Si la base está conectada al proyecto desde Vercel (**Storage → Supabase**, o la integración
del Marketplace), Vercel inyecta en cada ambiente un juego de variables. El código usa dos:

| Inyectada por la integración | Equivale a | Uso |
|---|---|---|
| `POSTGRES_PRISMA_URL` | `DATABASE_URL` | Runtime: pooler en modo transacción (6543, `pgbouncer=true`) |
| `POSTGRES_URL_NON_POOLING` | `DIRECT_URL` | CLI de Prisma: `migrate`, `db seed` |

**La variable propia manda**: si `DATABASE_URL` está declarada se usa ella, y si no, la de la
integración ([`env.ts`](../src/server/env.ts) — `runtimeDatabaseUrl`). Así basta con
conectar la base para que el proyecto funcione, y una variable explícita sigue pudiendo
sobreescribirla.

Las demás que inyecta la integración (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_URL`…) **no las lee el código**.
El sistema habla con PostgreSQL por Prisma y no usa el cliente JS de Supabase; la
`service_role_key`, que salta la seguridad a nivel de fila, queda en el entorno de Vercel pero
ningún código la toca.

**Un detalle de TLS que rompía la integración.** Las cadenas de la integración traen
`sslmode=require`, y `node-postgres` 8.x lo interpreta como `verify-full`: valida el
certificado contra las CA del sistema, la de Supabase no está, y la conexión cae con
`self-signed certificate in certificate chain` (comprobado contra el pooler real).
[`db.ts`](../src/server/db.ts) le pide a `pg` la semántica de libpq
(`uselibpqcompat=true`): cifrar sin verificar la CA, que es lo que `require` significa en
cualquier otro cliente de Postgres.

**Y la conexión viaja cifrada siempre.** Una cadena sin `sslmode` hacía que `pg` conectara **en
claro**: hasta el 8-oct-2026, la `DATABASE_URL` del backend no lo declaraba y las credenciales
y las respuestas cruzaban sin cifrar entre Vercel y Supabase (comprobado: `TLS false`). Ahora
`db.ts` exige `sslmode=require` contra cualquier host que no sea local; una cadena que declare
su propio `sslmode` (por ejemplo `disable` para un Postgres de pruebas) se respeta.

---

## 1. Base de datos (Supabase)

| Variable | Req. | Puerto | Quién la usa |
|---|---|---|---|
| `DATABASE_URL` | **Sí**, sin la integración | **6543** + `?pgbouncer=true` | El runtime ([db.ts](../src/server/db.ts)) y los seeds |
| `DIRECT_URL` | Sí, para `migrate`/`seed`, sin la integración | **5432** | Solo el CLI de Prisma ([prisma.config.ts](../prisma.config.ts)) |

Dos cadenas, y confundirlas cuesta caro:

- **6543, modo transacción** soporta las muchas conexiones efímeras de las funciones
  serverless. Una conexión directa agota el límite de Postgres con varios arranques en frío
  simultáneos.
- **5432, modo sesión** es obligatorio para migrar: `migrate` toma locks a nivel de sesión que
  el modo transacción no conserva entre sentencias. Con `DIRECT_URL` apuntada al 6543,
  **`prisma migrate deploy` se queda colgada indefinidamente y sin mensaje de error**.

Dos fallos que parecen otra cosa:

- **La región del host debe ser la de su proyecto.** Si no coincide, el pooler responde
  `tenant/user postgres.<ref> not found`, que suena a credenciales pero es la región. Copie
  la cadena exacta del panel de Supabase; no la escriba a mano.
- **Contraseñas con caracteres especiales van URL-encoded:** `!` → `%21`, `#` → `%23`,
  `$` → `%24`, `%` → `%25`, `&` → `%26`. Un `!` literal corta la cadena de conexión.

Ruta en el panel: **Project Settings → Database → Connection string → Connection pooling**.

**Las tablas viven en el esquema `mod_encuestas`, no en `public`.** El esquema no se configura
con una variable: está fijo en [`env.ts`](../src/server/env.ts) (`DATABASE_SCHEMA`) para que
ningún ambiente escriba en otro por olvido. Las cadenas se copian tal cual del panel, sin
`?schema=`. El runtime le pasa el esquema al adapter de Prisma, que califica cada tabla con
él. El CLI lo recibe como `?schema=` en su cadena, y `migrate` crea el esquema si no existe.
En el editor SQL de Supabase, que busca en `public`, las tablas se nombran con su esquema
(`mod_encuestas.survey_responses`) o se fija antes `SET search_path TO mod_encuestas;`.

`prisma generate` —que corre en cada `npm install` y en el build de Vercel— **no necesita** base
de datos: `prisma.config.ts` acepta que falte `DIRECT_URL`.

## 2. Acceso al panel

| Variable | Req. | Default | Notas |
|---|---|---|---|
| `ADMIN_ACCESS_TOKEN` | **Sí** | `Admin123!@` | Se canjea por la cookie en `POST /api/v1/auth/login`. **Rotar antes de datos reales.** |
| `JWT_SECRET` | **Sí** | — | 64+ caracteres aleatorios, distinta de `HASH_SALT`. La usan la API y el proxy. |
| `JWT_EXPIRES_IN` | No | `8h` | Formato `15m`, `8h`, `7d`. |
| `COOKIE_NAME` | No | `linktic_admin_session` | Una sola variable: la leen el proxy y la API. |

Generar los dos secretos, distintos entre sí:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # HASH_SALT
```

**Sobre `ADMIN_ACCESS_TOKEN`:** `Admin123!@` es el valor inicial que pidió LinkTIC. Es
predecible, y un token compartido no da trazabilidad por persona ni permite revocar el acceso
de alguien sin afectar a los demás. El servidor avisa al arrancar mientras siga siendo el
default ([instrumentation.ts](../src/instrumentation.ts)).

**`JWT_SECRET` ahora lo usa también el proxy.** Antes `proxy.ts` solo miraba si la cookie
existía, porque validar la firma obligaba a compartir el secreto entre dos proyectos. Siendo
uno solo, el proxy valida firma y vigencia: una sesión vencida o una cookie forjada van al login
en vez de pintar un panel vacío. La autoridad sigue siendo cada route handler de
`/api/v1/admin`, que valida la sesión en cada llamada.

**Mantener el mismo `JWT_SECRET` al migrar** conserva las sesiones abiertas: el JWT nuevo tiene
el mismo formato que emitía NestJS (comprobado en las dos direcciones).

La cookie se emite con `httpOnly`, `SameSite=Lax`, `path=/` y `Secure` en cualquier despliegue
(`NODE_ENV=production` o `VERCEL=1`) — [session.ts](../src/server/session.ts). Sin
`domain`: queda atada al host que la emitió, que es el mismo de las pantallas.

## 3. Privacidad y seguridad

| Variable | Req. | Default | Notas |
|---|---|---|---|
| `HASH_SALT` | **Sí** | — | Sal para hashear IPs y user agents. Distinta de `JWT_SECRET`. |
| `MIN_COHORT_SIZE` | No | `4` | Mínimo de respuestas para publicar un corte. |
| `LOGIN_RATE_LIMIT` | No | `5` | Intentos fallidos por IP en la ventana. |
| `LOGIN_RATE_WINDOW_MINUTES` | No | `15` | Ventana del rate limit, en minutos. |

Las IPs y los user agents **nunca se persisten en claro**. Cambiar `HASH_SALT` invalida el rate
limit de login en curso: los hashes dejan de coincidir con los ya auditados.

**`MIN_COHORT_SIZE` es la garantía de anonimato, no un detalle de presentación.** Por debajo de
ese número el panel muestra "datos insuficientes" en vez del dato: con dos o tres personas en
un área, un promedio permite deducir quién dijo qué. Se aplica en el orquestador
([cohort.util.ts](../src/server/analytics/cohort.util.ts)) y no dentro de los
indicadores, para que ningún endpoint pueda olvidarla. No es desactivable desde la interfaz;
bajarla a `1` anula la garantía.

El rate limit de login se respalda en la tabla `admin_audit_log`, no en memoria, para que
sobreviva a los arranques en frío de serverless. Aparte hay un límite de ráfagas por IP en
memoria de cada instancia (120/min por ruta; 10/min en login y en abrir borradores), como el
que tenía NestJS: corta ráfagas, pero no es un tope global. Para eso está el firewall de Vercel.

## 4. Declaradas pero aún no consumidas

| Variable | Qué controla de verdad ese comportamiento |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | El título fijo en `src/app/layout.tsx` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Nada: no hay enlace de soporte en la interfaz |

Ninguna aparece en `src/`. Se dejan declaradas porque describen valores que la interfaz
necesitará, pero **hoy cambiarlas no tiene efecto**. Dos salidas válidas: cablearlas (y
actualizar esta sección), o borrarlas de los dos archivos. Es una decisión pendiente de
producto, no un error.

---

## Variables retiradas el 8-oct-2026

Al unir los dos proyectos, nueve variables dejaron de existir. Si las tiene en un `.env` o en
Vercel, bórrelas: no hacen nada.

| Variable | Era de | Por qué sobra |
|---|---|---|
| `API_ORIGIN` | front | No hay backend al que reenviar: la API está en el mismo proyecto |
| `NEXT_PUBLIC_COOKIE_NAME` | front | El proxy lee `COOKIE_NAME` en el servidor; ya no hay que repetirlo |
| `CORS_ORIGINS` | back | Pantallas y API comparten origen: no hay CORS |
| `COOKIE_DOMAIN` | back | La cookie queda en el host que la emite, que es el de las pantallas |
| `PORT` | back | Next elige el puerto (`next dev -p`); en Vercel lo maneja la plataforma |
| `NODE_ENV` | back | La fija Next (`development` en `dev`, `production` en `build`/`start`) |
| `MAX_AREAS_INTERACCION` | back | Nunca tuvo efecto. El tope real es `maxSelect` de `c1_areas_interaccion` en el catálogo, y es lo que ahora devuelve `settings.maxAreasInteraccion` (como número; antes llegaba como texto, `"5"`) |
| `NPS_MOTIVOS_POR_AREA` | back | Reservada, nunca leída. La atribución de motivos vive en `nps.indicator.ts`; cambiarla es tocar código |
| `SURVEY_REQUIRE_IDENTITY` | back | Retirada antes, el 14-sep-2026: el área y el cargo son siempre obligatorios |

---

## Arranque local

```bash
cp .env.example .env.local   # y complete DATABASE_URL, DIRECT_URL, JWT_SECRET, HASH_SALT
# o, con el proyecto enlazado a Vercel:  npx vercel env pull .env.local
npm install
npm run dev
```

---

## Producción (Vercel)

Configure las variables en **Settings → Environment Variables** del proyecto, por separado en
Production / Preview / Development:

| Variable | Local | Producción |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | requeridas | **omitibles** si la base está conectada al proyecto: las reemplaza la integración |
| `ADMIN_ACCESS_TOKEN` | `Admin123!@` | cadena aleatoria larga |
| `JWT_SECRET` / `HASH_SALT` | valores de desarrollo | `openssl rand -base64 48`, distintos; **los mismos que tenía el backend** para no cerrar sesiones ni romper el rate limit en curso |

**Use una base aparte para Preview.** Si Preview comparte base con Production, un despliegue de
prueba escribe en las respuestas reales del diagnóstico. El resto del despliegue —región,
migraciones, dominio propio— está en [DESPLIEGUE.md](DESPLIEGUE.md).

---

## Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| `prisma migrate deploy` colgada, sin error | `DIRECT_URL` apunta al 6543 en vez del 5432 |
| `tenant/user postgres.<ref> not found` | La región del host no es la del proyecto |
| `self-signed certificate in certificate chain` | Una cadena con `sslmode=require` que no pasó por `createPrismaClient` (`src/server/db.ts`) |
| `Falta la cadena de conexión` | Ni `DATABASE_URL` ni la integración: conecte la base al proyecto en Vercel o declare la variable |
| `Falta la variable de entorno JWT_SECRET` (o `HASH_SALT`, `ADMIN_ACCESS_TOKEN`) | No está declarada en el ambiente que corre |
| El panel rebota al login con sesión recién abierta | `JWT_SECRET` distinto entre despliegues, o la sesión venció (`JWT_EXPIRES_IN`) |
| El panel dice "datos insuficientes" con datos cargados | El corte no llega a `MIN_COHORT_SIZE` respuestas |
| Aviso de token inicial al arrancar | `ADMIN_ACCESS_TOKEN` sigue siendo `Admin123!@` |
| Conexiones agotadas en Supabase | La cadena del runtime no es la del pooler 6543 |
