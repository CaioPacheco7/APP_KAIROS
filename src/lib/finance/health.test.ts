import { describe, expect, it } from "vitest";
import { assessHealth } from "./health";

const nb = (s: string) => s.replace(/\s/g, " "); // Intl usa espaço não separável

describe("assessHealth", () => {
  it("exemplo do Caio: renda 2.000, fixas 1.500 -> amarelo (75%)", () => {
    const h = assessHealth({
      income: 200000,
      committed: 150000,
      fixed: 150000,
      variable: 0,
      month: "2026-11",
      today: "2026-11-01",
    });
    expect(h.level).toBe("yellow");
    expect(h.label).toBe("Atenção");
    expect(Math.round(h.ratio!)).toBe(75);
    expect(h.remaining).toBe(50000);
    // 30 dias restantes no dia 1: 500 / 30 = 16,66 -> R$ 16
    expect(h.perDay).toBe(1666);
    expect(nb(h.message)).toContain("75% da renda");
    expect(nb(h.message)).toContain("R$ 500,00");
  });

  it("verde até o limite (70%)", () => {
    const h = assessHealth({
      income: 100000, committed: 70000, fixed: 70000, variable: 0,
      month: "2026-11", today: "2026-11-03",
    });
    expect(h.level).toBe("green");
  });

  it("logo acima do limite verde vira amarelo; acima do amarelo, vermelho", () => {
    const base = { income: 100000, fixed: 0, variable: 0, month: "2026-11", today: "2026-11-02" };
    expect(assessHealth({ ...base, committed: 70100 }).level).toBe("yellow");
    expect(assessHealth({ ...base, committed: 90000 }).level).toBe("yellow");
    expect(assessHealth({ ...base, committed: 90100 }).level).toBe("red");
  });

  it("gastou mais do que ganha: vermelho com mensagem direta", () => {
    const h = assessHealth({
      income: 200000, committed: 230000, fixed: 150000, variable: 80000,
      month: "2026-11", today: "2026-11-20",
    });
    expect(h.level).toBe("red");
    expect(h.remaining).toBe(-30000);
    expect(h.perDay).toBeNull();
    expect(nb(h.message)).toContain("R$ 300,00 a mais");
  });

  it("projeção do ritmo pode piorar o semáforo (depois de 7 dias)", () => {
    // fixas 1.000 (50%), já gastou 600 variáveis em 10 dias -> projeta 1.800 no mês
    const h = assessHealth({
      income: 200000, committed: 160000, fixed: 100000, variable: 60000,
      month: "2026-11", today: "2026-11-10",
    });
    expect(h.projected).toBe(100000 + 180000);
    expect(h.level).toBe("red"); // 140% projetado
    expect(nb(h.message)).toContain("No ritmo atual");
  });

  it("nos primeiros dias a projeção não derruba o semáforo", () => {
    const h = assessHealth({
      income: 200000, committed: 120000, fixed: 100000, variable: 20000,
      month: "2026-11", today: "2026-11-02",
    });
    expect(h.level).toBe("green"); // 60% real; sem projeção com 2 dias de dados
  });

  it("mês que não é o atual não projeta nem calcula gasto por dia", () => {
    const h = assessHealth({
      income: 200000, committed: 150000, fixed: 150000, variable: 0,
      month: "2026-10", today: "2026-11-13",
    });
    expect(h.projected).toBeNull();
    expect(h.perDay).toBeNull();
  });

  it("sem renda: desconhecido, pedindo para cadastrar", () => {
    const h = assessHealth({
      income: 0, committed: 5000, fixed: 0, variable: 5000,
      month: "2026-11", today: "2026-11-13",
    });
    expect(h.level).toBe("unknown");
    expect(h.ratio).toBeNull();
    expect(h.message).toContain("Cadastre a renda");
  });

  it("limites personalizados", () => {
    const h = assessHealth({
      income: 100000, committed: 55000, fixed: 55000, variable: 0,
      month: "2026-11", today: "2026-11-03", greenMax: 50, yellowMax: 80,
    });
    expect(h.level).toBe("yellow");
  });
});
