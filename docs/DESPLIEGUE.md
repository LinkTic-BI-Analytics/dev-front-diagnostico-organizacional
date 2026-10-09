# Despliegue en Vercel

Cómo se despliega el sistema y qué revisar antes de abrir la recolección. Es **un solo proyecto
de Vercel**, conectado al repositorio de GitHub, con la base de datos en Supabase.

| Pieza | Valor |
|---|---|
| Repositorio | `github.com/fily666/dev-front-multivariable`, rama `main` |
| Framework | Next.js 16 (Vercel lo detecta; `vercel.json` lo declara) |
| Región de las funciones | **`yul1` — Montreal**, la misma de la base (`ca-central-1`) |
| Node.js | **24.x** (`engines` en `package.json`) |
| Base de datos | Supabase, conectada al proyecto desde Vercel |

---

## Cómo despliega

Con el repositorio conectado (**Settings → Git**), Vercel construye solo:

- **Un push a `main`** despliega a producción.
- **Cualquier otra rama o pull request** genera un *preview* con su propia URL.

Cada build corre `npm install` —que genera el cliente de Prisma en el `postinstall`— y luego
`npm run build` (`prisma generate && next build`). No hace falta configurar comandos: los
valores por defecto de Vercel son los correctos.

| Ajuste del proyecto | Valor |
|---|---|
| Root Directory | vacío (la raíz del repositorio) |
| Build Command | por defecto (`npm run build`) |
| Install Command | por defecto (`npm install`) |
| Output Directory | por defecto (`.next`) |
| Node.js Version | lo fija `engines.node = "24.x"`: manda sobre el ajuste del panel |

**Las migraciones no corren en el build.** Un preview que compartiera base con producción
migraría la base real al abrir un pull request. Se aplican a mano, ver
[Migraciones](#migraciones).

### La región

Vercel ejecuta las funciones en Washington (`iad1`) si no se le dice otra cosa, y la base de
Supabase está en Montreal. Cada consulta cruzaría entre las dos ciudades, y las vistas del panel
hacen varias por solicitud. [`vercel.json`](../vercel.json) fija `"regions": ["yul1"]`, la región
de Vercel en Montreal: las funciones quedan junto a la base. Una sola región está permitida en
todos los planes.

Si algún día la base se mueve de región, la de las funciones tiene que moverse con ella. La
región de la base está en el host del pooler (`aws-0-<región>.pooler.supabase.com`), y la
equivalencia con las de Vercel en
[vercel.com/docs/regions](https://vercel.com/docs/regions#region-list).

---

## La base de datos

### Conectarla al proyecto

En Vercel, **Storage** (o el Marketplace) → **Supabase** → conectar la base existente al
proyecto, eligiendo en qué ambientes (Production, Preview, Development) recibe las variables.
La integración inyecta, entre otras, `POSTGRES_PRISMA_URL` (pooler, runtime) y
`POSTGRES_URL_NON_POOLING` (para migrar), que el código usa sin declarar nada más.

**Use una base aparte para Preview.** Si los previews comparten base con producción, un
despliegue de prueba escribe en las respuestas reales del diagnóstico. Con la integración se
asigna una base distinta a cada ambiente.

El detalle de las cadenas —puertos, TLS, qué variable manda— está en
[VARIABLES-DE-ENTORNO.md](VARIABLES-DE-ENTORNO.md#la-integración-de-supabase-en-vercel).

### Migraciones

Con una migración nueva en `prisma/migrations/`, se aplica antes (o justo después) del
despliegue que la necesita:

```bash
npx vercel env pull .env.local     # o .env.local escrito a mano con DIRECT_URL
npm run prisma:deploy
```

`prisma:deploy` usa `DIRECT_URL` (o `POSTGRES_URL_NON_POOLING`): el pooler en modo sesión,
puerto 5432. Apuntado al 6543 se queda colgado sin error.

**Pendiente hoy: `0004_rls_sin_acceso_publico`.** Activa RLS en todas las tablas y retira los
permisos de los roles de la API REST de Supabase. Hasta aplicarla, las tablas se pueden leer y
escribir con la clave pública del proyecto. No cambia nada para la app, que conecta como
`postgres` (con `BYPASSRLS`). Se puede comprobar después en Supabase, **Database → Tables**: las
doce tablas deben mostrar RLS activo.

**Toda tabla nueva debe activar RLS en su migración.** El test `prisma/migrations.spec.ts` falla
si no lo hace.

### Datos de prueba

La base de producción tiene hoy respuestas **simuladas** (`npm run prisma:simulacion`). Antes de
abrir la recolección se borran con
[`prisma/limpiar-datos-de-prueba.sql`](../prisma/limpiar-datos-de-prueba.sql), en el editor SQL
de Supabase.

---

## Variables de entorno

En **Settings → Environment Variables**, por ambiente:

| Variable | Producción | Notas |
|---|---|---|
| `ADMIN_ACCESS_TOKEN` | **Sí** | Cadena aleatoria larga. No dejar `Admin123!@` |
| `JWT_SECRET` | **Sí** | `openssl rand -base64 48`. Si viene del backend anterior, el mismo valor (conserva las sesiones) |
| `HASH_SALT` | **Sí** | `openssl rand -base64 48`, distinto de `JWT_SECRET`. Si viene del backend, el mismo valor (conserva el rate limit) |
| `DATABASE_URL` / `DIRECT_URL` | No | Las reemplaza la integración de Supabase; declararlas la sobreescribe |
| `MIN_COHORT_SIZE`, `JWT_EXPIRES_IN`, `COOKIE_NAME`, `LOGIN_RATE_*` | No | Tienen valores por defecto |

**Cambiar una variable exige redesplegar**: los despliegues ya hechos conservan las que tenían.
La referencia completa está en [VARIABLES-DE-ENTORNO.md](VARIABLES-DE-ENTORNO.md).

---

## Dominio propio (DNS)

Sin dominio propio, el sistema queda en la URL `*.vercel.app` del proyecto, y funciona igual:
pantallas y API comparten dominio, así que la sesión no depende del dominio que se elija.

Para servirlo en un subdominio de LinkTIC (por ejemplo `diagnostico.linktic.com`):

1. En Vercel, **Settings → Domains → Add Domain**, y escriba el dominio.
2. Vercel muestra el registro que hay que crear. En el DNS de `linktic.com`:
   - **Subdominio** (`diagnostico.linktic.com`): un registro **CNAME** con el valor que muestra
     Vercel. Cada proyecto tiene el suyo (del estilo `xxxxxxxx.vercel-dns-017.com`); copie el
     valor del panel, no uno de otra documentación.
   - **Dominio raíz** (`linktic.com`): un registro **A** con el valor que muestra Vercel. No es
     el caso de este sistema.
3. Si el dominio ya se usa en otra cuenta de Vercel, pedirá además un registro **TXT** de
   verificación.
4. Cuando el registro propague, Vercel lo marca como válido y emite el certificado HTTPS solo.

No hace falta tocar el código ni las variables: la cookie de sesión queda atada al host que la
emite. Si el registro no valida, revise que no haya otro A, AAAA o CNAME para el mismo nombre;
la guía de Vercel está en
[vercel.com/docs/domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

---

## Lista de verificación antes de abrir la recolección

- [ ] La base de producción tiene aplicada `0004_rls_sin_acceso_publico` (RLS en las 12 tablas).
- [ ] `ADMIN_ACCESS_TOKEN` rotado: el log del despliegue ya no muestra el aviso de token inicial.
- [ ] `JWT_SECRET` y `HASH_SALT` propios de producción, distintos entre sí.
- [ ] Preview con su propia base, o sin acceso a la de producción.
- [ ] Respuestas simuladas borradas (`prisma/limpiar-datos-de-prueba.sql`).
- [ ] `areas.headcount` cargado, si se quiere la tasa de participación.
- [ ] La encuesta recorrida completa en un teléfono real.
- [ ] El proyecto de Vercel del backend anterior retirado y su repositorio archivado.

## Después de desplegar

| Comprobación | Esperado |
|---|---|
| `https://<dominio>/api/v1/survey/schema` | 200 con la campaña abierta y los 10 componentes |
| `https://<dominio>/admin` sin sesión | Redirige a `/login` |
| `https://<dominio>/api/v1/admin/overview` sin sesión | 401 |
| Login con el token | Entra al panel |
| Resumen del despliegue en Vercel | Funciones en `yul1` |
| Logs del despliegue | Sin «Falta la variable de entorno» ni errores de conexión |

**Si algo falla**, el despliegue anterior sigue disponible: en **Deployments**, el anterior →
**Promote to Production** lo restituye en segundos. Las migraciones no se revierten con eso; por
eso cada una debe ser compatible con el código anterior, como lo es la 0004.
