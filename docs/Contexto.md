# Contexto del Proyecto — Sistema de Diagnóstico Organizacional LinkTIC

> Documento maestro de contexto del sistema: la especificación funcional y la arquitectura.
> Fuente funcional: [`fuentes/Diagnóstico Organizacional.pdf`](fuentes/) — *Instrumento de Diagnóstico Organizacional LinkTIC*.
> Última actualización: 2026-10-09 — la arquitectura (§1, §2, §5.2, §5.3, §6 a §9) describe el
> sistema actual: un solo proyecto de Next.js. Lo que cambió y cuándo: [`../CHANGELOG.md`](../CHANGELOG.md).

---

## 1. Resumen ejecutivo

Se construirá una aplicación web que digitaliza el **Instrumento de Diagnóstico Organizacional de LinkTIC**: una encuesta interna de percepción organizacional de 10 componentes, y un **panel de administración** que consolida resultados, indicadores y KPIs, incluyendo el **mapa de relacionamiento organizacional**.

| Aspecto | Definición |
|---|---|
| Aplicación | **Next.js 16** (App Router, TypeScript, React 19): pantallas y API REST (`/api/v1`) en un solo proyecto |
| Base de datos | **Supabase** (PostgreSQL gestionado), vía Prisma |
| Despliegue | **Vercel** (un proyecto, conectado al repositorio; funciones en Montreal, junto a la base) |
| Encuesta | Pública y anónima, en el **home** (`/`), seccionada por componentes (wizard) |
| Admin | Acceso por **token** parametrizado en las variables de entorno (token inicial `Admin123!@`) |
| Tiempo de diligenciamiento objetivo | ≤ 15 minutos |
| Idioma de la UI | Español (es-CO) |

### Objetivo del instrumento (textual del PDF)

> Comprender la forma en que interactúan las áreas de la organización, identificar fortalezas y oportunidades de mejora en la colaboración interna, y generar información estratégica para fortalecer la capacidad de respuesta, la integración de procesos y la cultura de servicio.

La información recopilada se usa **exclusivamente con fines de mejora organizacional y fortalecimiento institucional**. Este mensaje debe aparecer literal en la pantalla de bienvenida y en el pie de la encuesta.

---

## 2. Estructura de carpetas

Un solo repositorio (`github.com/fily666/dev-front-multivariable`) con un proyecto de Next.js
en la raíz. El detalle de `src/` está en [`PROYECTO.md`](PROYECTO.md#estructura).

```
Linktic_multivariable/
├── README.md · CHANGELOG.md
├── docs/
│   ├── Contexto.md                       # este documento
│   ├── PROYECTO.md · DESPLIEGUE.md · VARIABLES-DE-ENTORNO.md · MARCA.md
│   └── fuentes/                          # el PDF del instrumento y el Manual de Marca
├── prisma/
│   ├── schema.prisma · migrations/       # modelo de datos (§5)
│   ├── catalog.ts                        # el instrumento (§3) como datos
│   └── seed.ts · simulacion.ts · limpiar-datos-de-prueba.sql
├── src/
│   ├── app/
│   │   ├── page.tsx                      # HOME = encuesta (wizard)
│   │   ├── gracias/ · login/
│   │   ├── admin/                        # panel (§7.1)
│   │   └── api/v1/                       # la API (§6): un route.ts por ruta
│   ├── server/                           # lógica de servidor (§6.1)
│   ├── components/ · lib/                # interfaz y cliente de la API
│   └── proxy.ts                          # protege /admin/*
├── .env.example                          # plantilla de variables (§8)
└── next.config.ts · vercel.json · package.json
```

Hasta el 8-oct-2026 eran dos proyectos —`dev-front` (Next.js) y `dev-back` (NestJS 11)—; la API
pasó a Next sin cambiar su contrato.

---

## 3. Modelo funcional del instrumento

### 3.1 Catálogo de áreas

**Actualizado el 5-oct-2026 con la nueva distribución organizacional de LinkTIC.** Reemplaza
el organigrama del 14-sep-2026 (12 gestiones, 24 subprocesos), que a su vez había
reemplazado el catálogo plano de 7 áreas deducido del PDF. Las áreas son **subprocesos** y
están agrupadas por **gestión** (el proceso principal). Son **16 gestiones y 53
subprocesos**, todos evaluables, en el orden del documento de LinkTIC.

| Gestión (`procesos`) | Subprocesos (`areas`) |
|---|---|
| `TALENTO_HUMANO` Talento humano | `ATRACCION_TALENTO` Atracción de talento · `PEOPLE_ANALYTICS` People analytics · `APRENDIZAJE_DESARROLLO` Aprendizaje y desarrollo · `COMPENSACION_BENEFICIOS` Compensación y beneficios · `ADMINISTRACION_PERSONAL` Administración de personal · `BIENESTAR_CULTURA` Bienestar y cultura · `SST` Seguridad y salud en el trabajo · `RELACIONES_LABORALES` Relaciones laborales · `BUSINESS_PARTNER` Business partner |
| `SOSTENIBILIDAD_REPUTACION` Sostenibilidad y reputación corporativa | `RELACIONES_CORPORATIVAS` Relaciones corporativas · `COMUNICACION_INTERNA` Comunicación interna · `SOSTENIBILIDAD_RSE` Sostenibilidad y responsabilidad social empresarial |
| `COMERCIAL` Comercial | `COMERCIAL` Comercial |
| `LA_FABRICA` La Fábrica | `GOBIERNO_FABRICA` Gobierno de fábrica · `DATOS` Datos · `ARQUITECTURA_SOFTWARE` Arquitectura de software · `DESARROLLO_SOFTWARE` Desarrollo de software · `INFRAESTRUCTURA_FABRICA` Infraestructura · `QA` QA |
| `MARKETING` Marketing | `DISENO_GRAFICO` Diseño gráfico · `ESTRATEGIA_MARKETING_PROYECTOS` Estrategia de marketing para proyectos · `CONTENT_MARKETING` Content marketing · `DISENO_UX_UI` Diseño UX/UI y producto digital · `AUTOMATIZACION_BI` Automatización y BI · `FORMACION` Formación |
| `TECNOLOGIA` Tecnología | `SOPORTE` Soporte · `INFRAESTRUCTURA_ON_PREMISE` Infraestructura on-premise |
| `MEJORAMIENTO_CONTINUO` Mejoramiento continuo | `CALIDAD` Calidad |
| `ADMINISTRATIVO_COMPRAS` Administrativo y compras | `COMPRAS` Compras · `ADMINISTRATIVO` Administrativo · `TESORERIA` Tesorería |
| `CONTABLE_TRIBUTARIA` Contable y tributaria | `CONTABLE` Contable · `NOMINA` Nómina |
| `FINANCIERA` Financiera | `FINANCIERA` Financiera |
| `JURIDICA` Jurídica | `CONTRATACION_PUBLICA` Contratación pública · `LEGAL_PROYECTOS` Legal de proyectos · `ASUNTOS_CORPORATIVOS_COMPLIANCE` Asuntos corporativos y compliance · `ASUNTOS_ESTRATEGICOS` Asuntos estratégicos |
| `CIBERSEGURIDAD` Ciberseguridad y seguridad de la información | `SEGURIDAD_INFORMACION` Seguridad de la información · `SEGURIDAD_OFENSIVA` Seguridad ofensiva · `SOC` SOC |
| `PREVENTA` Preventa | `PREVENTA` Preventa |
| `PROYECTOS` Proyectos | `REQUERIMIENTOS` Requerimientos · `MESA_AYUDA` Mesa de ayuda · `ASEGURAMIENTO_PROYECTOS` Aseguramiento de proyectos |
| `COMUNICACIONES` Comunicaciones | `ESTRATEGIA_DIGITAL` Estrategia digital de LinkTIC · `VOZ_COMPARTIDA` Voz compartida · `GOBIERNO_COMPONENTE_POLITICO` Gobierno y componente político · `REALIZACION_AUDIOVISUAL` Realización audiovisual |
| `PLANEACION_ESTRATEGICA` Planeación estratégica | `GESTION_SERVICIOS` Gestión de servicios · `PMO` PMO · `AGILE` Agile · `GLOBAL_CAPACITY` Global capacity |

Los nombres son los del documento de LinkTIC con dos ajustes: mayúscula solo inicial, como el
resto del instrumento, y las erratas corregidas («Bussiness», «Estrátegia», «Digial»,
«Juridíca», «Seguirdad», «Infraestrucutra»). Una gestión y un subproceso comparten código
solo cuando también comparten nombre (`COMERCIAL`, `FINANCIERA`, `PREVENTA`): el panel
traduce los dos con un mismo diccionario.

**Decisión de diseño:** un `area` (subproceso) cuelga de un `proceso` (gestión), vía
`areas.proceso_code`. El encuestado **selecciona siempre subprocesos**; la gestión es solo el
encabezado con el que se le presentan, porque 53 opciones en una lista plana son ilegibles.
El mapa de relacionamiento sigue siendo una matriz cuadrada, ahora de 53 × 53.

`OTRA` deja de ofrecerse: el árbol es exhaustivo. La fila se conserva en la tabla `areas`
(no evaluable).

> **Consecuencia sobre la regla de cohorte.** Con 53 áreas, la matriz tiene 2.756 pares
> posibles y el mínimo de 4 respuestas por celda suprimirá casi todo salvo con una
> participación muy alta. Es una propiedad de los datos, no un fallo: los cortes útiles
> serán por gestión antes que por par de subprocesos.

### 3.2 Escalas y tipos de respuesta

| Tipo | Código | Uso |
|---|---|---|
| Selección única | `SINGLE` | Marque solo una opción |
| Selección múltiple | `MULTI` | Marque una o varias opciones, según la instrucción |
| Escala 0–10 | `SCALE_0_10` | 0 = polo desfavorable, 10 = polo favorable, con anclas propias de cada pregunta (ver §3.2.1) |
| Texto abierto | `TEXT` | Respuesta abierta |
| Matriz por área | `MATRIX_AREA` | Batería de aspectos 0–10 repetida por cada área seleccionada |

#### 3.2.1 Anclas de las escalas

**Actualizado el 1-oct-2026.** El PDF usa "muy deficiente / excelente" para todas las
escalas, y eso no se lee bien en la mitad de los ítems: "Cumplen los compromisos —
excelente" obliga a traducir una frecuencia a una nota, y en el NPS el 0 es "nada
probable", no "muy deficiente". Cada escala trae ahora sus propias anclas
(`questions.scale_min_label` / `scale_max_label`), que nombran el tema de la pregunta.

Reglas: el **10 es siempre el polo favorable** (los índices lo asumen), las anclas caben a
los extremos de la regla (máx. 28 caracteres) y el NPS conserva las anclas estándar. Las
anclas reemplazan al texto de ayuda "0 significa… y 10 significa…", que repetía lo mismo
en cada pregunta. La escala numérica y el cálculo de los índices no cambian.

| Código | Pregunta | 0 | 10 |
|---|---|---|---|
| `c2_facilidad` | Facilidad para trabajar | Muy difícil trabajar juntos | Muy fácil trabajar juntos |
| `c2_comunicacion` | Comunicación | Comunicación deficiente | Comunicación excelente |
| `c2_confianza` | Confianza | Ninguna confianza | Confianza total |
| `c2_cumplimiento` | Cumplimiento | Nunca cumplen | Siempre cumplen |
| `c2_valor` | Generación de valor | No aporta valor | Aporta mucho valor |
| `c3_oportunidad` | La información llega oportunamente | Nunca llega a tiempo | Siempre llega a tiempo |
| `c3_claridad` | La comunicación es clara | Comunicación confusa | Comunicación muy clara |
| `c3_comprension` | Comprendemos fácilmente los requerimientos | Cuesta mucho entenderlos | Se entienden fácilmente |
| `c3_canales` | Los canales funcionan adecuadamente | Funcionan muy mal | Funcionan muy bien |
| `c3_reproceso` | Se evita el reproceso por mala comunicación | Siempre hay reproceso | Nunca hay reproceso |
| `c4_disposicion` | Existe disposición para ayudar | Ninguna disposición | Total disposición |
| `c4_comprension` | Comprenden nuestras necesidades | No las comprenden | Las comprenden por completo |
| `c4_seguimiento` | Dan seguimiento a las solicitudes | Nunca dan seguimiento | Siempre dan seguimiento |
| `c4_compromisos` | Cumplen los compromisos | Nunca cumplen | Siempre cumplen |
| `c4_valor` | Agregan valor al proceso | No agregan valor | Agregan mucho valor |
| `c5_cumplimiento_tiempos` | Cumplimiento de tiempos | Nunca se cumplen | Siempre se cumplen |
| `c5_facilidad_resolver` | Facilidad para resolver solicitudes | Muy difícil resolverlas | Muy fácil resolverlas |
| `c5_seguimiento` | Seguimiento | Sin seguimiento | Seguimiento constante |
| `c6_impacto` | Conozco cómo mi proceso impacta otros procesos | No lo conozco | Lo conozco a fondo |
| `c6_roles` | Existe claridad en los roles | Roles nada claros | Roles totalmente claros |
| `c6_coordinacion` | Hay coordinación entre áreas | Sin coordinación | Coordinación excelente |
| `c6_reprocesos` | Se minimizan los reprocesos | Reprocesos constantes | Reprocesos mínimos |
| `c6_responsabilidades` | Las responsabilidades son claras | Nada claras | Totalmente claras |
| `c7_conocimiento` | Compartimos conocimiento | Nunca lo compartimos | Siempre lo compartimos |
| `c7_confianza` | Existe confianza | Ninguna confianza | Confianza plena |
| `c7_soluciones` | Buscamos soluciones conjuntamente | Cada uno por su lado | Siempre en conjunto |
| `c7_aprendizaje` | Hay apertura al aprendizaje | Ninguna apertura | Apertura total |
| `c7_objetivos` | Trabajamos por objetivos comunes | Objetivos desalineados | Objetivos alineados |
| `c8_disposicion` | Disposición para innovar | Ninguna disposición | Total disposición |
| `c8_apertura` | Apertura al cambio | Resistencia al cambio | Total apertura al cambio |
| `c8_capacidad_mejoras` | Capacidad para implementar mejoras | Capacidad muy baja | Capacidad muy alta |
| `c8_aprendizaje` | Aprendizaje compartido | Nunca se comparte | Siempre se comparte |
| `c9_nps` | ¿Qué tan probable es que recomiende trabajar con esta área? | Nada probable | Totalmente probable |

### 3.3 Componentes, preguntas e indicadores

Los `code` de pregunta son la clave estable usada en API, BD y front.

#### Paso 0 — Bienvenida e identificación

Campos del encabezado del PDF: **Nombre**, **Cargo**, **Área**, **Fecha**.

**Actualizado el 14-sep-2026.** El nombre se retira y el área se adelanta a este paso.

| Campo | Columna | Tipo | Obligatorio | Nota |
|---|---|---|---|---|
| Número de documento | `survey_responses.numero_documento` (solo mientras es borrador) | Texto, contra `colaboradores` | **Sí** | Añadido el 22-oct-2026. Debe estar en la nómina y no tener `ya_respondio`. Al enviar se marca `ya_respondio` y se borra de la respuesta |
| Área | `own_area` | Dos selectores: primero el proceso (gestión) y después el subproceso dentro de él | **Sí** | Era la pregunta 1.1; se pide antes de empezar porque condiciona todo lo que sigue. Se guarda solo el subproceso; si el proceso tiene uno solo, se marca solo (22-oct-2026) |
| Cargo | `respondent_role` | SINGLE (lista cerrada) | **Sí** | `DIRECTOR`, `GERENTE`, `HEAD`, `COORDINADOR`, `LIDER`, `PROFESIONAL`, `ANALISTA` |
| Nombre | — | — | — | **Se retira.** La columna `respondent_name` se elimina |
| Fecha | — | — | — | La fija el servidor (`submitted_at`) |

**Decisión de diseño:** la encuesta **sigue siendo anónima** — precisamente porque ya no se
pide el nombre. Área y cargo no identifican a una persona, y sin ellos no hay filas en el
mapa de relacionamiento ni cortes por nivel, así que pasan a ser obligatorios. El flag
`SURVEY_REQUIRE_IDENTITY` desaparece: ya no hay nada que hacer opcional.

El cargo se guarda como **código de una lista cerrada**, no como texto libre, para que los
cortes del panel no dependan de cómo lo escriba cada persona.

**Actualizado el 22-oct-2026: cada colaborador responde una sola vez.** La identificación
pide el número de documento y la API lo busca en `colaboradores` (la nómina: documento,
nombre, cargo, proceso y subproceso) al pulsar «Empezar»: si no está, o ya tiene
`ya_respondio`, no se abre el borrador. El documento se compara sin puntos, espacios ni
guiones y en mayúsculas. La encuesta **sigue siendo anónima**: el documento acompaña al
borrador solo hasta el envío, que marca `ya_respondio` —sin hora ni vínculo con la
respuesta— y lo borra de `survey_responses`.

---

#### Componente 1 — Caracterización del relacionamiento

*Este componente permitirá construir posteriormente el mapa de relacionamiento organizacional.*

| # | Código | Pregunta | Tipo | Reglas |
|---|---|---|---|---|
| — | — | ¿A qué área pertenece? | — | **Trasladada al paso 0.** Ya no se pregunta aquí |
| 1.1 | `c1_areas_interaccion` | ¿Con cuáles áreas interactúa de manera frecuente? | MULTI | **Máximo 5**, mínimo 1. Subprocesos, presentados agrupados por gestión. Excluye el área propia |
| 1.2 | `c1_area_principal` | ¿Con cuál de esas áreas se relaciona más? | SINGLE | Obligatoria. Solo admite una de las seleccionadas en 1.1. Se marca con una estrella sobre la misma lista, no en un bloque aparte |
| 1.3 | `c1_frecuencia` | Frecuencia de interacción | SINGLE | `DIARIA`, `VARIAS_SEMANA`, `SEMANAL`, `MENSUAL`, `ESPORADICA` |
| 1.4 | `c1_tipo_interaccion` | Tipo de interacción predominante | MULTI | `OPERATIVA`, `TACTICA`, `ESTRATEGICA`, `COMERCIAL`, `SOPORTE`. Mínimo 1 |

**Indicador:** `NIO` — Nivel de Interacción Organizacional.

> 1.1 es la **pregunta pivote** del instrumento: define el conjunto de áreas que se evalúan en el Componente 2 y en el NPS del Componente 9. El límite de 5 áreas es lo que mantiene la encuesta en 15 minutos.

---

#### Componente 2 — Red de colaboración

*Comprender cómo funciona LinkTIC permitirá fortalecer una red más colaborativa entre procesos.*
Se califica **para cada una de las áreas seleccionadas en 1.2**, escala 0–10.

| Aspecto | Código |
|---|---|
| Facilidad para trabajar | `c2_facilidad` |
| Comunicación | `c2_comunicacion` |
| Confianza | `c2_confianza` |
| Cumplimiento | `c2_cumplimiento` |
| Generación de valor | `c2_valor` |

Tipo: `MATRIX_AREA` (5 aspectos × hasta 5 áreas = máx. 25 valores).

**Indicadores:** `IREL` Índice de Relacionamiento · `ICONF` Índice de Confianza · `IVAL` Índice de Valor.

**Decisión de UX:** para no mostrar una matriz de 25 celdas, este componente se divide en **un sub-paso por área evaluada** (2 de 4, "Evaluando: Tecnología"), con 5 sliders/radios por pantalla y navegación entre áreas. Es el componente más costoso en tiempo y debe medirse en pruebas de usabilidad.

---

#### Componente 3 — Comunicación organizacional

*Evaluar la trazabilidad, claridad y oportunidad de la información dentro de la organización nos orienta sobre cómo potabilizar nuestros lenguajes y comunicación interna, consolidando una narrativa de alto valor.*
Escala 0–10, percepción **global** de la organización.

| Pregunta | Código |
|---|---|
| La información llega oportunamente | `c3_oportunidad` |
| La comunicación es clara | `c3_claridad` |
| Comprendemos fácilmente los requerimientos | `c3_comprension` |
| Los canales funcionan adecuadamente | `c3_canales` |
| Se evita el reproceso por mala comunicación | `c3_reproceso` |

**Indicador:** `ICOM` — Índice de Comunicación Organizacional.
> El PDF no nombra un indicador para este componente; se propone `ICOM` por simetría con los demás y porque alimenta el índice compuesto.

---

#### Componente 4 — Servicio interno

*Permite identificar qué tan eficientes somos en la gestión interna y en la atención de solicitudes entre áreas.*
Escala 0–10, percepción global.

| Pregunta | Código |
|---|---|
| Existe disposición para ayudar | `c4_disposicion` |
| Comprenden nuestras necesidades | `c4_comprension` |
| Dan seguimiento a las solicitudes | `c4_seguimiento` |
| Cumplen los compromisos | `c4_compromisos` |
| Agregan valor al proceso | `c4_valor` |

**Indicador:** `ISI` — Índice de Servicio Interno.

---

#### Componente 5 — Agilidad organizacional

*Como método de trabajo es importante saber cómo el equipo ha consolidado su capacidad de respuesta frente a solicitudes internas y necesidades de gestión.*

| # | Código | Pregunta | Tipo | Opciones |
|---|---|---|---|---|
| 5.1 | `c5_cumplimiento_tiempos` | Cumplimiento de tiempos | SCALE_0_10 | — |
| 5.2 | `c5_facilidad_resolver` | Facilidad para resolver solicitudes | SCALE_0_10 | — |
| 5.3 | `c5_seguimiento` | Seguimiento | SCALE_0_10 | — |

**Indicador:** `IAG` — Índice de Agilidad.

> **Actualizado el 5-oct-2026: el componente pasa de cinco preguntas a tres.** LinkTIC
> decidió retirar la pregunta del ANS (`c5_tiempo_respuesta`, «Cuando realiza solicitudes,
> ¿la respuesta que normalmente recibe cumple el ANS?») y la escala «Capacidad de respuesta»
> (`c5_capacidad_respuesta`). Es la única diferencia deliberada con el PDF en el número de
> preguntas. Las dos quedan inactivas en la tabla `questions` (no se borran, por la FK de
> respuestas ya recolectadas), dejan de pedirse en la encuesta y dejan de entrar en el `IAG`
> y en el panel. Con ellas sale también el KPI 13 (§4.5).
>
> *Historia:* el 1-oct-2026 la pregunta del ANS había reemplazado a una de tramos de horas
> (`MENOS_2H`…`MAS_3_DIAS`).

---

#### Componente 6 — Integración de procesos

*Orientación frente a la claridad de roles, responsabilidades y coordinación entre procesos.*
Escala 0–10.

| Pregunta | Código |
|---|---|
| Conozco cómo mi proceso impacta otros procesos | `c6_impacto` |
| Existe claridad en los roles | `c6_roles` |
| Hay coordinación entre áreas | `c6_coordinacion` |
| Se minimizan los reprocesos | `c6_reprocesos` |
| Las responsabilidades son claras | `c6_responsabilidades` |

**Indicador:** `IINT` — Índice de Integración.

---

#### Componente 7 — Cultura colaborativa

*Qué tipo de prácticas estamos construyendo en pro del trabajo conjunto, el aprendizaje compartido y la construcción de soluciones entre áreas.*
Escala 0–10.

| Pregunta | Código |
|---|---|
| Compartimos conocimiento | `c7_conocimiento` |
| Existe confianza | `c7_confianza` |
| Buscamos soluciones conjuntamente | `c7_soluciones` |
| Hay apertura al aprendizaje | `c7_aprendizaje` |
| Trabajamos por objetivos comunes | `c7_objetivos` |

**Indicador:** `ICOL` — Índice de Colaboración.

---

#### Componente 8 — Innovación organizacional

*Permite identificar la disposición para innovar, la apertura al cambio y la capacidad de implementar mejoras colaborativas.*

| # | Código | Pregunta | Tipo | Reglas |
|---|---|---|---|---|
| 8.1 | `c8_areas_iniciativas` | Áreas con las que ha desarrollado iniciativas nuevas en los últimos 6 meses | MULTI | Catálogo completo de áreas + `NINGUNA` (excluyente) |
| 8.2 | `c8_disposicion` | Disposición para innovar | SCALE_0_10 | — |
| 8.3 | `c8_apertura` | Apertura al cambio | SCALE_0_10 | — |
| 8.4 | `c8_capacidad_mejoras` | Capacidad para implementar mejoras | SCALE_0_10 | — |
| 8.5 | `c8_aprendizaje` | Aprendizaje compartido | SCALE_0_10 | — |

**Indicador:** `IINN` — Índice de Innovación Colaborativa.
> En el PDF, las opciones de 8.1 aparecen como "□ …" sin listar. Se resuelve usando el catálogo completo de áreas más la opción `NINGUNA`. **Confirmar con el área solicitante.**

---

#### Componente 9 — Experiencia de servicio interno (NPS)

*Mide la experiencia de servicio entre áreas mediante el NPS interno.*

| # | Código | Pregunta | Tipo | Reglas |
|---|---|---|---|---|
| 9.1 | `c9_nps` | En una escala de 0 a 10, ¿qué tan probable es que recomiende trabajar con el área evaluada? | SCALE_0_10 | **Por cada área** seleccionada en 1.2 |
| 9.2 | `c9_motivos` | ¿Por qué dio esa calificación? | MULTI | `COMUNICACION`, `SERVICIO`, `RAPIDEZ`, `CONOCIMIENTO`, `ACTITUD`, `COMPROMISO`, `OTRO` (texto) |

**Indicador:** `NPS_INT` — NPS Interno (global y por área).

**Decisión de diseño:** el PDF dice "el área evaluada", en singular, heredando el contexto del Componente 2. Se implementa **una calificación NPS por área evaluada** (misma lista de 1.2), presentada en una sola pantalla compacta (una fila por área) para no repetir el patrón sub-paso del Componente 2. Los motivos (9.2) se piden **una sola vez, a nivel global**, para no multiplicar la carga; si el negocio requiere motivos por área, se habilita con el flag `NPS_MOTIVOS_POR_AREA`.

---

#### Componente 10 — Oportunidades de transformación

*Permite identificar barreras, oportunidades y prioridades de mejora para fortalecer el trabajo entre áreas.*

| Código | Pregunta | Tipo | Opciones |
|---|---|---|---|
| `c10_obstaculo` | ¿Cuál considera que hoy es el mayor obstáculo para trabajar entre áreas? | MULTI | `COMUNICACION`, `PROCESOS`, `TECNOLOGIA`, `ROLES`, `LIDERAZGO`, `PLANEACION`, `PRIORIDADES`, `CULTURA` |
| `c10_proceso_reprocesos` | ¿Qué proceso genera más reprocesos? | SINGLE (lista) | Catálogo `procesos` = las 16 gestiones + `OTRO` |
| `c10_area_mayor_valor` | ¿Qué área genera mayor valor para LinkTIC? | SINGLE (lista) | Catálogo de áreas |
| `c10_area_fortalecer` | ¿Qué área necesita fortalecer su relacionamiento? | SINGLE (lista) | Catálogo de áreas |
| `c10_cambio_unico` | Si pudiera cambiar una sola cosa de LinkTIC para mejorar el trabajo entre áreas, ¿cuál sería? | TEXT | Máx. 1000 caracteres |

> El PDF marca tres preguntas como "(Lista)" sin definir el contenido. Áreas → catálogo de subprocesos. Procesos → catálogo `procesos`, que desde el 5-oct-2026 son **las 16 gestiones de la distribución de LinkTIC** (§3.1). Deja de ser un supuesto.

---

#### Paso final — Cierre

Texto literal del PDF:

> Gracias por su participación. Su experiencia es fundamental para comprender cómo trabajamos como organización. La información recopilada permitirá identificar oportunidades de mejora, fortalecer la colaboración entre áreas y orientar decisiones estratégicas que contribuyan a una LinkTIC más ágil, integrada y centrada en la generación de valor.

---

## 4. Indicadores y KPIs

### 4.1 Normalización

- Todos los ítems de escala son 0–10.
- Índice de un componente = **promedio de sus ítems**, normalizado a 0–100: `indice = (Σ items / n) × 10`.
- Se ignoran los nulos en el promedio (no se imputa 0). Si un encuestado no respondió ningún ítem del componente, no aporta a ese índice.
- Presentación: entero sin decimales en las tarjetas, un decimal en tablas.

### 4.2 Semaforización (aplica a todos los índices 0–100)

| Rango | Etiqueta | Color |
|---|---|---|
| 80–100 | Fortaleza | verde |
| 60–79 | Aceptable | ámbar |
| 40–59 | En riesgo | naranja |
| 0–39 | Crítico | rojo |

Umbrales configurables en tabla `indicator_thresholds` (no hardcodeados en el front).

### 4.3 Fórmulas por indicador

| Código | Nombre | Fórmula |
|---|---|---|
| `NIO` | Nivel de Interacción Organizacional | `0.50 × F + 0.30 × A + 0.20 × D`, donde `F` = score de frecuencia (`DIARIA`=100, `VARIAS_SEMANA`=80, `SEMANAL`=60, `MENSUAL`=40, `ESPORADICA`=20), `A` = amplitud = `min(n_áreas/5, 1) × 100`, `D` = diversidad = `(n_tipos_interacción / 5) × 100` |
| `IREL` | Índice de Relacionamiento | promedio de los 5 aspectos del C2 (facilidad, comunicación, confianza, cumplimiento, valor) × 10 |
| `ICONF` | Índice de Confianza | promedio de `c2_confianza` × 10 |
| `IVAL` | Índice de Valor | promedio de `c2_valor` × 10 |
| `ICOM` | Índice de Comunicación | promedio de los 5 ítems del C3 × 10 |
| `ISI` | Índice de Servicio Interno | promedio de los 5 ítems del C4 × 10 |
| `IAG` | Índice de Agilidad | `promedio de los 3 ítems 0–10 del C5 × 10`. Desde el 5-oct-2026; antes era `0.75 × (4 ítems × 10) + 0.25 × T`, con `T` el score del cumplimiento del ANS, y la pregunta del ANS se retiró del instrumento |
| `IINT` | Índice de Integración | promedio de los 5 ítems del C6 × 10 |
| `ICOL` | Índice de Colaboración | promedio de los 5 ítems del C7 × 10 |
| `IINN` | Índice de Innovación Colaborativa | `0.80 × (promedio de los 4 ítems 0–10 del C8 × 10) + 0.20 × R`, donde `R` = ratio de colaboración externa = `min(n_áreas_iniciativas / 3, 1) × 100` |
| `NPS_INT` | NPS Interno | `(%promotores − %detractores)`, rango −100 a +100. Promotores 9–10, pasivos 7–8, detractores 0–6. Unidad de conteo: **cada par (encuestado, área evaluada)** |

### 4.4 Índice compuesto

**`IMC` — Índice de Madurez Colaborativa** (KPI titular del dashboard):

```
IMC = 0.20·IREL + 0.15·ICOM + 0.15·ISI + 0.15·IAG
    + 0.15·IINT + 0.10·ICOL + 0.10·IINN
```

Pesos almacenados en `indicator_weights` y editables desde el admin (deben sumar 1.0; se valida en el servidor). `NIO` y `NPS_INT` se reportan por separado: `NIO` describe intensidad de interacción (no calidad) y `NPS_INT` tiene otra escala (−100..100), por lo que mezclarlos distorsionaría el compuesto.

### 4.5 KPIs del panel de administración

**Fila superior (tarjetas):**

1. **IMC** — Índice de Madurez Colaborativa (0–100) + delta vs. corte anterior.
2. **NPS Interno** — global (−100..+100) con desglose promotores/pasivos/detractores.
3. **Tasa de participación** — `respuestas completas / población invitada` (población configurable por área en `areas.headcount`).
4. **Tasa de finalización** — `completas / (completas + borradores iniciados)`.
5. **Tiempo mediano de diligenciamiento** — validación del objetivo de 15 min.
6. **Área con mayor generación de valor percibida** — moda de `c10_area_mayor_valor`.

**Analíticos:**

7. **Radar de los 8 índices** — perfil organizacional en una vista.
8. **Ranking de áreas por `IREL`** — mejor y peor evaluadas (top/bottom 3).
9. **Heatmap `área evaluadora × área evaluada`** — celda = `IREL` promedio; base del mapa de relacionamiento.
10. **Mapa de relacionamiento (grafo dirigido)** — nodos = áreas (tamaño = grado ponderado); aristas = interacción declarada en 1.2 (grosor = nº de menciones × score de frecuencia; color = `IREL` de la relación).
11. **Brecha de percepción por área** — `IREL` que un área *recibe* de otras vs. `IREL` que esa área *otorga*. Detecta áreas que se perciben mejor de lo que las perciben.
12. **Matriz de aspectos del C2** — los 5 aspectos por área, para ver si un área falla en comunicación o en cumplimiento.
13. ~~**Distribución de tiempos de respuesta (5.1)**~~ — **retirado el 5-oct-2026** junto con la pregunta del ANS. Se conserva el número para no renumerar los KPIs que lo siguen.
14. **Top de barreras (`c10_obstaculo`)** — barras horizontales por frecuencia, con desglose por área.
15. **Top de procesos generadores de reproceso** — cruzado con `IINT` del área dueña.
16. **Áreas que requieren fortalecer relacionamiento** — moda de `c10_area_fortalecer` cruzada con su `IREL` recibido.
17. **Red de innovación (8.1)** — grafo de iniciativas conjuntas; identifica áreas aisladas de la innovación.
18. **Motivos del NPS (9.2)** — distribución separada entre promotores y detractores.
19. **Nube/lista de temas de `c10_cambio_unico`** — agrupación manual por tema desde el admin (campo `theme` editable), sin clasificación automática.
20. **Índices por área de origen (1.1)** — tabla cruzada de los 8 índices, para ver si la percepción crítica se concentra en un área.

**Agregados el 5-oct-2026 (KPIs 21–31).** Salen de datos que el instrumento ya recoge y que
los 20 KPIs anteriores solo usaban promediados o no usaban:

21. **Distribución de cada afirmación** — las 33 escalas 0–10 de los componentes 2 a 8, cada nota
    llevada a la escala de los índices (nota × 10) y repartida en las bandas del semáforo. Barras
    Likert divergentes: bandas bajas a la izquierda del cero, altas a la derecha.
22. **Neto por afirmación** — `% en bandas altas − % en bandas bajas` (−100..+100), y las 10
    afirmaciones peor y mejor calificadas.
23. **Consenso por afirmación** — `100 × (1 − σ / 5)` sobre la escala 0–10 (σ = desviación
    estándar poblacional; 5 es el máximo posible). Plano nivel × consenso: bajo y compartido es
    problema de sistema; bajo y dividido, problema localizado.
24. **Índices por nivel de cargo** — los 10 índices, el IMC y el NPS por cargo y por grupo:
    Dirección (`DIRECTOR`, `GERENTE`, `HEAD`), Mandos medios (`COORDINADOR`, `LIDER`) y Equipos
    (`PROFESIONAL`, `ANALISTA`). Cohorte mínima por fila.
25. **Brecha jerárquica** — índice de Dirección − índice de Equipos, índice por índice.
26. **Demanda por área** — cuántas personas nombran cada área en 1.1 (y en 1.2 como relación
    principal), sobre quienes respondieron.
27. **Importancia × desempeño** — demanda (KPI 26) contra `IREL` recibido; el cuadrante
    «demandada y por debajo de la mediana» señala las áreas críticas para la colaboración.
28. **Frecuencia y tipo de interacción** — distribución de 1.3 (ordinal) y de 1.4 (múltiple, %
    sobre encuestados).
29. **Valor × fortalecer por área** — menciones de cada área en `c10_area_mayor_valor` contra
    `c10_area_fortalecer`, enfrentadas.
30. **Aislamiento en innovación** — áreas que no aparecen en ninguna iniciativa conjunta de 8.1
    (sin contar las que se marcan a sí mismas) y % de encuestados que respondió `NINGUNA`.
31. **Calidad del corte** — encuestas enviadas en menos de 5 minutos, encuestas «en línea recta»
    (la misma nota en las ≥ 10 escalas globales de los componentes 3 a 8), componentes respondidos
    con una sola nota, tasa de respuesta abierta. Se señalan, no se excluyen.
32. **Influencias: quién mueve a quién** — el análisis estructural (MICMAC) aplicado a las áreas.
    Si la gente de A evalúa a B en el componente 2, es porque trabaja con B y depende de lo que le
    entrega: B *mueve* a A. La fuerza de cada relación (1 débil, 2 media, 3 fuerte) son tercios de
    su peso (personas × frecuencia de `c1_frecuencia`). **Motricidad** = suma de la fuerza de las
    relaciones en que otras dependen de un área; **dependencia** = la de aquellas en que ella
    depende de otras. Las dos medias (que coinciden) parten el plano en motrices, de enlace,
    dependientes y autónomas. Se calcula por área y por gestión; por gestión no cuentan las
    relaciones internas. Cada relación se dibuja solo si alcanza la cohorte; la motricidad y la
    dependencia suman todas, como el grado ponderado del KPI 10. Un área sin respuestas propias
    tiene la dependencia sin medir, no en cero.

**Filtros globales del dashboard:** rango de fechas · campaña/corte · área de origen · **cargo** (agregado el 5-oct-2026) · frecuencia de interacción · tipo de interacción · exclusión de respuestas incompletas.

**Regla de anonimato (obligatoria):** ningún corte segmentado se muestra si tiene **menos de 4 respuestas**; en su lugar se despliega "Datos insuficientes para mostrar sin comprometer el anonimato". Umbral en `MIN_COHORT_SIZE` (default `4`). Esta regla es lo que hace creíble la promesa de confidencialidad del instrumento; no debe ser desactivable desde la UI.

---

## 5. Base de datos (Supabase / PostgreSQL)

### 5.1 Esquema

```sql
-- ============ CATÁLOGOS ============
-- Un `area` es un SUBPROCESO y cuelga de la gestión (`procesos`) que lo agrupa.
create table areas (
  code            text primary key,             -- PMO, PREVENTA, SOPORTE_TI, ...
  name            text not null,
  proceso_code    text references procesos(code),
  is_evaluable    boolean not null default true,
  headcount       integer,                      -- para tasa de participación
  sort_order      integer not null default 0,
  active          boolean not null default true
);

-- Un `proceso` es una GESTIÓN: el proceso principal que agrupa subprocesos.
create table procesos (
  code        text primary key,                 -- GERENCIA, COMERCIAL, TI, ...
  name        text not null,
  sort_order  integer not null default 0,
  active      boolean not null default true
);

create table components (
  id            smallint primary key,           -- 1..10
  code          text unique not null,           -- c1_relacionamiento, ...
  title         text not null,
  intro         text,                           -- texto introductorio del PDF
  sort_order    smallint not null
);

create table questions (
  code          text primary key,               -- c2_confianza, ...
  component_id  smallint not null references components(id),
  label         text not null,
  help_text     text,
  type          text not null
                check (type in ('SINGLE','MULTI','SCALE_0_10','TEXT','MATRIX_AREA')),
  required      boolean not null default true,
  min_select    smallint,
  max_select    smallint,
  per_area      boolean not null default false, -- se repite por área evaluada
  sort_order    smallint not null,
  active        boolean not null default true
);

create table question_options (
  id          bigserial primary key,
  question_code text not null references questions(code) on delete cascade,
  value       text not null,
  label       text not null,
  allows_text boolean not null default false,   -- "Otra: ____"
  exclusive   boolean not null default false,   -- p.ej. NINGUNA
  sort_order  smallint not null,
  unique (question_code, value)
);

-- ============ CAMPAÑAS / CORTES ============
create table campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                    -- "Diagnóstico 2026-S2"
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  is_open     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============ RESPUESTAS ============
create table survey_responses (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id),
  status          text not null default 'DRAFT' check (status in ('DRAFT','COMPLETED')),
  draft_token     text unique,                  -- retomar borrador sin login
  own_area        text references areas(code),  -- identificación, obligatoria
  own_area_other  text,                         -- heredado; ya no se escribe
  respondent_role text,                         -- identificación, obligatoria (lista cerrada)
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  duration_seconds integer,
  last_step       smallint not null default 0,
  user_agent_hash text,                         -- SHA-256, anti-abuso
  ip_hash         text,                         -- SHA-256 + salt, nunca IP en claro
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table answers (
  id              bigserial primary key,
  response_id     uuid not null references survey_responses(id) on delete cascade,
  question_code   text not null references questions(code),
  target_area     text references areas(code),  -- NULL = pregunta global
  value_number    numeric(4,1),                 -- escalas 0..10
  value_option    text,                         -- SINGLE
  value_options   text[],                       -- MULTI
  value_text      text,                         -- TEXT / "Otra"
  created_at      timestamptz not null default now(),
  unique (response_id, question_code, target_area)
);

create index answers_q_idx        on answers(question_code);
create index answers_target_idx   on answers(target_area);
create index answers_response_idx on answers(response_id);
create index responses_status_idx on survey_responses(status, campaign_id);
create index responses_area_idx   on survey_responses(own_area);

-- ============ CONFIGURACIÓN DE INDICADORES ============
create table indicator_weights (
  indicator_code text primary key,
  weight         numeric(4,3) not null check (weight >= 0 and weight <= 1)
);

create table indicator_thresholds (
  id        smallserial primary key,
  label     text not null,          -- Fortaleza / Aceptable / En riesgo / Crítico
  min_value numeric(5,2) not null,
  max_value numeric(5,2) not null,
  color     text not null
);

-- ============ AUDITORÍA DE ADMIN ============
create table admin_audit_log (
  id          bigserial primary key,
  action      text not null,        -- LOGIN_OK, LOGIN_FAIL, EXPORT_CSV, WEIGHTS_UPDATE
  detail      jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
```

**Nota sobre `answers`:** la unicidad `(response_id, question_code, target_area)` requiere que `target_area` sea `NOT NULL` en la práctica para preguntas globales — en PostgreSQL los `NULL` no colisionan en índices únicos. Solución: usar el centinela `'__GLOBAL__'` como fila en `areas` (con `is_evaluable = false`, `active = false`) y default `'__GLOBAL__'` en la columna, en lugar de `NULL`. Documentado aquí porque es un error clásico que permite respuestas duplicadas silenciosas.

### 5.2 Vistas materializadas de analítica

**No implementadas.** Con el volumen del diagnóstico —decenas a pocos miles de respuestas— la
analítica se calcula en memoria a partir de una sola lectura por vista
(`src/server/analytics/repositories/answers.repository.ts`), como ya admitía el párrafo de
refresco. Si un corte histórico llegara a degradar el panel, estas vistas son el camino; quedan
como referencia:

<details>
<summary>Propuesta original (no implementada)</summary>

```sql
-- Índice de relacionamiento por par (evaluador → evaluada)
create materialized view mv_relationship_matrix as
select r.campaign_id, r.own_area as source_area, a.target_area,
       count(distinct r.id)                as respondents,
       avg(a.value_number) * 10            as irel,
       avg(case when a.question_code='c2_confianza'    then a.value_number end)*10 as iconf,
       avg(case when a.question_code='c2_valor'        then a.value_number end)*10 as ival
from answers a
join survey_responses r on r.id = a.response_id
where r.status = 'COMPLETED'
  and a.question_code like 'c2_%'
  and a.target_area <> '__GLOBAL__'
group by r.campaign_id, r.own_area, a.target_area;

-- NPS por área evaluada
create materialized view mv_nps_by_area as
select r.campaign_id, a.target_area,
       count(*)                                                          as n,
       count(*) filter (where a.value_number >= 9)                       as promoters,
       count(*) filter (where a.value_number between 7 and 8)            as passives,
       count(*) filter (where a.value_number <= 6)                       as detractors,
       (count(*) filter (where a.value_number >= 9)::numeric
        - count(*) filter (where a.value_number <= 6)) * 100.0 / count(*) as nps
from answers a
join survey_responses r on r.id = a.response_id
where r.status = 'COMPLETED' and a.question_code = 'c9_nps'
group by r.campaign_id, a.target_area;
```

Refresco: `REFRESH MATERIALIZED VIEW CONCURRENTLY` disparado por el back tras cada envío completado (con *debounce* de 30 s) y en cada carga del dashboard si la vista tiene más de 5 minutos. Con volúmenes bajos (<5.000 respuestas) el cálculo directo también es viable; las vistas evitan degradación en cortes históricos.

</details>

### 5.3 Seguridad de datos (RLS)

- **RLS activado en todas las tablas, sin políticas**, y sin privilegios para los roles `anon`
  y `authenticated` (migración `0004_rls_sin_acceso_publico`): la API REST de Supabase no ve
  ninguna tabla. Toda tabla nueva debe activarlo en su propia migración;
  `prisma/migrations.spec.ts` lo exige.
- El servidor del proyecto es el **único** punto de lectura y escritura: conecta por Prisma como
  `postgres`, que tiene `BYPASSRLS`. No usa `@supabase/supabase-js` ni la
  `SUPABASE_SERVICE_ROLE_KEY`, aunque la integración de Vercel la deje en el entorno.
- El navegador **nunca** habla directo con Supabase. Todo pasa por la API (`/api/v1`), para que
  las reglas de validación (máximo 5 áreas, cohortes mínimas, anonimato) no puedan eludirse
  desde el cliente.
- La conexión a la base viaja cifrada: TLS exigido contra cualquier host remoto.
- IPs y user agents solo se almacenan hasheados (SHA-256 + `HASH_SALT`).

---

## 6. API — route handlers de Next.js

La API vive en el mismo proyecto que las pantallas: cada ruta es un `route.ts` delgado en
`src/app/api/v1/`, que valida la entrada y llama a la lógica de `src/server/`. Corre como
funciones serverless del runtime Node.js en Vercel.

### 6.1 Módulos

| Módulo (`src/server/`) | Responsabilidad |
|---|---|
| `auth/` · `session.ts` | Login por token, sesión JWT en cookie, rate limit de login respaldado en la auditoría, auditoría |
| `survey/` | Sirve el catálogo (componentes, preguntas, opciones, áreas, gestiones) al wizard |
| `responses/` · `rules/` | Crea borradores, guarda paso a paso, valida con las 8 reglas y confirma el envío |
| `analytics/` | Índices, IMC, NPS, KPIs, matriz, influencias, monitoreo y calidad; aplica `MIN_COHORT_SIZE` |
| `export/` | CSV y XLSX de las respuestas, por streaming |
| `campaigns/` | Alta y cierre de campañas |
| `db.ts` · `env.ts` · `http.ts` | Cliente de Prisma (una instancia por proceso), configuración, validación con zod, forma de los errores y límite de ráfagas |

### 6.2 Endpoints

30 rutas bajo `/api/v1`. La referencia completa —cuerpos, filtros, estados y forma de los
errores— está en [`PROYECTO.md`](PROYECTO.md#la-api).

| Grupo | Rutas |
|---|---|
| **Encuesta** (públicas) | `GET /survey/schema` · `POST /responses` · `GET /responses/:draftToken` · `PATCH /responses/:draftToken/step/:componentId` · `POST /responses/:draftToken/submit` |
| **Sesión** | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| **Panel** (sesión de admin) | 14 vistas de analítica (`/admin/overview`, `indicators`, `components`, `items`, `relationship-map`, `influence`, `network`, `nps`, `indices-by-area`, `indices-by-role`, `qualitative`, `quality`, `monitoring`, `areas/:code`) · `GET /admin/responses` · `GET` y `PUT /admin/weights` · `PATCH /admin/qualitative/answers/:id/theme` · `GET /admin/export` · `GET` y `POST /admin/campaigns` · `PATCH /admin/campaigns/:id/close` |

Todas las respuestas de analítica incluyen `{ data, meta: { n, insufficient, minCohortSize, generatedAt } }` para que el front pueda renderizar el estado de cohorte insuficiente sin lógica duplicada. El monitoreo y la calidad del corte responden siempre `insufficient: false`: describen *que* y *cómo* se respondió, nunca *qué*.

### 6.3 Autenticación por token

**Flujo:**

1. El admin entra a `/login` e ingresa el token.
2. La pantalla hace `POST /api/v1/auth/login { token }`.
3. El servidor compara con `ADMIN_ACCESS_TOKEN` usando **comparación de tiempo constante** (`crypto.timingSafeEqual` sobre los hashes SHA-256 de ambos valores, para no filtrar longitud).
4. Si coincide, firma un JWT HS256 con `JWT_SECRET`, `exp` = `JWT_EXPIRES_IN` (default `8h`), claims `{ sub: 'admin', role: 'admin' }`.
5. Devuelve el JWT en una cookie `httpOnly; SameSite=Lax; Path=/`, con `Secure` en cualquier despliegue.
6. Cada route handler de `/api/v1/admin/*` valida la sesión en cada llamada. `proxy.ts` valida firma y vigencia y redirige `/admin/*` a `/login` sin una sesión válida.

**Endurecimiento obligatorio:**

- **Rate limiting** en `/auth/login`, respaldado en `admin_audit_log` para que sobreviva a los arranques en frío: 5 intentos fallidos por IP cada 15 minutos (configurables); luego 429 con `retryAfterSeconds` en el cuerpo. Además, un límite de ráfagas por IP de 10 solicitudes por minuto.
- Cada intento (éxito o fallo) se registra en `admin_audit_log` con `ip_hash`.
- El token **nunca** se guarda en `localStorage` ni se envía en la URL. Solo cookie `httpOnly`.
- `ADMIN_ACCESS_TOKEN` es rotable: cambiar la variable en Vercel y redesplegar invalida el acceso anterior.
- Cookie `Secure` en los despliegues; en local se relaja por HTTP.

**Advertencia de seguridad (a comunicar al cliente):** un token compartido único no ofrece trazabilidad por persona, no permite revocar el acceso de un individuo sin afectar a los demás, y `Admin123!@` es un valor débil y predecible. Es aceptable como mecanismo inicial según lo solicitado, y está implementado así, pero se recomienda: (a) reemplazar `Admin123!@` por un token largo aleatorio antes de exponer datos reales; (b) planear la migración a Supabase Auth con cuentas por persona y roles (`admin`, `viewer`) una vez el sistema esté en uso. La arquitectura deja esa puerta abierta: cada route handler valida un JWT, no el token en sí, por lo que cambiar el emisor no obliga a tocar las rutas.

### 6.4 Validaciones de negocio (server-side, no confiar en el front)

- `c1_areas_interaccion`: entre 1 y 5 áreas; no puede incluir el área propia declarada en la identificación.
- `c1_area_principal`: tiene que ser una de las áreas de `c1_areas_interaccion`.
- Las respuestas del C2 y de `c9_nps` solo se aceptan para áreas presentes en `c1_areas_interaccion`.
- Escalas: entero entre 0 y 10.
- `c8_areas_iniciativas`: si incluye `NINGUNA`, no puede traer otras opciones.
- Opciones `OTRA`/`OTRO`: exigen texto no vacío (máx. 200 caracteres).
- `submit` rechaza si falta algún componente obligatorio; devuelve la lista de códigos faltantes para que el front navegue al paso correspondiente.
- No se aceptan respuestas si la campaña está cerrada (`is_open = false`).
- Sanitización de texto libre (strip de HTML) antes de persistir.

---

## 7. Frontend — Next.js

### 7.1 Rutas

| Ruta | Contenido | Acceso |
|---|---|---|
| `/` | **Encuesta** (wizard por componentes) | Público |
| `/gracias` | Confirmación + texto de cierre del PDF | Público |
| `/login` | Formulario de token | Público |
| `/admin` | Resumen ejecutivo: el diagnóstico en una lectura | Protegido |
| `/admin/indices` | Los ocho índices, sus pesos y el NPS por área | Protegido |
| `/admin/componentes` | Detalle por componente, por área de origen y por nivel de cargo | Protegido |
| `/admin/preguntas` | Las 33 afirmaciones 0-10, una por una | Protegido |
| `/admin/mapa` | Mapa de relacionamiento, brecha, aspectos e influencias | Protegido |
| `/admin/interaccion` | Red de interacción: demanda, áreas críticas, frecuencia | Protegido |
| `/admin/cualitativo` | Barreras, motivos y respuestas abiertas | Protegido |
| `/admin/areas` · `/admin/areas/[area]` | Todas las áreas y la ficha de cada una | Protegido |
| `/admin/metodologia` | Fuentes, fórmulas, pesos, semáforo y anonimato | Protegido |
| `/admin/respuestas` | Monitoreo en vivo, listado y exportación | Protegido |

### 7.2 Diseño del wizard (requisito de UX)

El instrumento completo es largo (≈45 ítems de escala + 8 de selección). La estrategia de seccionamiento:

**Secuencia de pasos (13 pantallas):**

| Paso | Contenido | Ítems visibles |
|---|---|---|
| 0 | Bienvenida: objetivo, promesa de confidencialidad, 15 min, instrucciones y tabla de tipos de respuesta, más la **identificación obligatoria** (área y cargo) | 2 |
| 1 | Componente 1 completo (1.1–1.4). 1.2 no ocupa bloque propio: es la estrella sobre la lista de 1.1 | 3 bloques |
| 2 | Componente 2 — **sub-paso por área** (hasta 5 sub-pantallas de 5 ítems) | 5 por área |
| 3 | Componente 3 | 5 |
| 4 | Componente 4 | 5 |
| 5 | Componente 5 (3 escalas) | 3 |
| 6 | Componente 6 | 5 |
| 7 | Componente 7 | 5 |
| 8 | Componente 8 (8.1 + 4 escalas) | 5 |
| 9 | Componente 9 (NPS por área + motivos) | 1 fila por área + 1 |
| 10 | Componente 10 (barreras, listas, cambio único) | 5 |
| 11 | Revisión: resumen editable por componente | — |
| 12 | Envío y agradecimiento | — |

**Reglas de UX:**

- **Nunca más de 5 ítems de escala por pantalla.** Es lo que mantiene la sensación de avance.
- **Barra de progreso** con paso actual, total y porcentaje. En el Componente 2, progreso secundario "Área 2 de 4".
- **Autoguardado**: al salir de cada paso se hace `PATCH .../step/:id`; en paralelo se guarda en `localStorage` con el `draftToken`. Si el usuario cierra el navegador, al volver a `/` se ofrece "Continuar donde quedó".
- **Navegación libre hacia atrás**, hacia adelante solo si el paso actual es válido. Validación con Zod en el cliente, replicada en el servidor.
- **Cada componente abre con su texto introductorio del PDF** (campo `components.intro`) — da propósito a las preguntas y reduce el abandono.
- **Input de escala 0–10**: botones segmentados 0..10 (no slider) con las anclas de cada pregunta visibles bajo los extremos (§3.2.1); en móvil, dos filas de botones. Los radios del PDF se traducen a botones táctiles, no a un `<select>`.
- **Estimación de tiempo restante** visible ("≈ 6 min restantes"), recalculada con el ritmo real del usuario.
- **Accesibilidad**: navegación completa por teclado, `aria-label` en cada opción de escala, foco visible, contraste AA, `prefers-reduced-motion` respetado. Las escalas 0–10 son `radiogroup` con flechas.
- **Móvil primero**: se asume que buena parte del personal responderá desde el teléfono.
- **Sin dark patterns**: se puede abandonar en cualquier momento; los campos opcionales están marcados como tales.

### 7.3 Stack de UI

- **Tailwind CSS 4** (configuración CSS-first) con piezas propias que siguen la línea gráfica aprobada ([`MARCA.md`](MARCA.md)); sin librería de componentes.
- **TanStack Query** para datos del admin (caché, refetch, estados de carga).
- **react-hook-form** + **Zod** para los formularios del wizard.
- **Recharts** para radar, barras y líneas. El heatmap, la matriz de relacionamiento, las burbujas empaquetadas y la red de influencias son SVG y tablas propias.
- Paleta: línea gráfica aprobada (*Prospectiva LinkTIC*), tipografía Geist; semaforización con verde/ámbar/naranja/rojo accesible y siempre con la etiqueta textual del nivel.

---

## 8. Variables de entorno

Un solo archivo, `.env.local` (plantilla versionada: `.env.example`). La referencia completa
—defaults, la integración de Supabase en Vercel, variables retiradas y diagnóstico de fallos—
está en [`VARIABLES-DE-ENTORNO.md`](VARIABLES-DE-ENTORNO.md).

```bash
# --- Base de datos (Supabase) — en Vercel las reemplaza la integración ---
DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres   # solo migraciones

# --- Acceso al panel ---
ADMIN_ACCESS_TOKEN=Admin123!@                  # token inicial solicitado; rotar antes de producción
JWT_SECRET=<cadena aleatoria de 64+ caracteres>
JWT_EXPIRES_IN=8h
COOKIE_NAME=linktic_admin_session

# --- Seguridad / privacidad ---
HASH_SALT=<cadena aleatoria>                   # para ip_hash y user_agent_hash
MIN_COHORT_SIZE=4                              # mínimo de respuestas para mostrar un corte
LOGIN_RATE_LIMIT=5
LOGIN_RATE_WINDOW_MINUTES=15

# --- Declaradas, aún sin consumir ---
NEXT_PUBLIC_APP_NAME=Diagnóstico Organizacional LinkTIC
NEXT_PUBLIC_SUPPORT_EMAIL=talentohumano@linktic.com
```

> **Regla estricta:** ninguna clave de Supabase, ni `ADMIN_ACCESS_TOKEN`, ni `JWT_SECRET` puede llevar el prefijo `NEXT_PUBLIC_`. Todo lo `NEXT_PUBLIC_` es visible en el bundle del navegador.

---

## 9. Despliegue en Vercel

El paso a paso está en [`DESPLIEGUE.md`](DESPLIEGUE.md).

### 9.1 Topología

Un solo proyecto de Vercel, conectado al repositorio de GitHub:

| Proyecto | Root Directory | Framework | Región de las funciones | Dominio propuesto |
|---|---|---|---|---|
| uno solo | la raíz del repositorio | Next.js (detección automática) | `yul1` (Montreal), junto a la base en `ca-central-1` | `diagnostico.linktic.com` (opcional) |

Pantallas y API comparten dominio: la cookie de sesión es first-party, sin CORS y sin
`COOKIE_DOMAIN`, sea cual sea el dominio.

### 9.2 La API en Vercel

Cada `route.ts` se despliega como función serverless del runtime Node.js (24.x, fijado en
`package.json`). El cliente de Prisma se crea en la primera consulta de cada instancia y se
reutiliza entre invocaciones; el build no necesita base de datos.

### 9.3 Consideraciones de serverless

- **Pooling de conexiones obligatorio:** el *Connection Pooler* de Supabase en modo transacción (puerto `6543`, `?pgbouncer=true`) para el runtime; el `5432` solo para migrar.
- **Conexión cifrada:** TLS exigido. Las cadenas de la integración de Vercel traen `sslmode=require`, al que el código da la semántica de libpq (cifrar sin validar la CA de Supabase).
- **Cold starts:** el primer request tras inactividad tarda más. Aceptable para el admin; la encuesta precarga el `schema` en el paso 0.
- **Duración:** la exportación declara `maxDuration = 60` y responde por streaming, paginando por cursor; el resto usa el límite por defecto.
- No hay vistas materializadas que refrescar (§5.2).
- El límite de ráfagas por IP vive en memoria de cada instancia; para un tope global, el firewall de Vercel.

### 9.4 Pipeline

- `main` → producción. Ramas y pull requests → *preview deployments* automáticos.
- Variables de entorno separadas por ambiente (Production / Preview / Development).
- **Base de Supabase separada para preview**, para que los previews no escriban en los datos reales del diagnóstico.
- Migraciones versionadas en `prisma/migrations/`, aplicadas con `npm run prisma:deploy` (no en el build); nunca cambios manuales en el editor SQL de producción.

---

## 10. Requisitos no funcionales

| Categoría | Requisito |
|---|---|
| Privacidad | Encuesta anónima por defecto; IP y user agent solo hasheados; cohorte mínima de 4 para cualquier corte |
| Seguridad | RLS en todas las tablas y sin acceso de la API REST de Supabase; sin service role; rate limit en login; auditoría de accesos admin; sanitización de texto libre; cabeceras de seguridad en la API; conexión a la base cifrada |
| Rendimiento | LCP < 2.5 s en 4G en el home; cambio de paso < 200 ms percibidos (optimista, sin bloquear en la red); dashboard < 2 s |
| Accesibilidad | WCAG 2.1 AA; teclado completo; lectores de pantalla en escalas 0–10 |
| Compatibilidad | Últimas 2 versiones de Chrome, Edge, Safari, Firefox; iOS Safari 16+; Android Chrome |
| Resiliencia | Borrador recuperable; reintento automático del `PATCH` de paso; el envío es idempotente por `draftToken` |
| Observabilidad | Logs estructurados en el servidor; Vercel Analytics en el front; alerta si el ratio de abandono por paso supera el 25 % |
| i18n | Solo español; textos en un único módulo de constantes para facilitar traducción futura |

---

## 11. Decisiones de diseño y supuestos

**Decisiones tomadas (documentadas arriba, con su justificación):**

1. Catálogo de 16 gestiones y 53 subprocesos, administrable en BD (distribución del 5-oct-2026; reemplaza el organigrama del 14-sep-2026 y, antes, el catálogo plano de 7 áreas + "Otra").
2. Encuesta anónima: no se pide el nombre; el área y el cargo (lista cerrada de 7 niveles) son obligatorios.
3. Componente 2 dividido en un sub-paso por área evaluada.
4. NPS (9.1) por área evaluada; motivos (9.2) una sola vez a nivel global (hacerlos por área exige cambiar el código).
5. `ICOM` añadido como indicador del Componente 3 (el PDF no lo nombra).
6. `IMC` como índice compuesto y KPI titular; `NIO` y `NPS_INT` reportados aparte por diferencia de escala y naturaleza.
7. El navegador nunca habla directo con Supabase; todo pasa por la API del proyecto (`/api/v1`).
8. Autenticación por JWT en cookie `httpOnly` emitida tras validar el token de `.env`, en lugar de enviar el token en cada request.

**Supuestos que requieren confirmación de LinkTIC antes de producción:**

| # | Tema | Supuesto aplicado |
|---|---|---|
| 1 | Opciones de 8.1 (aparecen como "□ …" en el PDF) | Catálogo completo de áreas + `NINGUNA` |
| 2 | ~~Contenido de las tres preguntas "(Lista)" del C10~~ **Resuelto el 14-sep-2026** | Áreas → catálogo de subprocesos; procesos → las 16 gestiones de §3.1 |
| 3 | Alcance del C3, C4, C6, C7 | Percepción **global** de la organización, no por área (el PDF no lo especifica; hacerlo por área multiplicaría la encuesta por 5 y rompería los 15 minutos) |
| 4 | Población por área | Necesaria para la tasa de participación (`areas.headcount`) |
| 5 | Pesos del IMC | Propuestos en §4.4; ajustables desde el admin |
| 6 | Umbrales de semaforización | Propuestos en §4.2 |
| 7 | Rotación del token admin | `Admin123!@` como valor inicial solicitado; se recomienda reemplazarlo antes de exponer datos reales |
| 8 | Retención de datos | Sin política definida; se propone conservar respuestas por campaña indefinidamente y anonimizar por completo (borrar nombre/cargo) al cerrar cada campaña |

---

## 12. Plan de implementación sugerido

> Plan original de agosto de 2026, ya ejecutado. La API se construyó en NestJS (fases 2, 4 y 5) y
> el 8-oct-2026 pasó a Next.js; el despliegue (fase 8) es un solo proyecto. Lo que pasó de verdad
> está en [`../CHANGELOG.md`](../CHANGELOG.md).

| Fase | Alcance | Entregable verificable |
|---|---|---|
| 1 | Esquema de Supabase + migraciones + semillas (áreas, componentes, preguntas, opciones, procesos, pesos, umbrales) | `GET /survey/schema` devuelve el instrumento completo del PDF |
| 2 | NestJS: `SurveyModule` + `ResponsesModule` con todas las validaciones | Envío end-to-end vía HTTP, con reglas de negocio verificadas por pruebas |
| 3 | Next.js: wizard completo con autoguardado y accesibilidad | Encuesta diligenciable en móvil en ≤ 15 min (medido con usuarios reales) |
| 4 | `AuthModule` + `/login` + `middleware.ts` + rate limit + auditoría | `/admin` inaccesible sin token; login bloqueado tras 5 intentos |
| 5 | `AnalyticsModule`: índices, IMC, NPS, matriz, brechas, cohorte mínima | Indicadores validados contra un cálculo manual en hoja de cálculo con datos de prueba |
| 6 | Dashboard admin: tarjetas, radar, heatmap, grafo, cualitativo | Los 20 KPIs de §4.5 renderizados y filtrables |
| 7 | Exportación CSV/XLSX + gestión de campañas | Descarga íntegra y verificable de un corte |
| 8 | Despliegue en Vercel (dos proyectos), dominios, ambientes, cron de refresco | URL productiva funcionando con datos de prueba |
| 9 | Endurecimiento: cabeceras, pruebas de carga, revisión de accesibilidad, rotación del token | Checklist de §10 cumplido |

**Recomendación de secuencia:** las fases 1–3 entregan valor por sí solas (se puede empezar a recolectar respuestas antes de que exista el dashboard). Priorizarlas permite que LinkTIC lance el diagnóstico mientras se construye la analítica.

---

## 13. Trazabilidad al documento fuente

| Sección del PDF | Página | Ubicación en este documento |
|---|---|---|
| Objetivo, instrucciones, tipos de respuesta | 1 | §1, §3.2, Paso 0 |
| Componente 1 — Caracterización del relacionamiento | 2 | §3.3 C1 |
| Componente 2 — Red de colaboración | 2–3 | §3.3 C2 |
| Componente 3 — Comunicación organizacional | 3–4 | §3.3 C3 |
| Componente 4 — Servicio interno | 4 | §3.3 C4 |
| Componente 5 — Agilidad organizacional | 5 | §3.3 C5 (dos preguntas retiradas el 5-oct-2026) |
| Componente 6 — Integración de procesos | 5–6 | §3.3 C6 |
| Componente 7 — Cultura colaborativa | 6–7 | §3.3 C7 |
| Componente 8 — Innovación organizacional | 7 | §3.3 C8 |
| Componente 9 — Experiencia de servicio interno (NPS) | 7–8 | §3.3 C9 |
| Componente 10 — Oportunidades de transformación | 8–9 | §3.3 C10 |
| Texto de agradecimiento | 9 | Paso final |
