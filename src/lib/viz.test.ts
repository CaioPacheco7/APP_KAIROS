import { describe, expect, it } from "vitest";
import { deltaTone, formatPct, niceScale, pctChange, smoothPath, tickLabel } from "./viz";

describe("niceScale: marcas redondas no eixo", () => {
  it("R$ 3.900 vira um eixo até R$ 4.000 de mil em mil", () => {
    expect(niceScale(390_000)).toEqual({ max: 400_000, ticks: [0, 100_000, 200_000, 300_000, 400_000] });
  });

  it("o topo nunca fica abaixo do maior valor", () => {
    for (const v of [1, 99, 12_345, 250_000, 999_999, 3_141_592]) {
      const { max, ticks } = niceScale(v);
      expect(max).toBeGreaterThanOrEqual(v);
      expect(ticks[0]).toBe(0);
      expect(ticks.at(-1)).toBe(max);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      expect(ticks.length).toBeLessThanOrEqual(6);
    }
  });

  it("usa passos de 1, 2, 2,5 ou 5 × 10^n reais", () => {
    const { ticks } = niceScale(1_000_000, 4); // R$ 10.000
    expect(ticks[1]).toBe(250_000); // R$ 2.500
  });

  it("sem dados, devolve uma escala padrão (sem dividir por zero)", () => {
    expect(niceScale(0).max).toBeGreaterThan(0);
    expect(niceScale(Number.NaN).max).toBeGreaterThan(0);
  });
});

describe("tickLabel: por extenso abaixo de 10 mil, compacto acima", () => {
  it("abaixo de 10 mil reais", () => {
    expect(tickLabel(250_000, 400_000)).toBe("2.500");
    expect(tickLabel(0, 400_000)).toBe("0");
  });
  it("a partir de 10 mil reais", () => {
    // o Intl usa espaço não separável entre o número e "mil"
    expect(tickLabel(1_200_000, 2_000_000)).toMatch(/^12\smil$/);
  });
});

describe("smoothPath", () => {
  it("começa no primeiro ponto e passa por todos", () => {
    const d = smoothPath([
      [0, 10],
      [10, 0],
      [20, 5],
    ]);
    expect(d.startsWith("M 0 10")).toBe(true);
    expect(d).toContain("10 0");
    expect(d.trim().endsWith("20 5")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });
});

describe("variação percentual", () => {
  it("calcula e formata em pt-BR com sinal de menos de verdade", () => {
    expect(formatPct(pctChange(110, 100)!)).toBe("+10,0%");
    expect(formatPct(pctChange(97.1, 100)!)).toBe("−2,9%");
    expect(formatPct(0.04)).toBe("0,0%");
  });

  it("sem base (mês anterior zerado) não inventa número", () => {
    expect(pctChange(100, 0)).toBeNull();
  });

  it("bom ou ruim depende do que está sendo medido", () => {
    expect(deltaTone(8, "up")).toBe("good"); // entradas subiram
    expect(deltaTone(8, "down")).toBe("bad"); // saídas subiram
    expect(deltaTone(-8, "down")).toBe("good"); // saídas caíram
    expect(deltaTone(0.4, "up")).toBe("neutral");
  });
});
