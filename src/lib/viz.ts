/**
 * Utilidades dos gráficos (puras e testáveis). Valores sempre em centavos.
 */

export type Scale = { max: number; ticks: number[] };

/**
 * Escala do eixo com marcas "redondas" (1, 2, 2,5 ou 5 × 10^n reais) e de
 * 3 a 5 marcas. O topo nunca fica abaixo do maior valor.
 */
export function niceScale(maxCents: number, targetTicks = 4): Scale {
  if (!(maxCents > 0)) {
    return { max: 100_00, ticks: [0, 25_00, 50_00, 75_00, 100_00] };
  }
  const rough = maxCents / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const max = Math.ceil(maxCents / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let i = 0; i * step <= max + 1e-6; i++) ticks.push(Math.round(i * step));
  return { max: Math.round(max), ticks };
}

const fullReais = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const compactReais = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Texto de uma marca do eixo: por extenso abaixo de 10 mil reais
 * ("2.500"), compacto a partir daí ("12 mil"). Um estilo por eixo.
 */
export function tickLabel(cents: number, axisMaxCents: number): string {
  const reais = cents / 100;
  return axisMaxCents / 100 >= 10_000 ? compactReais.format(reais) : fullReais.format(reais);
}

export type Point = [number, number];

/** Caminho SVG suave passando pelos pontos (curvas com tangente horizontal). */
export function smoothPath(points: Point[]): string {
  return points.reduce((path, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = points[i - 1];
    const mid = (x + px) / 2;
    return `${path} C ${mid} ${py}, ${mid} ${y}, ${x} ${y}`;
  }, "");
}

/** Variação percentual; `null` quando não há base para comparar. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** "+8,3%", "−3,4%" (sinal de menos de verdade), "0,0%". */
export function formatPct(change: number): string {
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return "0,0%";
  return `${rounded > 0 ? "+" : "−"}${pct.format(Math.abs(rounded))}%`;
}

/**
 * A variação é boa ou ruim? Para "saídas", subir é ruim; para "entradas", subir é bom.
 * Mudanças muito pequenas (< 1%) contam como neutras.
 */
export function deltaTone(change: number, goodWhen: "up" | "down"): "good" | "bad" | "neutral" {
  if (Math.abs(change) < 1) return "neutral";
  const up = change > 0;
  return up === (goodWhen === "up") ? "good" : "bad";
}
