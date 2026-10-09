# Manual del proyecto

El manual técnico del sistema; el panorama, la historia de cambios y los supuestos están en el
[README](../README.md). El proyecto es una aplicación de Next.js con todo el sistema: la **encuesta pública y anónima** en el home, el
**panel de administración** protegido por sesión y **la API** que los sirve a los dos
(`/api/v1`, route handlers en [`src/app/api/v1`](../src/app/api/v1)). No hay un backend aparte:
desde el 8-oct-2026 lo que era la API de NestJS vive en [`src/server`](../src/server).

- **Local:** `http://localhost:3000` — la API en `http://localhost:3000/api/v1`
- **Base de datos:** PostgreSQL en Supabase, conectada al proyecto en Vercel; vía Prisma 7 con
  driver adapter. El navegador nunca habla con Supabase directamente.
- **Especificación funcional:** [`Contexto.md`](Contexto.md) — si el código no cuadra
  con ese documento, el documento manda
- **Variables de entorno:** [`docs/VARIABLES-DE-ENTORNO.md`](VARIABLES-DE-ENTORNO.md)

---

## Arranque

Requiere Node 20.19 o superior (en Vercel corre 24.x) y la base de Supabase.

```bash
npm install                          # genera también el cliente de Prisma
cp .env.example .env.local           # complete DATABASE_URL, DIRECT_URL, JWT_SECRET, HASH_SALT
# o, con el proyecto enlazado a Vercel:  npx vercel env pull .env.local

npm run prisma:deploy                # solo en una base nueva: crea las 11 tablas
npm run prisma:seed                  # siembra el catálogo del instrumento (idempotente)
npm run prisma:simulacion            # opcional: 68 respuestas simuladas para ver el panel

npm run dev                          # http://localhost:3000
```

Para entrar al panel: `http://localhost:3000/login`, con el valor de `ADMIN_ACCESS_TOKEN`
(inicialmente `Admin123!@`).

### Probar contra una base local, sin tocar la real

**`.env.local` apunta a la base real**, y los scripts de Prisma lo leen igual que Next:
`prisma:deploy`, `prisma:seed` y `prisma:simulacion` escriben en la base que diga ese archivo.
Para probar migraciones o la siembra sin tocarla, `prisma dev` levanta un Postgres local
desechable, y su cadena se pasa **en la misma línea de cada comando** (las variables del entorno
mandan sobre `.env.local`):

```bash
npx prisma dev --name pruebas --detach            # imprime la cadena postgres://…localhost:…
LOCAL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
DATABASE_URL=$LOCAL DIRECT_URL=$LOCAL npm run prisma:deploy
DATABASE_URL=$LOCAL DIRECT_URL=$LOCAL npm run prisma:seed
DATABASE_URL=$LOCAL DIRECT_URL=$LOCAL npm run prisma:simulacion
npx prisma dev rm pruebas                         # al terminar
```

No encadene esos comandos con `;` detrás de un `export`: si el `export` no llega a correr, los
siguientes caen sobre `.env.local`. Así pasó el 9-oct-2026 (ver el [historial](../CHANGELOG.md)).

### Las dos cadenas de conexión

`DATABASE_URL` va al pooler **6543** y `DIRECT_URL` al **5432**. Con `DIRECT_URL` apuntada al
6543, `prisma migrate deploy` se queda colgada sin mensaje de error — el detalle está en
[la referencia de variables](VARIABLES-DE-ENTORNO.md#1-base-de-datos-supabase).

El seed carga las 16 gestiones y sus 53 subprocesos, `OTRA` (no evaluable), los 10 componentes
con su texto introductorio literal del PDF, las 44 preguntas con sus opciones, los 7 pesos del
IMC y las 4 bandas de semaforización. **Es idempotente:** se puede volver a correr sin
duplicar nada, y desactiva —sin borrarlas— las áreas, gestiones y preguntas que salieron del
catálogo.

### Respuestas simuladas

`npm run prisma:simulacion` siembra **68 respuestas simuladas** en la campaña abierta —53
completas y 15 incompletas—, para ver el panel con datos antes de la recolección real. Las
genera [`prisma/simulacion.ts`](../prisma/simulacion.ts) con una semilla fija —dos corridas dan
las mismas respuestas— y cada una pasa por las mismas reglas que aplica la API antes de
escribirse. No son ruido uniforme: cada encuestado trae su indulgencia, el cargo mueve la nota
y cada área tiene su reputación, así que el panel tiene áreas fuertes y débiles, brecha
jerárquica, dos encuestas a la carrera y una en línea recta para la vista de calidad.

| Comando | Qué hace |
|---|---|
| `npm run prisma:simulacion` | Siembra solo si la base **no tiene** respuestas |
| `npm run prisma:simulacion -- --reset` | Respalda en JSON (en la raíz del proyecto, ignorado por git), **borra todas** las respuestas y siembra; borrado y siembra en una sola transacción |

**Antes de abrir la recolección real hay que borrarlas** con
[`prisma/limpiar-datos-de-prueba.sql`](../prisma/limpiar-datos-de-prueba.sql).

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (pantallas y API) |
| `npm run build` | `prisma generate` + build de producción — es lo que corre Vercel |
| `npm start` | Sirve el build |
| `npm run typecheck` | `tsc --noEmit` — pantallas, API, scripts de `prisma/` y tests en un solo ámbito |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm test` | Vitest — 247 tests, sin base de datos ni navegador |
| `npm run test:watch` | Vitest en modo observación |
| `npm run prisma:generate` | Regenera el cliente (también corre en `npm install`) |
| `npm run prisma:validate` | Valida `prisma/schema.prisma` |
| `npm run prisma:deploy` | `prisma migrate deploy` |
| `npm run prisma:seed` | `prisma db seed` |
| `npm run prisma:simulacion` | Siembra las 68 respuestas simuladas (ver arriba) |

Si `tsc` se queja de `PageProps` o `LayoutProps` tras añadir una ruta, `npx next typegen`
regenera los tipos de ruta. Este proyecto usa esos tipos generados: vea
`LayoutProps<'/'>` en [layout.tsx:16](../src/app/layout.tsx#L16).

---

## Rutas

15 pantallas, las 28 rutas de la API (ver [La API](#la-api)) y el proxy, confirmados por
`next build`. Las pantallas:

| Ruta | Render | Qué es |
|---|---|---|
| `/` | Estático | La encuesta (wizard de 10 componentes) |
| `/gracias` | Estático | Confirmación de envío |
| `/login` | Estático | Canje del token por la cookie de sesión |
| `/admin` | Estático | Resumen ejecutivo: el diagnóstico en una lectura |
| `/admin/indices` | Estático | Los ocho índices, sus pesos y el NPS por área |
| `/admin/componentes` | Estático | Detalle por componente, por área de origen y por nivel de cargo |
| `/admin/preguntas` | Estático | Las 33 afirmaciones 0-10, una por una: distribución, neto y consenso |
| `/admin/mapa` | Estático | Mapa de relacionamiento: plano, brecha, aspectos, influencias y matriz |
| `/admin/interaccion` | Estático | Red de interacción: demanda, áreas críticas, frecuencia, valor contra fortalecer |
| `/admin/cualitativo` | Estático | Nube de ideas, obstáculos y motivos |
| `/admin/areas` | Estático | Todas las áreas, por gestión |
| `/admin/areas/[area]` | Dinámico | Ficha de un área |
| `/admin/metodologia` | Estático | Fuentes, fórmulas, pesos, semáforo y anonimato |
| `/admin/respuestas` | Estático | **Monitoreo en vivo** de la recolección y el listado |
| `/_not-found` | Estático | 404 |

Las rutas de `/admin` se prerenderizan como cascarón estático y traen sus datos en cliente
con React Query: los datos del panel nunca se cachean (`cache: 'no-store'`), y prerenderizar
el cascarón evita mandar HTML vacío mientras llega el primer fetch.

`metadata.robots` está en `{ index: false, follow: false }`
([layout.tsx](../src/app/layout.tsx)): es un instrumento interno, no debe indexarse.

---

## Estructura

```
prisma/
├── schema.prisma           11 tablas; el cliente se genera en src/server/generated (sin versionar)
├── migrations/             0001_init · 0002_arbol_de_procesos · 0003_anclas_de_escala ·
│                           0004_rls_sin_acceso_publico
├── migrations.spec.ts      exige RLS en toda tabla que creen las migraciones
├── catalog.ts              el instrumento: organigrama, componentes, preguntas, pesos, bandas
├── seed.ts                 siembra el catálogo (idempotente)
├── simulacion.ts           las 68 respuestas simuladas, validadas con las reglas de la API
├── limpiar-datos-de-prueba.sql  borra todas las respuestas antes de abrir la recolección
└── load-env.ts             carga .env.local como Next, para el CLI y los scripts
prisma.config.ts            CLI de Prisma: schema, migraciones y la cadena de migración
next.config.ts              cabeceras de seguridad de /api/v1
vercel.json                 región de las funciones: yul1 (Montreal), junto a la base
.env.example                plantilla de variables (.env.local no se versiona)
src/
├── proxy.ts                sesión sobre /admin/*: valida firma y vigencia del JWT
├── instrumentation.ts      aviso al arrancar si el token del panel es el inicial
├── app/
│   ├── layout.tsx          html lang="es-CO", Geist + Geist Mono, robots noindex
│   ├── globals.css         tokens de la línea gráfica, paleta de datos, piezas .lk-*
│   ├── providers.tsx       React Query
│   ├── page.tsx            la encuesta
│   ├── login/ gracias/
│   ├── admin/              layout con AdminShell + las 11 vistas del panel
│   └── api/v1/             LA API: un route.ts por ruta, delgado; la lógica está en src/server
├── server/                 todo lo que corre solo en el servidor (antes, la API de NestJS)
│   ├── env.ts              las variables, leídas al usarse; respaldo de la integración de Vercel
│   ├── db.ts               cliente de Prisma: una instancia por proceso, TLS exigido
│   ├── http.ts             errores con la forma de NestJS, validación zod, límites, handler()
│   ├── session.ts          JWT HS256 en cookie httpOnly (lo usa también el proxy)
│   ├── auth/               login por token, auditoría y rate limit respaldado en la base
│   ├── survey/             el catálogo que dirige el wizard
│   ├── responses/          borradores, guardado por paso, envío
│   │   └── rules/          8 reglas de validación del instrumento
│   ├── analytics/          el panel
│   │   ├── indicators/     10 índices + IMC compuesto + NPS (funciones puras)
│   │   ├── kpis/           distribuciones, mapa, influencias, monitoreo, ítems, cargos, red, calidad
│   │   ├── repositories/   acceso a datos, separado del cálculo
│   │   ├── cohort.util.ts  regla de anonimato
│   │   └── thresholds.service.ts · weights.service.ts   bandas y pesos, caché de 60 s
│   ├── campaigns/          alta y cierre de campañas
│   ├── export/             CSV y XLSX por streaming
│   └── common/             constantes del instrumento, hash, sanitize
├── components/
│   ├── brand/Logo.tsx      logotipo e isotipo; versión según el fondo
│   ├── ui/icons.tsx        iconos de trazo (24 × 24, trazo 1,8)
│   ├── shell/              AdminShell · SidebarNav · CommandPalette · nav-config
│   ├── page/               PageHeader (portada o plana, migas, cifras, acciones, secciones)
│   │                       FilterBar (la fila de filtros globales)
│   ├── survey/             el wizard (ver «Los cuatro bloques de color»)
│   └── charts/             piezas del panel:
│                           ChartCard · DataTable · EnvelopeGate · SidePanel
│                           PackedBubbles + pack.ts · QuadrantScatter · TimelineChart
│                           LikertBars · ItemHistogram
│                           MonitoringCharts (embudo, histograma, calendario)
│                           IndicatorMeter · BarRanking · DivergingBars · OpposedBars
│                           OrdinalBars · NpsGauge · RadarIndices · PriorityList
│                           IndicesHeatTable · RelationshipMatrixView · ScoreHeatmapGrid
└── lib/                    lo que corre en el navegador
    ├── api.ts              cliente HTTP hacia /api/v1; credentials: 'include', cache: 'no-store'
    ├── survey-client.ts    endpoints de la encuesta
    ├── admin-client.ts     endpoints del panel
    ├── insights.ts         **el motor de lecturas**: convierte cada payload en una conclusión
    ├── use-catalog.ts      el organigrama (gestiones y subprocesos) desde el catálogo público
    ├── filters-store.ts    los filtros globales del análisis, en la sesión del navegador
    ├── use-area-names.ts   códigos de área → nombre
    ├── zod-schema-builder.ts  validación generada desde el catálogo
    ├── draft-storage.ts    puntero del borrador en localStorage
    ├── score-scale.ts      formato es-CO de cifras y fechas, bandas y velo de matrices
    └── use-thresholds.ts   umbrales, leídos de la API
```

**`src/server` nunca se importa desde un componente de cliente.** Ahí viven Prisma y los
secretos; `src/lib` es lo que corre en el navegador y habla con el servidor solo por `/api/v1`.

---

## Decisiones de producto y privacidad

**La encuesta es anónima, y por eso la identificación es obligatoria.** No se pide el nombre
—se retiró el 14-sep-2026, junto con la columna `respondent_name`—. Lo que sí se pide, antes de
empezar y sin opción de saltarlo, es **el área y el cargo**: ninguno de los dos identifica a
una persona, y sin ellos no hay filas en el mapa de relacionamiento ni cortes por nivel. El
cargo es una lista cerrada de siete niveles (Director, Gerente, Head, Coordinador, Líder,
Profesional, Analista), no texto libre, para que los cortes no dependan de cómo lo escriba cada
quien.

**Ningún corte con menos de 4 respuestas se publica.** El panel muestra "datos insuficientes
para mostrar sin comprometer el anonimato". La regla se aplica en el orquestador y no en los
indicadores (ver [La API](#tres-decisiones-que-explican-la-forma-del-código)), y se configura
con `MIN_COHORT_SIZE`; no es desactivable desde la interfaz.

**La base solo se lee desde el servidor.** El sistema no usa el cliente JS de Supabase: habla
con PostgreSQL por Prisma, como `postgres`. La API REST de Supabase no ve ninguna tabla: RLS sin
políticas en todas y sin privilegios para sus roles (migración `0004`). La integración de
Vercel deja la `service_role_key` en el entorno, pero ningún código la lee.

**El token de admin es el mecanismo que pidió LinkTIC, con una advertencia.** `Admin123!@` es
predecible, y un token compartido no da trazabilidad por persona ni permite revocar el acceso
de alguien sin afectar a los demás. Rótelo antes de exponer datos reales. La migración futura a
cuentas por persona no obliga a tocar las rutas: cada route handler valida un JWT, no el token,
así que solo cambia quién lo emite.

---

## Decisiones que explican la interfaz

**El wizard lo dirige el catálogo, no el código.** Un renderizador genérico
([QuestionRenderer.tsx](../src/components/survey/QuestionRenderer.tsx)) pinta los tipos de
pregunta a partir de `GET /survey/schema`. **Añadir una pregunta al instrumento no requiere
tocar React.** Incluso el layout de cada componente se deduce de las preguntas y no de una
lista fija de ids ([`layoutOf`](../src/components/survey/wizard-steps.ts)): si LinkTIC añade otro
componente evaluado por área, el wizard lo acomoda solo.

El componente 2 se pagina **por área evaluada** — 5 aspectos × 5 áreas son 25 valores, que no
caben en una pantalla — y el 9 se muestra como lista compacta por área. Eso hace que el número
total de pasos dependa de cuántas áreas eligió el encuestado en la pregunta 1.1.

**Las opciones de área se agrupan solas por gestión.** El servidor manda cada opción con su
grupo (`option.group`), así que `MultiChoiceField` y `SingleChoiceField` pintan los
encabezados sin saber nada del organigrama
([option-groups.ts](../src/components/survey/fields/option-groups.ts)). Con 53 subprocesos una
lista plana obliga a leerla entera; la gestión es la pista con la que cada persona se ubica.

**Dos excepciones al wizard genérico, ambas del componente 1.** La identificación (área y
cargo) vive en el paso de bienvenida y no en el catálogo de preguntas, porque condiciona todo
lo que sigue. Y `c1_area_principal` —la relación principal— no se pinta como bloque propio:
es una estrella sobre las áreas que se acaban de marcar en 1.1
([ComponentStep.tsx](../src/components/survey/ComponentStep.tsx)). Preguntarla aparte obligaría
a releer 53 subprocesos para repetir una de las cinco ya elegidas.

**La validación del cliente se genera desde el schema del servidor.**
[`zod-schema-builder.ts`](../src/lib/zod-schema-builder.ts) construye las reglas desde el
catálogo en vez de repetirlas a mano. Escritas a mano se desincronizarían del servidor en
cuanto cambiara el instrumento, y el usuario vería un 422 del servidor sobre un formulario que
el cliente dio por válido. Es un **espejo deliberado** del motor de reglas del servidor, no un
reemplazo: el servidor revalida siempre.

**El borrador que se guarda en el navegador es un puntero, no una copia.**
[`draft-storage.ts`](../src/lib/draft-storage.ts) guarda solo el `draftToken`; la fuente de
verdad es el servidor. Si el usuario cambia de dispositivo pierde el puntero, no la encuesta.
Todo el acceso va en `try/catch` porque en modo privado de Safari `localStorage` lanza al
escribir, y perder el autoguardado local no debe tumbar la encuesta.

**El proxy no es autorización.** [`proxy.ts`](../src/proxy.ts) valida la firma y la vigencia
del JWT antes de dejar pasar a `/admin/*`: una sesión vencida o una cookie forjada van al login
en vez de pintar un panel vacío. Hasta el 8-oct-2026 solo comprobaba que la cookie existiera,
porque validar la firma obligaba a compartir `JWT_SECRET` entre dos proyectos; siendo uno solo,
ya no. Aun así la autoridad son los route handlers de `/api/v1/admin`, que validan la sesión en
cada llamada: el proxy es el atajo del caso feliz. En Next 16 el archivo se llama `proxy.ts`
(antes `middleware.ts`), exporta `proxy()` y corre en el runtime de Node.

**El color nunca lleva el significado solo.** Los umbrales y sus colores vienen de la base de
datos vía API ([use-thresholds.ts](../src/lib/use-thresholds.ts)), y cada tarjeta y celda muestra
también **la etiqueta textual** del nivel. Las cuatro bandas están deliberadamente cerca en el
espacio de color — ámbar y naranja se separan ΔE 13.6 incluso con visión normal — así que la
etiqueta es lo que las hace legibles con daltonismo o impresas en gris.
[`inkOn`](../src/lib/score-scale.ts) calcula la tinta por luminancia relativa: con un color fijo,
el ámbar de "Aceptable" o el rojo de "Crítico" quedaría ilegible dentro de su propia celda.

**El mapa de relacionamiento es una matriz, no un grafo.** Ya con siete áreas un grafo dirigido
se vuelve una maraña de aristas; la matriz permite leer una fila ("cómo evalúa PMO a las
demás") o una columna ("cómo evalúan a PMO"). Y siendo una tabla real, la recorre un lector de
pantalla.

---

## El panel: la línea gráfica de las herramientas de análisis

Desde el 5-oct-2026 el panel sigue la línea gráfica aprobada por la organización (la de
*Prospectiva LinkTIC*): menú lateral navy colapsable, buscador ⌘K, portadas navy con retícula,
tarjetas blancas y Geist. El detalle de tokens, gama y tipografía —y en qué se aparta del
Manual de Marca— está en [`docs/MARCA.md`](MARCA.md).

### Qué hay en cada vista

| Ruta | Menú | Para qué se abre |
|---|---|---|
| `/admin` | Resumen ejecutivo | El diagnóstico entero en una lectura de arriba abajo. Es la portada |
| `/admin/indices` | Índices | De dónde sale cada cifra: pesos, cuánto le resta cada índice al IMC, NPS por área |
| `/admin/componentes` | Componentes | Cada componente por separado y cómo cambia según el área y el nivel de quien responde |
| `/admin/preguntas` | Preguntas | Lo que los promedios esconden: cada afirmación con su reparto de notas |
| `/admin/mapa` | Mapa de relacionamiento | Plano «da/recibe», ranking, aspectos, **influencias** (red, matriz y plano de motricidad y dependencia, por área o gestión) y la matriz en bruto |
| `/admin/interaccion` | Red de interacción | Qué áreas sostienen el trabajo de las demás y cuáles son críticas |
| `/admin/cualitativo` | Cualitativo | La nube de ideas de «qué cambiaría» y lo que marcaron |
| `/admin/areas` | Todas las áreas | La puerta a cada ficha, por gestión |
| `/admin/areas/[area]` | (cada subproceso) | Cómo la evalúan, contra el promedio de la empresa |
| `/admin/metodologia` | Metodología y datos | Fuentes, fórmulas, pesos, semáforo y anonimato |
| `/admin/respuestas` | Monitoreo en vivo | La recolección mientras está en campo, y el listado |

### La lectura es el título

Cada tarjeta abre con su **conclusión como título**, y el gráfico va debajo como respaldo;
debajo del título, una línea dice qué se está mirando, y al pie, plegado, «¿Cómo leer?» con
el método. Las cabeceras de vista hacen lo mismo: el titular de la portada es la conclusión
(«La colaboración entre áreas está *en riesgo*: 57,6 sobre 100»), no el nombre de la vista.
El fragmento destacado con el degradado lo decide el motor de lecturas (`Insight.emphasis`),
no la pantalla.

Las conclusiones viven en [`lib/insights.ts`](../src/lib/insights.ts). Tres reglas que ese
archivo respeta:

1. **Nunca se afirma más de lo que el dato sostiene.** Si los cinco aspectos caben en cuatro
   puntos, la lectura dice «van parejos». Si tres cargos empatan arriba, no se corona a uno.
2. **El tono sale de la banda, no de un umbral escrito en el front.**
3. **Se nombra el caso concreto.** «Contratación pública es la más exigente» sirve; «hay
   oportunidades de mejora» no.

Cada gráfico con más de una lectura posible tiene su **vista de tabla** en el conmutador: es
el gemelo accesible del gráfico y el lugar del número exacto sin depender del cursor.

### El monitoreo en vivo

[`/admin/respuestas`](../src/app/admin/respuestas/page.tsx) se refresca sola cada 15 s
(`refetchInterval`), conserva lo pintado mientras llega el corte nuevo y dice cuándo se
actualizó. Lee `GET /admin/monitoring`, que **no pasa por la cohorte mínima**: mide
participación, no opinión. Contesta, en orden:

| Pregunta | Forma |
|---|---|
| ¿Llega gente? | Curva acumulada de iniciadas y completas (o columnas por día); la distancia entre curvas es el abandono |
| ¿Hasta dónde llega? | Embudo por componente, agrupado por bloque, con la caída más grande destacada |
| ¿Cuánto tarda? | Histograma de duración con la marca de los 15 minutos prometidos |
| ¿Qué áreas faltan? | **Burbujas empaquetadas** por área (tamaño = completas; color = si alcanza la cohorte), con panel de detalle |
| ¿Qué niveles faltan? | Barras por cargo |
| ¿Cuándo responde la gente? | Calendario día × hora (hora de Bogotá) |

Las burbujas son la forma de la línea gráfica de referencia para respuestas en vivo. El
empaquetado es el algoritmo de cadena frontal de d3 (`packSiblings`), reescrito en
[`pack.ts`](../src/components/charts/pack.ts) para no sumar una dependencia; el área —no el
radio— es proporcional al valor. La misma pieza arma la **nube de ideas** de Cualitativo,
donde las respuestas abiertas se juntan por tema (o por texto idéntico) y se clasifican en
bloque desde el panel de detalle.

### Los KPIs 21–32 y los filtros globales

Desde el 5-oct-2026 el panel explota datos que antes solo entraban promediados o no se usaban
(el detalle está en `Contexto.md` §4.5):

| KPI | Dónde | Forma |
|---|---|---|
| 21 · Distribución de cada afirmación por banda | Preguntas | **Barras Likert divergentes**: bandas bajas a la izquierda del cero |
| 22 · Neto por afirmación, 10 peores y 10 mejores | Preguntas, Resumen | Ranking |
| 23 · Consenso contra nivel | Preguntas | **Plano** con cuadrantes «problema de sistema / localizado» |
| 24 · Índices por cargo y por grupo de cargo | Componentes | Matriz de calor |
| 25 · Brecha jerárquica (dirección − equipos) | Componentes, Resumen | Barras divergentes |
| 26 · Demanda por área | Red de interacción | **Burbujas** |
| 27 · Importancia × desempeño | Red de interacción, Resumen | **Plano** con el cuadrante «crítica» |
| 28 · Frecuencia y tipo de interacción | Red de interacción | Rampa ordinal y barras |
| 29 · Valor × fortalecer | Red de interacción | Barras enfrentadas |
| 30 · Aislamiento en innovación | Red de interacción | Cifras y lista |
| 31 · Calidad del corte | Metodología | Tarjetas y barras |
| 32 · Influencias: quién mueve a quién | Mapa de relacionamiento | **Red de tres capas**, matriz de influencias y plano de motricidad y dependencia; lista compacta en el teléfono |

Cada afirmación abre un panel con su **histograma 0-10** pintado por banda y su promedio
marcado: es la vista que distingue «todos dan 6» de «unos dan 2 y otros 10».

**Filtros globales.** Las vistas de análisis abren con una fila de filtros —área de quien
responde, cargo, frecuencia y tipo de interacción, rango de fechas— que acota todo lo que hay
debajo. Viven en `sessionStorage` ([`filters-store.ts`](../src/lib/filters-store.ts)) y no en la
URL a propósito: tienen que acompañar al analista cuando cambia de vista. Cada corte filtrado
pasa por la cohorte mínima en el servidor, así que filtrar demasiado fino muestra el aviso de
anonimato, nunca el dato. El monitoreo y Metodología no se filtran: describen la recolección
entera.

### Las formas, y por qué cada una

| Dato | Forma | Por qué |
|---|---|---|
| Un índice 0-100 | **Medidor** con los tramos del semáforo pintados en la pista | Se lee cuánto falta, no solo quién va delante |
| Áreas por lo que dan y reciben | **Plano** cortado por medianas, con la diagonal «da lo mismo que recibe» | Dos medidas a la vez; los cuadrantes nombran el perfil |
| La brecha, el NPS por área | **Barras divergentes** sobre un cero | Es polaridad: ningún extremo es «bueno» |
| Motivos del NPS | **Barras enfrentadas** | Un motivo que pesa en los dos lados es la señal más útil |
| Aspectos de un área | **Medidor con marca de referencia** (promedio de la empresa) | Se ve de inmediato dónde queda por debajo de lo típico |
| Lo que resta cada índice al IMC | **Barras** de peso × (100 − valor) | El que más resta no siempre es el más bajo |
| Frecuencia de interacción | **Rampa ordinal** | Las categorías tienen orden natural |
| Matrices de áreas | **Velo** del color de banda | 53 × 53 bloques saturados aplastan el número |

### Color: lo que está verificado

La paleta de datos es la de la referencia y se validó con el procedimiento de seis controles
(banda de luminancia, croma, separación con protanopia y deuteranopia, separación con visión
normal, contraste). La rampa ordinal pasa los controles ordinales (luminancia monótona,
ΔL ≥ 0,06, extremo claro 2,1:1); el par divergente azul/rojo da ΔE 21,6 con protanopia.

**Las cuatro bandas del semáforo siguen sin distinguirse entre sí por color a secas.** Los
colores llegan de la base de datos y son del cliente, así que no se cambian — lo que se hace
es no depender de ellos: la banda va siempre con su etiqueta escrita.

---

## Los cuatro bloques de color

Los diez componentes del instrumento se recorren en cuatro bloques, y cada uno tiene su
color. El corte está donde cambia el tipo de esfuerzo que se le pide al encuestado, que es
donde conviene que cambie el tono:

| Bloque | Componentes | Color | Qué se pide |
|---|---|---|---|
| 1 · Relacionamiento | 1-2 | azul `#0a6cb1` | calificar áreas concretas, una por una |
| 2 · Cómo funciona la empresa | 3-6 | teal `#0d6d5f` | calificar la operación: comunicación, servicio, tiempos, roles |
| 3 · Cultura | 7-8 | verde `#12690a` | cómo nos tratamos, aprendemos e innovamos |
| 4 · Qué debemos cambiar | 9-10 | ámbar `#8a5300` | qué recomendaría y qué hay que arreglar |

**El orden del instrumento no se toca**: los bloques agrupan, no reordenan. Cada uno es
contiguo a propósito — un bloque partido haría que el color fuera y volviera, que es la
señal contraria a la que sirve.

El color no vive solo en la barra de progreso. Tiñe el título del componente, la cinta de
fase, el botón de continuar, la casilla marcada de la escala 0-10 y el filete superior de la
tarjeta, así que al cambiar de bloque cambia el tono de toda la pantalla.

### Cómo está cableado

`SurveyWizard` pone un solo atributo, `data-phase`, en el contenedor del paso. De él
cuelgan los tokens `--phase-*` de `globals.css`, y las utilidades `text-phase`, `bg-phase`,
`border-phase-border`, `bg-phase-subtle` y `text-phase-on` los leen. Ningún componente
recibe el color por props: `ScaleField` no sabe en qué bloque está.

Fuera de un `[data-phase]` los tokens valen lo mismo que la marca, que es lo que necesitan
la bienvenida y la revisión.

`--phase-on` es la tinta que va encima de un plano de fase relleno: blanco. Las cuatro
tintas dan entre 5,5:1 y 6,9:1 sobre blanco.

### Qué sostiene el recorrido

Lo que evita que la encuesta se abandone a la mitad, en orden de peso:

1. **El mapa de ruta en la bienvenida** (`PhaseRoadmap`). Los cuatro bloques con su color,
   su promesa y su duración, antes de empezar. El abandono suele ser la sospecha de que el
   formulario no se acaba nunca.
2. **La barra partida en cuatro** (`PhaseProgress`). Cada tramo pesa lo que pesan sus
   pasos, no un cuarto: el primer bloque son seis pantallas de dieciséis y fingir lo
   contrario estanca el avance justo ahí. Es además la leyenda del código de color.
3. **El hito al entrar a un bloque** (`PhaseMilestone`). Cierra lo anterior con un visto y
   abre lo siguiente diciendo cuánto dura. El cambio de tema es el momento de más riesgo.
4. **El sub-avance por área** (`AreaProgress`). El componente 2 son cinco pantallas casi
   idénticas; los puntos dicen cuántas faltan sin obligar a leer.
5. **El pie pegado abajo** con el contador de respondidas y el aviso de que ya quedó
   guardado. Con cinco escalas de 0 a 10 el botón de continuar cae fuera de pantalla.
6. **El aviso al cerrar la pestaña**, solo cuando hay algo sin guardar. Uno que salte
   siempre se aprende a ignorar.

### Pendiente: el componente 10 es la pantalla más larga

Tal como está, el componente 10 monta en una sola pantalla tres preguntas de selección
única sobre el catálogo completo de subprocesos. Medida en el recorrido real, cuando eran 24:
**unos 5.600 px de alto**, contra los ~1.400 de una pantalla de escalas. Con los 53 de la
distribución del 5-oct-2026 crece en proporción —no se ha vuelto a medir—, y es justo la
última, donde menos conviene. Dos salidas, ninguna aplicada todavía porque cambian el instrumento o la
secuencia de pasos:

- Partir el componente 10 en dos pasos. Toca la semántica de `lastStep`, que hoy es el id
  del componente.
- Rendir las preguntas de selección única con muchas opciones como `<select>` agrupado por
  gestión, en vez de 53 botones. Pierde objetivo táctil, gana pantalla.

---

## La API

Route handlers de Next bajo `/api/v1`, con **el mismo contrato que tenía la API de NestJS**:
mismas rutas, mismos cuerpos, mismos estados (los `POST` que crean algo responden 201) y la
misma forma de error. Por eso ninguna pantalla cambió. Se verificó comparando las dos APIs
sobre la misma base: ver [Verificación](#verificación).

Cada `route.ts` es delgado: valida la entrada con zod, llama a una función de
[`src/server`](../src/server) y devuelve su resultado. Lo transversal vive en
[`http.ts`](../src/server/http.ts) — `handler()` aplica el límite de ráfagas, exige la sesión
cuando la ruta es de admin, serializa a JSON y traduce los errores — y en
[`view-handler.ts`](../src/server/analytics/view-handler.ts) para las vistas del panel.

### Públicos — la encuesta

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/survey/schema` | Catálogo completo: campaña, áreas (con su `procesoCode`), las 16 gestiones, los 7 cargos, 10 componentes con sus preguntas y opciones ya resueltas —las de área traen su gestión en `option.group`— y `settings.maxAreasInteraccion` (el `maxSelect` de la pregunta 1.2). Es lo que dirige el wizard. |
| `POST` | `/responses` | Abre un borrador y devuelve su `draftToken`. Limitado a 10/min por IP. |
| `GET` | `/responses/:draftToken` | Recupera un borrador para retomarlo. |
| `PATCH` | `/responses/:draftToken/step/:componentId` | Guarda un paso. Cuerpo: `{ answers, ownArea?, respondentRole? }`. Aplica las 8 reglas; devuelve **422** con `violations` por pregunta si alguna falla. |
| `POST` | `/responses/:draftToken/submit` | Cierra la respuesta. Valida completitud antes de marcar `COMPLETED`; si falta algo, **422** con `missing`. |

Cada respuesta de `answers`: `questionCode` (obligatorio) y, según el tipo de pregunta,
`targetArea`, `valueNumber` (entero 0–10), `valueOption`, `valueOptions` (≤32) o `valueText`
(≤2000). Propiedades desconocidas: **400** ([save-step.schema.ts](../src/server/responses/save-step.schema.ts)).

### Autenticación

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/auth/login` | Canjea `{ token }` por la cookie de sesión. **10/min** por IP además del rate limit respaldado en auditoría. `401` si el token no coincide, `429` con `retryAfterSeconds` al pasarse. |
| `POST` | `/auth/logout` | Limpia la cookie y audita la salida. |
| `GET` | `/auth/me` | Con sesión: `{ authenticated: true, role: 'admin' }`. |

Doble límite a propósito: el de ráfagas (en memoria de cada instancia) corta intentos rápidos,
y el contador respaldado en `admin_audit_log` corta la fuerza bruta sostenida — sobrevive a
los arranques en frío de serverless, que un contador en memoria no.

La comparación del token es de **tiempo constante** (`secretsMatch` en
[hash.util.ts](../src/server/common/utils/hash.util.ts)), para no filtrar el prefijo correcto por
diferencia de latencia.

### Panel — todos exigen sesión de admin

| Método | Ruta | Qué devuelve |
|---|---|---|
| `GET` | `/admin/overview` | Titulares: IMC, participación, totales |
| `GET` | `/admin/indicators` | Los 10 índices + IMC, con su banda de semaforización |
| `GET` | `/admin/components` | Promedios por componente |
| `GET` | `/admin/items` | Cada afirmación 0-10 por separado: promedio, índice, desviación, consenso, reparto de notas 0–10 y el índice al que alimenta |
| `GET` | `/admin/relationship-map` | Matriz área-evaluadora × área-evaluada |
| `GET` | `/admin/influence` | Quién mueve a quién (KPI 32), por área y por gestión, con cohorte por par |
| `GET` | `/admin/network` | La red declarada: demanda por área, menciones contra IREL, frecuencia, tipos, valor contra fortalecer, áreas aisladas |
| `GET` | `/admin/nps` | NPS interno con promotores / pasivos / detractores |
| `GET` | `/admin/indices-by-area` | Índices desglosados por área |
| `GET` | `/admin/indices-by-role` | Índices, IMC y NPS por cargo y por nivel, con cohorte por fila |
| `GET` | `/admin/qualitative` | Respuestas abiertas, agrupables por tema |
| `GET` | `/admin/areas/:code` | Detalle de un área |
| `GET` | `/admin/quality` | Calidad del corte: apresurados (< 300 s), línea recta, componentes planos, abiertas escritas. **Sin cohorte mínima** |
| `GET` | `/admin/monitoring` | Participación en vivo. Solo honra `campaignId`; **sin cohorte mínima** |
| `GET` | `/admin/responses` | Listado paginado (`page`, `pageSize` ≤ 200) |
| `GET` | `/admin/weights` | Pesos del IMC |
| `PUT` | `/admin/weights` | Actualiza los pesos — **auditado** |
| `PATCH` | `/admin/qualitative/answers/:id/theme` | Asigna tema a una respuesta abierta — **auditado** |
| `GET` | `/admin/export?format=csv\|xlsx` | Exportación completa por streaming — **auditada** |
| `GET` | `/admin/campaigns` | Lista de campañas |
| `POST` | `/admin/campaigns` | Crea una campaña — **auditado** |
| `PATCH` | `/admin/campaigns/:id/close` | Cierra la campaña y congela su corte — **auditado** |

**Filtros comunes**, todos opcionales ([analytics-filters.schema.ts](../src/server/analytics/dto/analytics-filters.schema.ts)):
`campaignId` (UUID), `ownArea`, `respondentRole` (uno de los 7 cargos), `frecuencia`
(`DIARIA` … `ESPORADICA`), `tipoInteraccion` (`OPERATIVA`, `TACTICA`, `ESTRATEGICA`,
`COMERCIAL`, `SOPORTE`), `from` y `to` (ISO 8601). Un parámetro desconocido responde 400.

**Toda respuesta analítica viene envuelta**: `{ data, meta: { n, insufficient, minCohortSize,
generatedAt } }`, con `data: null` cuando el corte no alcanza `MIN_COHORT_SIZE`. Las dos
excepciones son `/admin/monitoring` y `/admin/quality`, que devuelven siempre
`insufficient: false`: describen *que* y *cómo* se respondió, nunca *qué*.

**La forma de los errores es contrato.** Con un mensaje: `{ statusCode, message, error }`; con
detalle: el objeto tal cual (`{ message, violations }`, `{ message, missing }`,
`{ statusCode, message, retryAfterSeconds }`). El front lee esas llaves. Un error no
controlado responde 500 con un mensaje genérico y se registra en el log de Vercel; el detalle
nunca llega al cliente.

### Tres decisiones que explican la forma del código

**Los indicadores son funciones puras.** Reciben filas crudas (`RawAnswerRow[]`) y devuelven un
número. No conocen Prisma, ni la regla de cohorte, ni los umbrales
([indicator.types.ts](../src/server/analytics/indicators/indicator.types.ts)). Por eso las
fórmulas se validan sin base de datos.

**La regla de cohorte mínima vive en el orquestador, no en los indicadores.**
[`applyCohort`](../src/server/analytics/cohort.util.ts) envuelve toda respuesta analítica y vacía
`data` cuando el corte no llega a `MIN_COHORT_SIZE`. Centralizarla ahí garantiza que ninguna
ruta pueda olvidarse de aplicarla.

**La validación lee del catálogo, no de constantes.** Las 8 reglas de
[`rules/`](../src/server/responses/rules/) resuelven tipo, límites y opciones desde la base, así
que **añadir una pregunta al instrumento no obliga a tocar código de validación**.

---

## Modelo de datos

11 tablas ([`prisma/schema.prisma`](../prisma/schema.prisma)):

**Catálogo** — `areas`, `procesos`, `components`, `questions`, `question_options`
**Campañas** — `campaigns`
**Respuestas** — `survey_responses`, `answers`
**Configuración** — `indicator_weights`, `indicator_thresholds`
**Auditoría** — `admin_audit_log`

Cuatro detalles que no son obvios:

**`procesos` son las gestiones y `areas` son los subprocesos, que cuelgan de ellas** vía
`areas.proceso_code`. El encuestado selecciona siempre subprocesos; la gestión es la
agrupación con la que se le presentan.

**`answers.target_area` usa el centinela `'__GLOBAL__'` en vez de `NULL`.** En PostgreSQL los
`NULL` no colisionan en índices únicos, así que una columna nullable dejaría pasar respuestas
duplicadas para la misma pregunta global.

**`option_source` (`STATIC` | `AREAS` | `PROCESOS`)** permite que las preguntas que el PDF
marca como "(Lista)" lean del catálogo vivo en vez de duplicarlo en `question_options`.

**Las IPs y los user agents se guardan hasheados** (`ip_hash`, `user_agent_hash`), nunca en
claro. La sal es `HASH_SALT`.

### Prisma 7 en Next

1. **La URL sale del schema.** El `datasource` solo lleva `provider`; la cadena del CLI vive
   en [`prisma.config.ts`](../prisma.config.ts) y la del runtime en
   [`src/server/db.ts`](../src/server/db.ts), con un driver adapter (`@prisma/adapter-pg`).
2. **El cliente se genera dentro de `src/server/generated` y no se versiona.** Lo regeneran
   `npm install` (`postinstall`) y `npm run build`, que es lo que corre Vercel.
3. **Una sola instancia por proceso**, creada en la primera consulta y no al importar: así
   `next build` carga los route handlers sin base de datos, y `next dev` no abre un pool nuevo
   en cada recarga en caliente.

### TypeScript 6, no 7

`typescript@7.0.2` es el compilador nativo en Go y se publicó **sin API programática**, así que
no funcionan las reglas type-aware de ESLint ni las herramientas que compilan con
`createProgram`. Se queda en `6.0.3`; revisar cuando salga TS 7.1 con su nueva API.

---

## Tests

247 tests en 17 suites, **sin base de datos ni navegador** — corren en menos de un segundo con
Vitest:

| Suite | Tests | Qué cubre |
|---|---|---|
| `analytics/indicators/indicators.spec.ts` | 41 | Las fórmulas de los indicadores, **con cada valor esperado calculado a mano** en un comentario junto al test |
| `responses/rules/rules.spec.ts` | 39 | Las 8 reglas de validación del instrumento |
| `prisma/catalog.spec.ts` | 23 | La transcripción del PDF y el organigrama: 16 gestiones, 53 subprocesos, en su orden |
| `analytics/kpis/monitoring.spec.ts` | 22 | El monitoreo: cortes por día y hora de Bogotá, embudo, abandono, tramos de duración |
| `analytics/kpis/kpis.spec.ts` | 19 | Distribuciones y mapa de relacionamiento |
| `analytics/kpis/items.spec.ts` | 13 | Cada ítem 0-10: media, desviación, consenso, reparto de notas |
| `prisma/simulacion.spec.ts` | 13 | Las respuestas simuladas: pasan las reglas, son reproducibles, alcanzan la cohorte |
| `auth/auth.service.spec.ts` | 13 | Login por token (tiempo constante, rate limit), JWT real firmado y validado, cookie |
| `export/csv-cell.util.spec.ts` | 12 | Neutralización de fórmulas en las exportaciones |
| `analytics/kpis/influence.spec.ts` | 11 | Influencias entre áreas: fuerza 1-3, motricidad y dependencia |
| `analytics/kpis/network.spec.ts` | 9 | La red de interacción |
| `analytics/kpis/quality.spec.ts` | 7 | Calidad del corte |
| `analytics/cohort.util.spec.ts` | 7 | La regla de cohorte mínima |
| `analytics/kpis/roles.spec.ts` | 5 | Índices por cargo y por nivel |
| `survey/survey.service.spec.ts` | 5 | El catálogo público: opciones de área y gestión resueltas desde el catálogo vivo |
| `db.spec.ts` | 5 | La cadena de conexión: TLS exigido fuera de local, `sslmode` de la integración de Vercel |
| `prisma/migrations.spec.ts` | 3 | Toda tabla creada por las migraciones activa RLS (la API REST de Supabase no la ve) |

Las rutas de `src/server` son relativas a esa carpeta. El cálculo a mano en los tests de
indicadores es lo que sustituye a la validación contra datos reales: si una fórmula se rompe,
el test dice cuál era el número correcto y de dónde salía.

---

## Manejo de errores y anonimato

[`ApiError`](../src/lib/api.ts) expone dos casos que la interfaz trata distinto:

- **`isUnauthorized`** (401) — la sesión expiró o nunca existió: el llamador manda a `/login`.
- **`isValidationError`** (422) — violaciones de las reglas del instrumento, con detalle por
  pregunta para pintarlo junto al campo.

Cuando un corte no alcanza `MIN_COHORT_SIZE`, la API devuelve `data: null` con
`meta.insufficient: true` y el panel pinta
[`InsufficientData`](../src/components/charts/InsufficientData.tsx) — "datos insuficientes para
mostrar sin comprometer el anonimato" — en vez del dato. La regla se aplica en el servidor; el
front solo la representa.

---

## Este no es el Next.js de siempre

Next 16 trae cambios de ruptura respecto a versiones anteriores. Antes de escribir código,
consulte la guía correspondiente en `node_modules/next/dist/docs/` — lo indica
[`AGENTS.md`](../AGENTS.md), que `next dev` regenera automáticamente. Lo más visible aquí:

- `middleware.ts` → **`proxy.ts`**, exportando `proxy()` en vez de `middleware()`
- Tipos de ruta generados: `LayoutProps<'/'>`, `PageProps<…>` vía `next typegen`
- Tailwind CSS 4 con **configuración CSS-first**: no hay `tailwind.config.js`, los tokens
  viven en [`globals.css`](../src/app/globals.css) — y salen de la línea gráfica aprobada,
  según [`docs/MARCA.md`](MARCA.md)
- En Tailwind 4 los utilitarios viven en una capa, y **una regla sin capa les gana
  siempre**. La base del sistema va en `@layer base` y las piezas `.lk-*` en
  `@layer components`; una regla global nueva fuera de capa anularía los utilitarios

---

## Despliegue en Vercel

El paso a paso —proyecto, base, región, variables, migraciones, dominio propio y la lista de
verificación— está en [DESPLIEGUE.md](DESPLIEGUE.md). Lo que el código aporta a ese despliegue:

- **Pantallas y API comparten dominio**, así que la cookie de sesión es first-party sin
  rewrites, sin CORS y sin `COOKIE_DOMAIN`.
- **Las cabeceras de seguridad** de la API las pone [`next.config.ts`](../next.config.ts) sobre
  `/api/v1`.
- **La exportación declara `maxDuration = 60`** porque recorre toda la base por lotes; el resto
  de las rutas usa el límite por defecto.
- **La región** la fija [`vercel.json`](../vercel.json): `yul1`, junto a la base.
- **El build no necesita base de datos**: el cliente de Prisma se crea en la primera consulta.

---

## Verificación

```bash
npm run typecheck && npm run lint && npm test && npm run build
npx prisma validate
```

Estado al 9-oct-2026: los cinco pasan desde una instalación limpia (`npm ci`) — 247/247 tests en
17 suites, 15 pantallas, 28 rutas de API y el proxy —, y los tests y el build pasan también con
Node 24. Una prueba de extremo a extremo con el servidor corriendo sobre una base local (login,
las 16 rutas de lectura del panel, las dos exportaciones y una encuesta completa con sus
errores) dio 28 de 28. La comparación de la API contra la de NestJS, del 8-oct, está en el
[historial](../CHANGELOG.md#8-oct-2026-un-solo-proyecto-de-next-sin-backend-aparte).
