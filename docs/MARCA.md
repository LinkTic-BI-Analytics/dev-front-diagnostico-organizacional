# Línea gráfica del sistema

Desde el 5-oct-2026 el sistema sigue la **línea gráfica aprobada por la organización para sus
herramientas de análisis**: la de *Prospectiva LinkTIC*
(`dev-front-prospectiva-linktic.vercel.app`). Es la estructura con la que conviven, o van a
convivir, los demás sistemas de la casa. Este panel va a centralizar información y cruzarla
con otras fuentes, así que adoptarla no es estética: quien salta de un sistema a otro
encuentra cada cosa en el mismo lugar.

El **Manual de Marca Corporativa LinkTIC V2.0** (`GCM-MAN-004`, en [`docs/fuentes/`](fuentes/))
sigue mandando sobre el **logotipo**. En **tipografía y gama**, la línea gráfica aprobada
introduce dos diferencias deliberadas, que se detallan más abajo.

Todo vive en [`globals.css`](../src/app/globals.css).

---

## Estructura

| Pieza | Cómo es | Dónde |
|---|---|---|
| Menú lateral | Navy con halos de la marca, 280 px, colapsable a 76 px; tres tramos (Diagnóstico, Áreas por gestión, Operación); filete vertical con el degradado en la vista activa | [`AdminShell`](../src/components/shell/AdminShell.tsx), [`SidebarNav`](../src/components/shell/SidebarNav.tsx) |
| Móvil | Barra superior navy y menú en cajón desde la izquierda | `AdminShell` |
| Buscador | ⌘K / Ctrl+K: vistas, por palabra clave, y los 53 subprocesos | [`CommandPalette`](../src/components/shell/CommandPalette.tsx) |
| Cabecera de vista | Migas, antetítulo con el guion degradado, **titular que concluye**, entrada, acciones y cifras. Portada navy con retícula (`hero`) o plano claro (`plain`) | [`PageHeader`](../src/components/page/PageHeader.tsx) |
| Tarjeta de gráfico | Blanca, `rounded-2xl`. Título = la conclusión; debajo, qué muestra; conmutador Gráfica/Tabla; «¿Cómo leer?» plegado al pie | [`ChartCard`](../src/components/charts/ChartCard.tsx) |
| Panel de detalle | Cajón a la derecha en escritorio, hoja desde abajo en móvil | [`SidePanel`](../src/components/charts/SidePanel.tsx) |
| Superficie pública | Plano claro con dos halos (cian y verde) y tarjeta blanca con filete degradado | `.lk-halos`, encuesta, gracias |
| Login | Portada navy con retícula y tarjeta blanca | [`login/page.tsx`](../src/app/login/page.tsx) |

**Solo en claro.** La línea gráfica de referencia no tiene tema oscuro, y el sistema tampoco:
el chrome navy ya da el contraste que en otras interfaces da un tema oscuro, y el panel se
proyecta e imprime. Se retiraron el interruptor de tema y su script.

---

## Gama

### Marca

| Token | Hex | Uso |
|---|---|---|
| `--lk-navy-950` | `#06142b` | Fondo del menú y de la portada |
| `--lk-navy-900` | `#0a1f3d` | Ídem; tooltips |
| `--lk-navy-800` | `#10264a` | Ídem |
| `--lk-blue` | `#0e8fd8` | Acento gráfico. Nunca texto pequeño (no llega a 4,5:1 sobre blanco) |
| `--lk-blue-deep` | `#0a6cb1` | `--brand`: enlaces y lo interactivo. 5,5:1 sobre blanco |
| `--lk-cyan` | `#29c3f4` | Foco sobre el navy |
| `--lk-green` / `--lk-green-deep` | `#23a844` / `#128c31` | Degradado y marcas «en vivo» |
| `--lk-degradado-marca` | `#29c3f4 → #0d7fd1 → #23a844` | Filetes, guiones, pestañas, palabra destacada |

### Interfaz

| Token | Hex | Contraste |
|---|---|---|
| `--background` | `#f2f6fa` | Plano de página |
| `--surface` | `#ffffff` | Tarjetas |
| `--foreground` | `#102433` | Tinta principal |
| `--foreground-muted` | `#45556c` | 7,5:1 sobre blanco, 7,0:1 sobre el plano |
| `--foreground-subtle` | `#62748e` | 4,8:1 sobre blanco pero **4,4:1 sobre el plano**: solo dentro de tarjetas |

### Datos

Es la misma paleta que usa la referencia, validada con el procedimiento de seis controles
(banda de luminancia, croma, separación con daltonismo, separación con visión normal,
contraste):

- **Categórica** en orden fijo: `#2a78d6`, `#eb6834`, `#1baf7a`, `#eda100`, `#e87ba4`,
  `#008300`, `#4a3aa7`, `#e34948`. Una sola serie va siempre en el tono 1. En formas donde
  cualquier par puede quedar contiguo (burbujas, dispersión) solo valen las tres primeras.
- **Ordinal** (frecuencia de interacción, cobertura por área): `#86b6ef → #3987e5 → #256abf →
  #184f95 → #0d366b`. Verificado: luminancia monótona, ΔL ≥ 0,06 y el extremo claro a 2,1:1.
- **Secuencial** (mapa de calor día × hora): azul de `#cde2fb` a `#0d366b`.
- **Divergente** (brecha, NPS por área, motivos): azul `#2a78d6` contra rojo `#e34948`, ΔE
  21,6 con protanopia.
- **Estado** (segmentos del NPS): `#0ca30c`, `#fab219`, `#d03b3b`, reservados para eso y
  siempre con su etiqueta.

**Los colores del semáforo no están aquí.** Siguen llegando de `indicator_thresholds` en la
base de datos para que un admin los ajuste sin desplegar, y siguen sin cargar el significado
solos: cada cifra lleva escrita su banda.

---

## Tipografía

**Geist** (variable, vía `next/font/google`) para toda la interfaz, y **Geist Mono** para
fórmulas y códigos de indicador. Es la tipografía de la línea gráfica aprobada.

> **Diferencia con el Manual de Marca.** El manual fija Montserrat como tipografía
> corporativa. La línea gráfica de las herramientas de análisis usa Geist, y este sistema
> sigue a la línea gráfica para no ser el único distinto entre ellas. Si la organización
> decide volver a Montserrat, el cambio es una línea en
> [`layout.tsx`](../src/app/layout.tsx) y otra en `globals.css`.

| Elemento | Peso | Nota |
|---|---|---|
| `h1` | 700, interletrado −0,03 em | En la base del CSS: nace así sin que nadie lo recuerde |
| `h2`–`h4` | 600 | |
| Cifras de portada y tarjeta | 600, proporcionales | `tabular-nums` solo en columnas de tabla y ejes |

Las cifras se escriben en español de Colombia: coma decimal, punto de miles, espacio fino
antes del porcentaje («75,9 %») y el signo menos tipográfico («−55»).

---

## Los cuatro colores de bloque de la encuesta

La encuesta se sigue recorriendo en cuatro bloques con su color; el tono tiñe título, cinta,
escala, botón y ahora también el filete superior de la tarjeta.

| Bloque | Tinta | Acento |
|---|---|---|
| 1 · Relacionamiento | `#0a6cb1` (azul profundo de la línea gráfica) | `#0e8fd8` |
| 2 · Cómo funciona la empresa | `#0d6d5f` | `#1eae98` |
| 3 · Cultura | `#12690a` | `#23a844` |
| 4 · Qué debemos cambiar | `#8a5300` | `#eda100` |

Las cuatro tintas dan entre 5,5:1 y 6,9:1 sobre blanco. El verde de la marca profundo
(`#128c31`) no llega a 4,5:1, por eso el bloque 3 conserva su tinta más oscura.

---

## Logotipo

Sin cambios respecto al Manual. Los archivos de
[`public/brand/`](../public/brand/) se extrajeron del PDF del manual y no se
recolorean ni filtran.

[`Logo.tsx`](../src/components/brand/Logo.tsx) elige la versión **por el fondo**
(`surface="light" | "dark"`), no por un tema. Sobre el navy, el isotipo va a color —como en
la línea gráfica de referencia—; el logotipo completo sobre fondo oscuro usa la versión a una
tinta.

- 200 px como tamaño web y **130 px como mínimo** para el logotipo con eslogan.
- En el menú lateral y la barra móvil va el **isotipo solo**: a esa altura el logotipo
  caería por debajo del mínimo.
- Usos incorrectos que un desarrollador puede cometer sin darse cuenta: alterar proporciones
  (`Logo.tsx` deriva el alto del ancho), recolorear (nada de `filter` ni `opacity`), ponerlo
  sobre fondos sin contraste, agregarle bordes o sombras, o sustituirlo por texto.

---

## Un detalle de CSS que importa

En Tailwind 4 los utilitarios viven en `@layer utilities`, y **una regla sin capa les gana
siempre**, sin importar la especificidad. Por eso la base del sistema (tipografía de
encabezados, anillo de foco) está en `@layer base` y las piezas `.lk-*` en
`@layer components`: así un `focus-visible:outline-none` o un `font-medium` puestos en un
elemento concreto mandan sobre lo que se fija para todos. Una regla nueva fuera de capa
volvería a romperlo.
