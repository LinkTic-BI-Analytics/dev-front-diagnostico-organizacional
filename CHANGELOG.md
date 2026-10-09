# Historial de cambios

Lo que cambió en el sistema y por qué, del más reciente al más antiguo. El estado vigente
—cómo arrancar, desplegar y verificar— está en el [README](README.md); el detalle técnico, en
[`docs/PROYECTO.md`](docs/PROYECTO.md).

---

## 9-oct-2026 (2): validación para Vercel y organización del repositorio

Se validó el proyecto como lo construye y despliega Vercel, y se ordenó el repositorio con la
estructura estándar de un proyecto Next.js.

**Lo que encontró la validación y cómo quedó:**

| Hallazgo | Resolución |
|---|---|
| **Las 12 tablas de Supabase sin RLS**, y los roles de su API REST (`anon`, `authenticated`) con permiso de leer y escribir todas. Con la clave pública del proyecto se podían descargar las respuestas crudas, saltándose la cohorte mínima. `Contexto.md` §5.3 exigía RLS | Migración [`0004_rls_sin_acceso_publico`](prisma/migrations/0004_rls_sin_acceso_publico/migration.sql): RLS sin políticas en todas las tablas y privilegios retirados. Probada sobre una réplica local con los roles de Supabase: los dos roles quedan bloqueados y la app sigue funcionando. **Pendiente de aplicar en producción** (`npm run prisma:deploy`) |
| **Next 16.3.0 con vulnerabilidades críticas** (ejecución remota de código en la optimización de imágenes, SSRF, envenenamiento de caché) | Actualizado al parche **16.3.8**, junto con `eslint-config-next` y `@next/env` |
| **Las funciones corrían en Washington (`iad1`) y la base está en Montreal** (`ca-central-1`): cada consulta cruzaba entre ciudades | `vercel.json` fija la región **`yul1`** (Montreal), la misma de la base |
| **Sin versión de Node declarada**; en local corre Node 26, en Vercel no existe | `engines.node = "24.x"`, la versión por defecto de Vercel. Tests y build verificados con Node 24.21 |
| Quedan avisos de la auditoría en el CLI de Prisma (`deepmerge-ts`, `mysql2`) y en `exceljs` → `uuid` | Aceptados: ninguno llega a las funciones desplegadas (verificado en sus trazas), `exceljs` no usa la parte vulnerable de `uuid`, y el arreglo de Prisma solo existe en la 8, todavía candidata |

**La organización:**

- El README quedó como entrada del proyecto; esta historia pasó a `CHANGELOG.md`.
- `Contexto.md` pasó a `docs/` y sus secciones de arquitectura (§2, §5.2, §5.3, §6 a §9) se
  actualizaron a lo que existe: un proyecto de Next, sin NestJS. Las funcionales no cambiaron,
  salvo dos datos que habían quedado viejos (el componente 5 tiene tres escalas; el nombre ya
  no se pide).
- Nueva guía de despliegue: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md), con dominio propio
  (DNS) y la lista de verificación antes de abrir la recolección.
- Los PDF fuente pasaron a `docs/fuentes/`; el script de limpieza, a
  `prisma/limpiar-datos-de-prueba.sql`, junto a la siembra que crea esos datos.
- La plantilla de variables se llama ahora `.env.example`, el nombre estándar.
- Las decisiones de producto y privacidad pasaron al manual técnico.

**Un incidente durante la validación.** Al preparar una base local de prueba, un comando
encadenado falló a medias y el seed del catálogo (`npm run prisma:seed`) **corrió contra la
base real**. La siembra simulada que venía después se detuvo sola (su guarda no escribe si ya
hay respuestas). Se verificó en modo solo lectura que no cambió ningún dato: las 69 encuestas y
sus 3.524 respuestas intactas, los pesos del IMC y las bandas con los mismos valores (nadie los
había editado: la auditoría no tiene cambios de pesos). Lo único distinto son los identificadores
internos de las opciones de pregunta y de las bandas, que el seed recrea y nada referencia.

**Verificación:** instalación limpia con `npm ci` (como Vercel), tipos, lint, 247 tests en 17
suites, build con Node 26 y con Node 24, y una prueba de extremo a extremo con el servidor
corriendo sobre una base local: login, las 16 rutas de lectura del panel, las dos exportaciones y una
encuesta completa con sus errores — 28 de 28. La función más grande pesa 8,3 MB (el límite de
Vercel es 250 MB).

---

## 9-oct-2026 (1): el proyecto sube a la carpeta principal

Con el backend retirado, la carpeta `dev-back` se eliminó (quedó en la Papelera de macOS como
`dev-back-retirado-2026-10-09`; su código sigue en GitHub) y **el contenido de `dev-front` —con
su `.git`— pasó a la carpeta principal**. Para git no cambió ninguna ruta: el repositorio
`dev-front-multivariable` siempre tuvo el proyecto en su raíz. Lo que cambió es que ahora la
especificación y los documentos viven junto al código.

- El README del proyecto pasó a [`docs/PROYECTO.md`](docs/PROYECTO.md); este sigue siendo el
  README principal.
- `npm run prisma:simulacion -- --reset` deja sus respaldos en la raíz, y `.gitignore` excluye
  `respaldo-*.json`: son respuestas de la encuesta y no deben llegar a GitHub.
- En Vercel no hay nada que cambiar: el Root Directory sigue siendo la raíz del repositorio.

---

## 8-oct-2026: un solo proyecto de Next, sin backend aparte

El sistema estaba partido en dos proyectos de Vercel: las pantallas en Next (`dev-front`) y una
API de NestJS (`dev-back`) a la que Next reenviaba `/api/v1/*` con un rewrite. **La API pasó a
vivir dentro de Next**, como route handlers, y `dev-back` deja de usarse. Un solo repositorio,
un solo despliegue, una sola configuración, y la base de Supabase conectada al proyecto en
Vercel.

**El contrato no cambió.** Las 30 rutas siguen en `/api/v1` con los mismos cuerpos, estados y
formas de error, así que **ninguna pantalla se tocó**: el cliente ya llamaba a `/api/v1` con
una ruta relativa. Se comprobó comparando las dos APIs lado a lado sobre la misma base (detalle al final de esta entrada): 112 comparaciones del panel
iguales, la encuesta completa y sus errores iguales, el CSV idéntico byte a byte.

**Dónde quedó cada cosa:**

| Antes (`dev-back`) | Ahora |
|---|---|
| `src/<módulo>/*.controller.ts` + módulos de Nest | `src/app/api/v1/**/route.ts` — un archivo por ruta |
| `src/<módulo>/*.service.ts` (clases con inyección) | `src/server/<módulo>/*.service.ts` (funciones) |
| `src/analytics/indicators`, `kpis`, `responses/rules`, `cohort.util.ts` | Los mismos archivos en `src/server/…`, **sin cambios** |
| DTOs con `class-validator` + `ValidationPipe` | Esquemas zod (`*.schema.ts`) + `parseBody`/`parseQuery` |
| `AdminGuard` + Passport | `handler(…, { admin: true })` y `session.ts` (`jose`) |
| Filtro de excepciones | `HttpError` + `errorResponse` en `src/server/http.ts`, misma forma |
| `ThrottlerModule` | Límite de ráfagas en `http.ts`, mismos topes |
| `helmet` | Cabeceras en `next.config.ts` sobre `/api/v1` |
| `prisma/` (schema, migraciones, seed, simulación) | `prisma/`, mismos scripts (`npm run prisma:*`) |
| Jest (236 tests) | Vitest (244 tests: los mismos más 8 de sesión y conexión) |

**Lo que mejoró de paso.** Los tres primeros se comprobaron contra el Supabase real o con la
API corriendo; los tres últimos los cubren el tipado y la revisión del código, no una prueba:

1. **La conexión a Supabase viaja cifrada.** La `DATABASE_URL` del backend no declaraba
   `sslmode` y `node-postgres` conectaba **en claro**: credenciales y respuestas cruzaban sin
   cifrar entre Vercel y Supabase. `src/server/db.ts` exige TLS contra cualquier host remoto.
2. **Funciona con la integración de Supabase en Vercel.** Sus cadenas traen `sslmode=require`,
   que `pg` 8.x rechazaba con «self-signed certificate». Ahora conectan, y si la base está
   conectada al proyecto no hay que declarar ninguna variable de base de datos.
3. **El proxy valida la sesión de verdad**: firma y vigencia del JWT, no solo que la cookie
   exista. Una cookie forjada ya no deja ver el cascarón del panel.
4. **Nueve variables menos** (de 21 a 12): sobran `API_ORIGIN`, `CORS_ORIGINS`,
   `COOKIE_DOMAIN`, `NEXT_PUBLIC_COOKIE_NAME`, `PORT` y `NODE_ENV`, y se retiraron las dos que
   nunca tuvieron efecto (`MAX_AREAS_INTERACCION`, `NPS_MOTIVOS_POR_AREA`).
   `settings.maxAreasInteraccion` sale ahora del catálogo y llega como número.
5. **Los pesos del IMC y las bandas** se cachean 60 s por instancia en vez de para siempre:
   con Fluid compute una instancia vive horas, y un cambio de pesos no llegaba a las demás.
6. **`PUT /admin/weights` valida su cuerpo** (antes, uno sin `weights` daba 500) y los
   parámetros inválidos de ruta responden 400 o 404 en vez de 500.

**Lo único que cambia hacia afuera:** los 400 de validación traen el mensaje en español y en un
solo texto (antes, una lista en inglés de `class-validator`). Ninguna pantalla los muestra.

**Pasos para desplegarlo**, en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md):
conectar la base al proyecto de Vercel del front, declarar `ADMIN_ACCESS_TOKEN`, `JWT_SECRET` y
`HASH_SALT` **con los mismos valores del backend** (conserva las sesiones abiertas y el rate
limit en curso) y desplegar. Después se puede retirar el proyecto de Vercel del backend y
archivar su repositorio.

**`Contexto.md` quedó describiendo NestJS** en §2 (estructura), §6 (backend), §8 (variables) y
§9 (despliegue); ese día no se editó y las diferencias se inventariaron aparte. Se actualizó el
9-oct-2026 (ver esa entrada). Lo funcional —instrumento, fórmulas, KPIs, cohorte— no cambió.

**Cómo se verificó.** Se comparó **la API vieja contra la nueva, lado a lado**, sobre una base local
desechable (`prisma dev`) migrada, sembrada y con las 68 respuestas simuladas:

- **Las 13 vistas del panel** con siete combinaciones de filtros cada una, 13 fichas de área,
  el listado paginado en cuatro variantes, pesos, campañas, sesión y el catálogo de la
  encuesta: **112 comparaciones, todas iguales** salvo `settings.maxAreasInteraccion`, que
  ahora llega como número (`5`) y antes como texto (`"5"`).
- **Una encuesta completa por HTTP** —borrador, los 10 componentes, borrador recuperado, envío,
  reenvío, paso tras el envío— y **los errores del instrumento** (422 por reglas, 400 por
  pregunta ajena o área inexistente, 404 por componente, 422 por envío incompleto): 12 de 12
  iguales.
- **La exportación**: CSV idéntico byte a byte; XLSX con las mismas celdas.
- **Los errores HTTP**: mismos estados en los 16 casos probados. Los 400 de validación cambian
  de texto (ahora en español y en un solo `message`).
- **La sesión**: un JWT emitido por NestJS lo acepta la API nueva y al revés.

Y contra el Supabase real, **solo lecturas**: la conexión con la cadena actual y con la que
inyecta la integración de Vercel, y el catálogo servido por `next dev`.

---

## 5-oct-2026 (6): la base se resembró con 68 respuestas, 15 de ellas incompletas

Para que ningún dato arrastrara las dos preguntas retiradas del componente 5, la base se
vació otra vez y se resembró con el generador ya ajustado. Las 48 encuestas que había (las 46
simuladas y 2 borradores abiertos en esos minutos) quedaron respaldadas en
`respaldo-respuestas-2026-10-05T21-36-46-425Z.json`, en esta carpeta.

El corte nuevo tiene **68 encuestas: 53 completas y 15 incompletas**. Las incompletas son
borradores abandonados en distintos componentes —dos que solo abrieron la encuesta, y la
mayoría en el 1 y el 2—, cada uno con solo lo que habría guardado hasta ahí. Así el monitoreo
tiene embudo de abandono, y la tasa de finalización deja de ser un 100 % artificial.

Verificado contra la base y la API local: 53 completas y 15 borradores (13 con
identificación, 2 sin ella), ninguna respuesta a preguntas retiradas, finalización del
**77,9 %** (53 de 68), mediana de 11,5 minutos, IMC **62,89** («Aceptable»), y el embudo baja
de 66 encuestas en el componente 1 a 53 enviadas.

---

## 5-oct-2026 (5): el componente 5 pasa de cinco preguntas a tres

LinkTIC decidió retirar dos preguntas de **Agilidad organizacional**: la del ANS («Cuando
realiza solicitudes, ¿la respuesta que normalmente recibe cumple el ANS?») y la escala
«Capacidad de respuesta». El instrumento queda en **44 preguntas** y el componente 5 en tres
escalas: cumplimiento de tiempos, facilidad para resolver solicitudes y seguimiento.

| Qué | Antes | Ahora |
|---|---|---|
| Encuesta, componente 5 | 1 pregunta de ANS + 4 escalas | 3 escalas |
| Índice de Agilidad (IAG) | 0,75 × (4 escalas × 10) + 0,25 × cumplimiento del ANS | Promedio de las 3 escalas × 10, como los demás índices de escala |
| Panel, vista Componentes | Tarjeta «Cumplimiento del ANS» (KPI 13) | Retirada; la red de innovación ocupa el ancho completo |
| Metodología | Fórmula del IAG con el ANS | Fórmula nueva |

El IAG ya no tiene archivo propio: con la fórmula nueva es un índice de promedio simple y vive
con los demás en `simple-indices.ts`. Se retiraron también la puntuación de las opciones del
ANS (`RESPONSE_TIME_SCORES`), la distribución del KPI 13 y su conclusión en el front. El KPI
13 conserva su número en `Contexto.md` (§4.5), marcado como retirado, para no renumerar los
que lo siguen.

**Las dos preguntas se desactivan, no se borran** de la tabla `questions`, como hace el seed
con toda pregunta que sale del catálogo. En la base se borraron las 92 respuestas simuladas a
ellas (46 de cada una), para que la exportación no las arrastre. Poco después la base se
resembró entera con el generador ajustado: ver el cambio (6).

Verificado con la API local: el componente 5 llega con sus tres escalas, `/admin/components`
ya no trae `responseTimes`, y el IAG da **58,99** («En riesgo») sobre 138 observaciones —el
mismo valor que el promedio de las tres escalas calculado directamente en la base—. El IMC
pasa de 63,93 a 63,79.

---

## 5-oct-2026 (4): la nueva distribución de gestiones y subprocesos

LinkTIC reorganizó cómo se agrupan sus procesos, y el catálogo del instrumento pasó de **12
gestiones y 24 subprocesos a 16 gestiones y 53 subprocesos** (`Contexto.md` §3.1). Como el
wizard y el panel se arman desde el catálogo, el cambio vive en un solo archivo,
[`prisma/catalog.ts`](prisma/catalog.ts), que ahora declara el organigrama
como árbol: leerlo es leer el documento de LinkTIC.

| Antes (14-sep) | Ahora (5-oct) |
|---|---|
| 12 gestiones con nombre «Gestión de …» | 16 gestiones con el nombre del documento: Talento humano, La Fábrica, Jurídica… |
| 24 subprocesos | 53 subprocesos; Talento humano sola tiene 9 |
| Matriz de 24 × 24 (552 parejas) | Matriz de 53 × 53 (2.756 parejas): el corte útil es por gestión |

Los nombres siguen el documento con mayúscula solo inicial y las erratas corregidas
(«Bussiness», «Estrátegia», «Juridíca», «Seguirdad»…). Los códigos nuevos se eligieron para que
una gestión y un subproceso compartan código solo cuando comparten nombre (`COMERCIAL`,
`FINANCIERA`, `PREVENTA`); un test lo vigila, porque el panel traduce los dos con un mismo
diccionario.

**La base se reinició con 46 respuestas simuladas.** Las 47 que había (21 completas y 26
borradores) se respaldaron en `respaldo-respuestas-2026-10-05T21-15-55-708Z.json`, en esta
carpeta, y se borraron. Sin respuestas que las referenciaran, también se eliminaron de la base
las 14 áreas y 7 gestiones del organigrama anterior. Las 46 nuevas las genera un script
reproducible, `npm run prisma:simulacion` (detalle en
[`docs/PROYECTO.md`](docs/PROYECTO.md#respuestas-simuladas)), y cada una pasa por las mismas
reglas que aplica la API. **Ninguna es de una persona real**: hay que borrarlas antes de abrir
la recolección, con [`prisma/limpiar-datos-de-prueba.sql`](prisma/limpiar-datos-de-prueba.sql).

Verificado contra la base, con la API local: `GET /survey/schema` trae 16 gestiones, 53 áreas
evaluables y la pregunta 1.1 agrupada en las 16; `/admin/overview` da IMC 63.93 («Aceptable»)
con 46 de 46 completadas; el mapa muestra 2 parejas por encima de la cohorte (Desarrollo de
software → QA y → PMO) y oculta 140; la vista de calidad detecta las 2 encuestas a la carrera y
la de línea recta que la simulación siembra a propósito.

De paso, el aviso del mapa de relacionamiento que decía «24 subprocesos, 552 parejas» calcula
ahora las cifras desde el catálogo, para que no envejezca con el próximo organigrama.

---

## 5-oct-2026 (3): influencias en el mapa de relacionamiento

El mapa de relacionamiento suma la vista de **influencias** de la línea gráfica de referencia
(`/empresa/influencias` de Prospectiva LinkTIC), con áreas en lugar de factores: **quién mueve a
quién**. Si la gente de A evalúa a B, depende de lo que B le entrega, así que B mueve a A. Es el
**KPI 32** (`Contexto.md` §4.5) y vive en `/admin/mapa`, debajo de los aspectos, con tres
pestañas:

| Pestaña | Forma |
|---|---|
| **Red** | Tres capas —motrices, de enlace, dependientes (con las autónomas aparte)— unidas por curvas cuyo grosor es la fuerza. Pasar por un nodo enciende sus relaciones; un clic lo fija y abre la ficha. «Solo relaciones fuertes» y «Resaltar las que están bajo lo aceptable» (con el IREL del par) |
| **Matriz** | Cada fila mueve a las columnas, fuerza 1-3; motricidad y dependencia en los márgenes; borde rojo en las relaciones calificadas bajo lo aceptable |
| **Motricidad y dependencia** | El plano MICMAC cortado por las medias, con el punto pintado por el relacionamiento recibido |

Debajo, **Palancas** (motrices y de enlace, primero las peor calificadas) y **Síntomas**
(dependientes), y lo que la lectura no dice. Todo se lee por **área o por gestión**: con las
respuestas de hoy ninguna relación entre áreas alcanza la cohorte, así que la vista abre por
gestión y lo avisa.

Endpoint nuevo: `GET /admin/influence`. Las relaciones pasan por la cohorte par a par; la
motricidad y la dependencia suman también las ocultas, como el grado ponderado del KPI 10
(decisión a validar: el corte está en `AnalyticsService.getInfluence`).

De paso se corrigió un desborde horizontal en el teléfono: los textos para lector de pantalla
dentro de las tablas desplazables escapaban de su contenedor y ensanchaban la página.

---

## 5-oct-2026 (2): once KPIs nuevos y filtros globales

Con la línea gráfica en su lugar, el panel pasó a explotar lo que el instrumento ya recogía y
solo usaba promediado o no usaba. Son los **KPIs 21–31**, documentados en `Contexto.md` §4.5:

| Vista | Lo nuevo |
|---|---|
| **Preguntas** (`/admin/preguntas`, nueva) | Las 33 afirmaciones 0-10 una por una: reparto de notas por banda en barras Likert divergentes, neto, las 10 peores y mejores, y el plano nivel × consenso. Cada afirmación abre su histograma 0-10 |
| **Red de interacción** (`/admin/interaccion`, nueva) | Demanda por área (burbujas), áreas críticas (demandadas y por debajo en relacionamiento), frecuencia y tipo de interacción, valor contra «necesita fortalecer», áreas aisladas de la innovación |
| **Componentes** | Índices, IMC y NPS por cargo y por grupo (Dirección, Mandos medios, Equipos) y la brecha jerárquica |
| **Metodología** | Calidad del corte: encuestas a la carrera, en línea recta, componentes con una sola nota, respuestas abiertas |
| **Resumen ejecutivo** | «Lo que esconden los promedios»: las tres afirmaciones peor calificadas, la brecha jerárquica y las áreas críticas |

**Filtros globales.** Las vistas de análisis traen una fila de filtros —área de quien
responde, **cargo** (filtro nuevo en la API), frecuencia y tipo de interacción, fechas— que
acompaña al analista entre vistas durante la sesión. La cohorte mínima sigue aplicándose en el
servidor a cada corte filtrado.

Cuatro endpoints nuevos: `GET /admin/items`, `/admin/indices-by-role`, `/admin/network` y
`/admin/quality`. Los tres primeros pasan por la cohorte; `quality` no, porque describe cómo se
respondió y no qué.

---

## 5-oct-2026: la línea gráfica de las herramientas de análisis

El sistema adoptó la **línea gráfica aprobada por la organización** para sus herramientas de
análisis —la de *Prospectiva LinkTIC*—, porque va a ser el punto que centralice información
y la cruce con otros sistemas de recolección, y tiene que hablar su mismo idioma visual. Lo
que cambió, en orden de impacto:

1. **La estructura del panel.** Menú lateral navy colapsable con las 24 áreas agrupadas por
   gestión, buscador ⌘K, barra y cajón en móvil, migas de pan, portadas navy con retícula y
   tarjetas blancas. Cada tarjeta abre con la conclusión como título, trae su vista de tabla
   y pliega el método en «¿Cómo leer?».
2. **Monitoreo en vivo** (`/admin/respuestas`). Reemplaza el listado plano: se refresca cada
   15 s y muestra la curva acumulada de la recolección, el embudo de abandono por
   componente, la duración contra los 15 minutos prometidos, la cobertura por área en
   **burbujas empaquetadas**, los cargos que faltan y el calendario día × hora. Lo alimenta un
   endpoint nuevo, `GET /admin/monitoring`.
3. **Gráficas especializadas** en el resto del panel: el plano «da / recibe» cortado por
   medianas en el mapa, la nube de ideas en Cualitativo (con clasificación en bloque), los
   aspectos de cada área contra el promedio de la empresa y lo que cada índice le resta al
   IMC.
4. **Tres vistas nuevas**: Todas las áreas (`/admin/areas`), Metodología y datos
   (`/admin/metodologia`, con las fuentes y las llaves de cruce para las que vengan) y la
   ficha de área con portada.
5. **Tipografía Geist y solo tema claro**, como la referencia. Es la diferencia de fondo con
   el Manual de Marca, que fija Montserrat; el detalle y cómo revertirlo están en
   [`docs/MARCA.md`](docs/MARCA.md). El logotipo sigue exactamente el manual.

**Una decisión que conviene validar:** `/admin/monitoring` no pasa por la cohorte mínima,
porque cuenta *quién* respondió y no *qué*. Con menos de 4 encuestas completas muestra conteos
por área y cargo que el listado todavía oculta. Si la organización quiere que también eso
espere a la cohorte, el corte va en `AnalyticsService.getMonitoring`.

---

## 14-sep-2026: el árbol de procesos

LinkTIC confirmó el organigrama y eso reemplazó el catálogo plano de 7 áreas que se había
deducido del PDF. Lo que cambió, en orden de impacto:

1. **Las áreas son subprocesos y cuelgan de una gestión.** 12 gestiones, 24 subprocesos
   (`Contexto.md` §3.1). La jerarquía quedó invertida: antes un `proceso` colgaba de un
   `area`; ahora un `area` cuelga de un `proceso`. El encuestado selecciona siempre
   subprocesos, presentados agrupados por gestión.
2. **El área propia se adelanta a la identificación** y deja de ser la pregunta 1.1. Junto
   con el cargo —ahora una lista cerrada de siete niveles— es obligatoria.
3. **El nombre se retira**, y con él la columna `respondent_name` y la variable
   `SURVEY_REQUIRE_IDENTITY`.
4. **Nueva pregunta `c1_area_principal`**: cuál de las cinco áreas seleccionadas es la
   relación principal. Se marca con una estrella sobre la misma lista.
5. **Las respuestas anteriores se borraron** en la migración `0002_arbol_de_procesos`: sus
   `target_area` apuntaban a códigos que el árbol nuevo no conserva. Respaldo en
   `respaldo-pre-recoleccion-2026-08-14.json`.

**Pendiente de decidir:** con 24 áreas la matriz tiene 552 pares y el mínimo de cohorte de 4
suprimirá casi todas las celdas salvo con participación muy alta. Los cortes útiles pasarán a
ser por gestión antes que por par de subprocesos.

---

## 14-sep-2026: el panel se reestructuró

El panel pasó de cinco vistas de gráficos a **seis vistas que concluyen**. Lo nuevo es el
**Dashboard**, que es ahora la portada (`/admin`) y cuenta el diagnóstico completo de
arriba abajo para alguien que tiene cinco minutos y una decisión que tomar. Lo que antes se
llamaba «Resumen» se convirtió en «Índices» (`/admin/indices`), enfocado en de dónde sale
cada cifra.

El cambio de fondo no es el dashboard sino que **cada bloque del panel abre con su
conclusión escrita**, calculada desde el mismo dato que pinta al lado. Las conclusiones
viven en un solo archivo, `src/lib/insights.ts`, y no se reparten por las
pantallas.

El detalle —qué vista es cada una, qué forma se eligió para cada dato y qué se verificó del
color— está en
[`docs/PROYECTO.md`](docs/PROYECTO.md#el-panel-la-línea-gráfica-de-las-herramientas-de-análisis).

### Tres correcciones que salieron de revisarlo

1. **La brecha de percepción estaba explicada al revés**, y lo estaba desde antes de este
   cambio. La brecha es `recibido − otorgado`: positiva significa que el área recibe
   mejores notas de las que reparte —es la exigente—, y el texto del panel decía lo
   contrario. Confirmado contra el test del backend (`buildPerceptionGap`: «recibe 9,
   otorga 5: brecha +40»).
2. **La red de innovación dibujaba aristas de un área consigo misma.** La pregunta 8.1 no
   lleva la regla de «no incluya su propia área» que sí tiene la 1.1, así que marcarse a
   uno mismo es válido y el backend lo agregaba tal cual. El panel ya no las pinta; la
   corrección de fondo —decidir si la pregunta debe aceptarlo— queda pendiente.
3. **Varias vistas mostraban códigos en crudo** (`CONTRATACION_PUBLICA`) donde debía ir el
   nombre del subproceso.

### Dos cosas del backend que quedan pendientes

- **`/admin/nps` devuelve los motivos con el código como etiqueta** (`COMUNICACION`),
  mientras que `/admin/qualitative` los devuelve bien (`Comunicación`). Por eso los motivos
  se muestran solo en Cualitativo.
- **La red de innovación admite el bucle sobre sí misma**, descrito arriba.

### Datos de prueba en la base

Hay **18 respuestas de prueba** en Supabase al 14-sep-2026: 3 de los ensayos previos y 15
sembradas para verificar el panel con dispersión real. **Ninguna es de una persona real.**
Para borrarlas antes de abrir la recolección:
[`prisma/limpiar-datos-de-prueba.sql`](prisma/limpiar-datos-de-prueba.sql).

---

## 14-sep-2026: los cuatro bloques de color

La encuesta se recorre ahora en cuatro bloques, cada uno con su color, y el tono tiñe la
pantalla entera —título, cinta, escala y botón— no solo la barra de progreso. El propósito
es doble: decir en qué parte va el encuestado sin que tenga que leer un número, y sostener
el recorrido hasta el final.

| Bloque | Componentes | Color |
|---|---|---|
| 1 · Relacionamiento | 1-2 | azul |
| 2 · Cómo funciona la empresa | 3-6 | teal |
| 3 · Cultura | 7-8 | verde |
| 4 · Qué debemos cambiar | 9-10 | ámbar |

**El orden del instrumento no cambia.** Los bloques agrupan componentes contiguos; no
reordenan ni alteran una sola pregunta, así que `Contexto.md` sigue mandando sin cambios.

El detalle —cómo está cableado el color, qué piezas sostienen el recorrido y qué queda
pendiente en el componente 10— está en
[`docs/PROYECTO.md`](docs/PROYECTO.md#los-cuatro-bloques-de-color).

El diseño se trabajó en un lienzo aparte, con los cuatro bloques uno al lado de otro:
`docs/diseno-encuesta/`.

---

---

## Verificaciones anteriores contra la base real (ago–sep 2026)

Se hicieron con la API de NestJS. Los números de la ronda 1 son los conciliados a mano y siguen
valiendo como prueba de las fórmulas, que no cambiaron.

**Verificado contra la base de datos real** (Supabase). Dos rondas, y conviene no
confundirlas:

*Ronda 1 — 13-ago-2026, con 5 respuestas de prueba:*

- `prisma migrate deploy` y `prisma db seed` aplicados.
- 5 encuestas completas enviadas de punta a punta: borrador → los 10 componentes → envío.
- Los valores de los indicadores **cuadraron con el cálculo manual**: IMC 70.67,
  NPS 9.09 (5 promotores − 4 detractores de 11 pares), IAG 72.5 = 0.75×70 + 0.25×80.
  Es la conciliación a mano que valida las fórmulas contra datos reales.
- La regla de cohorte suprimió las 11 celdas de la matriz (1 respuesta por par, mínimo 4).
- `proxy.ts` redirige `/admin` a `/login?next=/admin` sin sesión.

*Ronda 2 — 14-ago-2026, humo sobre la misma base, ya con 6 respuestas:*

- `GET /survey/schema` → 200, con los 10 componentes, las 46 preguntas y 8 áreas
  (7 evaluables más `OTRA`).
- `POST /auth/login` con token incorrecto → **401**; con el correcto → 200 y cookie
  `linktic_admin_session` emitida.
- `GET /admin/overview` con la cookie → 200 con datos reales: IMC **64.08** ("Aceptable"),
  NPS 7.69 (6 promotores, 2 pasivos, 5 detractores de 13 pares), 6 completadas de 9
  iniciadas, y `meta: { n: 6, insufficient: false, minCohortSize: 4 }`.

**Los números de las dos rondas no coinciden porque la base cambió** (5 → 6 respuestas), no
porque algo se rompiera. Los de la ronda 1 son los que están conciliados a mano; los de la
ronda 2 confirman que el sistema responde de punta a punta contra Supabase. Si necesita
volver a validar fórmulas contra datos reales, hay que repetir la conciliación con el corte
del momento.

*Ronda 3 — 14-sep-2026, el árbol de procesos contra la base real:*

- `GET /survey/schema` → 200 con el árbol nuevo: 10 componentes, 46 preguntas y 25 áreas
  (24 subprocesos más `OTRA`).
- **Una encuesta completa de punta a punta**, conducida por navegador sobre la base real:
  identificación → los 10 componentes → revisión → envío → `/gracias`. Incluye el
  componente 2 repetido por área y el 9 con el NPS por área.
- La regla 8 del instrumento («no incluya su propia área») rechazó correctamente el intento
  de marcar el área propia en 1.1, y dejó el paso bloqueado hasta corregirlo.

Esa respuesta es de prueba y está en la base. Conviene borrarla antes de abrir la
recolección real.
