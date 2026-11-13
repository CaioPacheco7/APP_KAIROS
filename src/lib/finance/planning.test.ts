import { describe, expect, it } from "vitest";
import {
  depositNeeded,
  installment,
  monthsToReach,
  planDebt,
  planGoal,
  simulatePayoff,
  toRate,
} from "./planning";

const nb = (s: string) => s.replace(/\s/g, " ");

describe("matemática básica", () => {
  it("toRate", () => {
    expect(toRate(1.5)).toBeCloseTo(0.015);
    expect(toRate(null)).toBe(0);
    expect(toRate(-3)).toBe(0);
    expect(toRate(NaN)).toBe(0);
  });

  it("installment sem juros divide (arredondando para cima)", () => {
    expect(installment(190000, 0, 6)).toBe(31667);
  });

  it("installment com juros bate com a tabela Price", () => {
    // R$ 10.000 em 12x a 2% a.m. -> parcela ≈ R$ 945,60
    expect(installment(1000000, 0.02, 12)).toBe(94560);
    // R$ 1.900 em 6x a 10% a.m.: 19000 / (1 - 1,1^-6) = 436,258 -> R$ 436,26 (arredonda para cima)
    expect(installment(190000, 0.1, 6)).toBe(43626);
  });

  it("simulatePayoff: sem juros paga o valor exato", () => {
    expect(simulatePayoff(190000, 0, 50000)).toEqual({ months: 4, total: 190000 });
  });

  it("simulatePayoff: parcela que não cobre os juros nunca quita", () => {
    expect(simulatePayoff(100000, 0.1, 10000)).toBeNull(); // juros = 10.000
    expect(simulatePayoff(100000, 0.1, 0)).toBeNull();
  });

  it("simulatePayoff com juros paga mais do que a dívida", () => {
    const r = simulatePayoff(190000, 0.1, 50000)!;
    expect(r.months).toBeGreaterThan(4);
    expect(r.total).toBeGreaterThan(190000);
  });

  it("monthsToReach sem rendimento", () => {
    expect(monthsToReach(2300000, 0, 80000, 0)).toBe(29); // 28,75 -> 29
    expect(monthsToReach(2300000, 0, 0, 0)).toBeNull();
    expect(monthsToReach(1000, 5000, 100, 0)).toBe(0);
  });

  it("monthsToReach com rendimento chega antes", () => {
    const sem = monthsToReach(2300000, 0, 80000, 0)!;
    const com = monthsToReach(2300000, 0, 80000, 0.01)!;
    expect(com).toBeLessThan(sem);
  });

  it("depositNeeded é o inverso de monthsToReach", () => {
    for (const r of [0, 0.005, 0.01]) {
      const deposit = depositNeeded(2300000, 100000, r, 24);
      const months = monthsToReach(2300000, 100000, deposit, r)!;
      expect(months).toBeLessThanOrEqual(24);
      // um pouco menos que o necessário não chega no prazo
      expect(monthsToReach(2300000, 100000, Math.floor(deposit * 0.97), r)!).toBeGreaterThan(24);
    }
  });
});

describe("planGoal: a moto de R$ 23.000 (renda 2.500, gastos 1.700)", () => {
  const base = {
    target: 2300000,
    saved: 0,
    income: 250000,
    expenses: 170000,
    desiredMonths: null,
    monthlyReturnPct: null,
  };

  it("sobra de R$ 800 e cenários com e sem folga", () => {
    const plan = planGoal(base);
    expect(plan.surplus).toBe(80000);

    const comfortable = plan.scenarios.find((s) => s.id === "comfortable")!;
    expect(comfortable.monthly).toBe(72000); // 90% da sobra
    expect(comfortable.months).toBe(32); // 23000 / 720 = 31,9
    const max = plan.scenarios.find((s) => s.id === "max")!;
    expect(max.monthly).toBe(80000);
    expect(max.months).toBe(29);
    expect(plan.recommendedId).toBe("comfortable");
  });

  it("prazo de 24 meses não cabe: mostra quanto falta", () => {
    const plan = planGoal({ ...base, desiredMonths: 24 });
    const deadline = plan.scenarios.find((s) => s.id === "deadline")!;
    expect(deadline.monthly).toBe(95834); // 23000 / 24 = 958,33
    expect(deadline.feasible).toBe(false);
    expect(nb(deadline.note)).toContain("R$ 158,34 a mais");
    expect(plan.recommendedId).toBe("comfortable");
  });

  it("prazo de 36 meses cabe e vira a recomendação", () => {
    const plan = planGoal({ ...base, desiredMonths: 36 });
    const deadline = plan.scenarios.find((s) => s.id === "deadline")!;
    expect(deadline.monthly).toBe(63889); // 23000 / 36
    expect(deadline.feasible).toBe(true);
    expect(plan.recommendedId).toBe("deadline");
  });

  it("entrada guardada encurta o caminho", () => {
    const sem = planGoal(base).scenarios.find((s) => s.id === "max")!.months!;
    const com = planGoal({ ...base, saved: 500000 }).scenarios.find((s) => s.id === "max")!.months!;
    expect(com).toBeLessThan(sem);
  });

  it("sem sobra: nenhum cenário, só o aviso para equilibrar o mês", () => {
    const plan = planGoal({ ...base, expenses: 260000 });
    expect(plan.scenarios).toHaveLength(0);
    expect(plan.recommendedId).toBeNull();
    expect(plan.warnings[0]).toContain("equilibrar o mês");
  });

  it("meta já atingida", () => {
    const plan = planGoal({ ...base, saved: 2300000 });
    expect(plan.scenarios).toHaveLength(0);
    expect(plan.warnings[0]).toContain("já tem");
  });

  it("prazo acima de 5 anos gera aviso; rendimento gera aviso de estimativa", () => {
    const longo = planGoal({ ...base, target: 20000000 });
    expect(longo.warnings.some((w) => w.includes("5 anos"))).toBe(true);
    const rend = planGoal({ ...base, monthlyReturnPct: 0.8 });
    expect(rend.warnings.some((w) => w.includes("não é garantido"))).toBe(true);
  });
});

describe("planDebt: cartão de R$ 1.900 com renda de R$ 1.500", () => {
  const base = { debt: 190000, income: 150000, essentials: 90000, monthlyInterestPct: 0 };

  it("sobra de R$ 600; escolhe o prazo mais curto que cabe com folga", () => {
    const plan = planDebt(base);
    expect(plan.surplus).toBe(60000);
    // 3x = 633,34 (passa da sobra); 6x = 316,67 (<= 80% de 600 = 480) -> recomendado
    expect(plan.options.find((o) => o.id === "parcelar-3")!.feasible).toBe(false);
    expect(plan.recommendedId).toBe("parcelar-6");
    expect(plan.options.find((o) => o.id === "parcelar-6")!.payment).toBe(31667);
  });

  it("sem juros informados avisa que o custo real é maior", () => {
    const plan = planDebt({ ...base, monthlyInterestPct: null });
    expect(plan.warnings[0]).toContain("não informou os juros");
  });

  it("com juros, a mesma dívida custa mais e a recomendação pode alongar", () => {
    const plan = planDebt({ ...base, monthlyInterestPct: 10 });
    const six = plan.options.find((o) => o.id === "parcelar-6")!;
    expect(six.total).toBeGreaterThan(190000);
    expect(six.interest).toBe(six.total - 190000);
    // parcela de 6x a 10% = 436,26 <= 480 (80% da sobra): ainda é a recomendada
    expect(plan.recommendedId).toBe("parcelar-6");
  });

  it("juros altos: nenhuma parcela cabe com folga", () => {
    const plan = planDebt({ ...base, income: 110000, monthlyInterestPct: 12 });
    // sobra de 200: só os prazos longos cabem, e apertados
    expect(plan.warnings.some((w) => w.includes("Nenhuma parcela cabe com folga") || w.includes("passa da sua sobra"))).toBe(true);
  });

  it("sem sobra: nenhuma opção viável e orienta a negociar", () => {
    const plan = planDebt({ ...base, income: 90000 });
    expect(plan.options.every((o) => !o.feasible)).toBe(true);
    expect(plan.recommendedId).toBeNull();
    expect(plan.warnings[0]).toContain("negociar");
  });

  it("opção 'pagando com a sobra' termina a dívida", () => {
    const plan = planDebt(base);
    const sobra = plan.options.find((o) => o.id === "sobra")!;
    expect(sobra.payment).toBe(48000); // 80% de 600
    expect(sobra.months).toBe(4); // 1.900 / 480 = 3,96
    expect(sobra.total).toBe(190000);
  });

  it("sempre lembra de priorizar o essencial", () => {
    const plan = planDebt(base);
    expect(plan.warnings.at(-1)).toContain("essenciais");
  });
});
