/**
 * Empaquetado de círculos hermanos: las burbujas quedan tangentes entre sí, sin
 * solaparse, y las más grandes al centro.
 *
 * Es el algoritmo de cadena frontal de d3-hierarchy (`packSiblings`, Wang et al. 2006),
 * reescrito aquí para no sumar una dependencia por una sola función. Corre en O(n²) en el
 * peor caso y en la práctica es casi lineal: cientos de ideas se acomodan en un par de
 * milisegundos. El círculo envolvente de d3 se sustituye por la caja de los círculos,
 * que es lo que hace falta para encajar el resultado en un rectángulo.
 */

export interface PackCircle {
  r: number;
  x: number;
  y: number;
}

interface ChainNode {
  circle: PackCircle;
  next: ChainNode;
  previous: ChainNode;
}

/** Coloca `c` tangente a `a` y a `b`. */
function place(b: PackCircle, a: PackCircle, c: PackCircle) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2) {
    const a2 = (a.r + c.r) ** 2;
    const b2 = (b.r + c.r) ** 2;
    if (a2 > b2) {
      const x = (d2 + b2 - a2) / (2 * d2);
      const y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
      c.x = b.x - x * dx - y * dy;
      c.y = b.y - x * dy + y * dx;
    } else {
      const x = (d2 + a2 - b2) / (2 * d2);
      const y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
      c.x = a.x + x * dx - y * dy;
      c.y = a.y + x * dy + y * dx;
    }
  } else {
    c.x = a.x + c.r;
    c.y = a.y;
  }
}

function intersects(a: PackCircle, b: PackCircle): boolean {
  const dr = a.r + b.r - 1e-6;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

/** Distancia al origen del punto medio ponderado de un par: el par más cercano manda. */
function score(node: ChainNode): number {
  const a = node.circle;
  const b = node.next.circle;
  const ab = a.r + b.r;
  const dx = (a.x * b.r + b.x * a.r) / ab;
  const dy = (a.y * b.r + b.y * a.r) / ab;
  return dx * dx + dy * dy;
}

function link(circle: PackCircle): ChainNode {
  const node = { circle } as ChainNode;
  node.next = node;
  node.previous = node;
  return node;
}

/** Acomoda los círculos alrededor del origen. Muta `x` e `y` de cada uno. */
export function packSiblings(circles: PackCircle[]): void {
  const n = circles.length;
  if (n === 0) return;

  const first = circles[0];
  first.x = 0;
  first.y = 0;
  if (n === 1) return;

  const second = circles[1];
  first.x = -second.r;
  second.x = first.r;
  second.y = 0;
  if (n === 2) return;

  place(second, first, circles[2]);

  let a = link(first);
  let b = link(second);
  let c = link(circles[2]);
  a.next = c.previous = b;
  b.next = a.previous = c;
  c.next = b.previous = a;

  pack: for (let i = 3; i < n; i += 1) {
    place(a.circle, b.circle, circles[i]);
    c = link(circles[i]);

    // El círculo que choca más cerca a lo largo de la cadena, si lo hay.
    let j = b.next;
    let k = a.previous;
    let sj = b.circle.r;
    let sk = a.circle.r;
    do {
      if (sj <= sk) {
        if (intersects(j.circle, c.circle)) {
          b = j;
          a.next = b;
          b.previous = a;
          i -= 1;
          continue pack;
        }
        sj += j.circle.r;
        j = j.next;
      } else {
        if (intersects(k.circle, c.circle)) {
          a = k;
          a.next = b;
          b.previous = a;
          i -= 1;
          continue pack;
        }
        sk += k.circle.r;
        k = k.previous;
      }
    } while (j !== k.next);

    // Cabe: se inserta entre a y b, y se busca el par más cercano al centro.
    c.previous = a;
    c.next = b;
    a.next = b.previous = b = c;

    let best = score(a);
    while ((c = c.next) !== b) {
      const candidate = score(c);
      if (candidate < best) {
        a = c;
        best = candidate;
      }
    }
    b = a.next;
  }
}

export interface PackedItem<T> {
  item: T;
  x: number;
  y: number;
  r: number;
}

/**
 * Empaqueta y encaja en un rectángulo de `width × height`.
 *
 * El radio es proporcional a la raíz del valor, para que el ÁREA —que es lo que el ojo
 * compara— sea proporcional al valor: con el radio lineal una idea mencionada cuatro
 * veces parecería dieciséis veces más grande que una mencionada una vez.
 */
export function packInto<T>(
  items: T[],
  valueOf: (item: T) => number,
  {
    width,
    height,
    padding = 3,
    minValue = 0.35,
    maxRadius = Math.min(width, height) * 0.2,
  }: { width: number; height: number; padding?: number; minValue?: number; maxRadius?: number },
): PackedItem<T>[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];

  const sorted = [...items].sort((a, b) => valueOf(b) - valueOf(a));
  const circles = sorted.map((item) => ({
    item,
    base: Math.sqrt(Math.max(valueOf(item), minValue)),
    r: 0,
    x: 0,
    y: 0,
  }));

  // Primero en unidades arbitrarias con el relleno proporcional; luego se escala a la caja.
  const unitPad = (circles[0]?.base ?? 1) * 0.06;
  for (const circle of circles) circle.r = circle.base + unitPad;
  packSiblings(circles);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const circle of circles) {
    minX = Math.min(minX, circle.x - circle.r);
    maxX = Math.max(maxX, circle.x + circle.r);
    minY = Math.min(minY, circle.y - circle.r);
    maxY = Math.max(maxY, circle.y + circle.r);
  }

  const inner = { width: width - padding * 2, height: height - padding * 2 };
  // Con pocas burbujas el ajuste a la caja las inflaría hasta llenarla: un tope al radio
  // mayor mantiene la escala legible y deja aire alrededor.
  const maxBase = circles[0]?.base ?? 1;
  const scale = Math.min(
    inner.width / (maxX - minX),
    inner.height / (maxY - minY),
    maxRadius / maxBase,
  );
  const offsetX = padding + (inner.width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = padding + (inner.height - (maxY - minY) * scale) / 2 - minY * scale;

  return circles.map((circle) => ({
    item: circle.item,
    x: circle.x * scale + offsetX,
    y: circle.y * scale + offsetY,
    r: circle.base * scale,
  }));
}
