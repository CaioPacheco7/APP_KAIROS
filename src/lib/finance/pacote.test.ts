import { describe, expect, it } from "vitest";
import { daysBetween, daysInMonth } from "@/lib/dates";
import { splitMoney } from "@/lib/money";
import { dailyAllowance } from "./health";
import { formatMonths, reserveMonths } from "./reserve";
import {
  isSubscriptionCategory,
  nextChargeDate,
  renewalLabel,
  summarizeSubscriptions,
  type RecurrenceLike,
} from "./subscriptions";

describe("datas auxiliares", () => {
  it("daysBetween conta dias entre duas datas", () => {
    expect(daysBetween("2026-11-26", "2026-11-26")).toBe(0);
    expect(daysBetween("2026-11-26", "2026-12-01")).toBe(5);
    expect(daysBetween("2026-12-01", "2026-11-26")).toBe(-5);
  });
  it("daysInMonth sabe os meses curtos e o ano bissexto", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-11")).toBe(30);
  });
});

describe("dailyAllowance (quanto ainda posso gastar hoje)", () => {
  // novembro tem 30 dias; dia 21 -> faltam 10 dias contando hoje
  const base = { month: "2026-11", today: "2026-11-21" };

  it("divide a sobra do começo do dia pelos dias que faltam", () => {
    // renda 3.000; comprometido 2.000 (inclui 30 gastos hoje) -> começo do dia: 1.030
    const a = dailyAllowance({ ...base, income: 300000, committed: 200000, spentToday: 3000 });
    expect(a).toEqual({ limit: 10300, spent: 3000, left: 7300, daysLeft: 10 });
  });

  it("o limite não encolhe a cada gasto lançado hoje", () => {
    const before = dailyAllowance({ ...base, income: 300000, committed: 197000, spentToday: 0 });
    const after = dailyAllowance({ ...base, income: 300000, committed: 200000, spentToday: 3000 });
    expect(after?.limit).toBe(before?.limit);
  });

  it("mostra quanto passou do limite", () => {
    const a = dailyAllowance({ ...base, income: 300000, committed: 220000, spentToday: 15000 });
    expect(a?.limit).toBe(9500); // (3.000 - 2.200 + 150) / 10
    expect(a?.left).toBe(-5500);
  });

  it("sem folga no mês, o limite é zero", () => {
    const a = dailyAllowance({ ...base, income: 100000, committed: 120000, spentToday: 0 });
    expect(a?.limit).toBe(0);
  });

  it("no último dia, o limite é tudo o que sobra", () => {
    const a = dailyAllowance({ income: 300000, committed: 290000, spentToday: 0, month: "2026-11", today: "2026-11-30" });
    expect(a).toMatchObject({ limit: 10000, daysLeft: 1 });
  });

  it("não existe para outro mês nem sem renda", () => {
    expect(dailyAllowance({ ...base, month: "2026-10", income: 300000, committed: 0, spentToday: 0 })).toBeNull();
    expect(dailyAllowance({ ...base, income: 0, committed: 0, spentToday: 0 })).toBeNull();
  });
});

describe("assinaturas", () => {
  it("reconhece a categoria sem ligar para acento e maiúsculas", () => {
    expect(isSubscriptionCategory("Assinaturas")).toBe(true);
    expect(isSubscriptionCategory("assinatura de apps")).toBe(true);
    expect(isSubscriptionCategory("ASSINATURAS")).toBe(true);
    expect(isSubscriptionCategory("Lazer")).toBe(false);
    expect(isSubscriptionCategory(null)).toBe(false);
  });

  it("próxima cobrança: ainda neste mês, ou no próximo", () => {
    expect(nextChargeDate(28, "2026-11-26")).toBe("2026-11-28");
    expect(nextChargeDate(26, "2026-11-26")).toBe("2026-11-26");
    expect(nextChargeDate(5, "2026-11-26")).toBe("2026-12-05");
    expect(nextChargeDate(10, "2026-12-20")).toBe("2027-01-10");
  });

  it("dia 31 em mês curto vira o último dia", () => {
    expect(nextChargeDate(31, "2026-11-26")).toBe("2026-11-30");
    expect(nextChargeDate(31, "2027-02-01")).toBe("2027-02-28");
  });

  it("texto de renovação", () => {
    expect(renewalLabel("2026-11-26", "2026-11-26")).toBe("renova hoje");
    expect(renewalLabel("2026-11-27", "2026-11-26")).toBe("renova amanhã");
    expect(renewalLabel("2026-12-01", "2026-11-26")).toBe("renova em 5 dias");
    expect(renewalLabel("2026-12-15", "2026-11-26")).toBe("renova 15/12");
  });

  it("separa as assinaturas, ordena pela próxima cobrança e soma mês e ano", () => {
    const cats = new Map([
      ["c-sub", "Assinaturas"],
      ["c-casa", "Moradia"],
    ]);
    const rec = (over: Partial<RecurrenceLike>): RecurrenceLike => ({
      id: "x",
      kind: "expense",
      description: "x",
      amount: 1000,
      day_of_month: 10,
      starts_on: "2026-11-01",
      category_id: "c-sub",
      ...over,
    });
    const { items, monthly, yearly } = summarizeSubscriptions(
      [
        rec({ id: "netflix", description: "Netflix", amount: 5590, day_of_month: 5 }),
        rec({ id: "spotify", description: "Spotify", amount: 2190, day_of_month: 28 }),
        rec({ id: "aluguel", description: "Aluguel", amount: 150000, category_id: "c-casa" }),
        rec({ id: "salario", kind: "income", amount: 300000 }),
        rec({ id: "sem-cat", category_id: null }),
        rec({ id: "futura", description: "Academia", amount: 9990, day_of_month: 10, starts_on: "2027-01-01" }),
      ],
      cats,
      "2026-11-26",
    );
    expect(items.map((s) => s.id)).toEqual(["spotify", "netflix", "futura"]);
    expect(items[0]).toMatchObject({ next: "2026-11-28", renewal: "renova em 2 dias" });
    expect(items[2].next).toBe("2027-01-10"); // começa só em janeiro
    expect(monthly).toBe(5590 + 2190 + 9990);
    expect(yearly).toBe(monthly * 12);
  });
});

describe("reserva em meses", () => {
  it("usa a média dos últimos 3 meses com gastos", () => {
    const r = reserveMonths(600000, [0, 400000, 200000, 300000, 100000], 50000);
    expect(r).toEqual({ months: 3, monthlyCost: 200000, basis: "history", monthsUsed: 3 });
  });

  it("sem histórico, usa o mês atual", () => {
    expect(reserveMonths(300000, [0, 0], 150000)).toMatchObject({ months: 2, basis: "current" });
  });

  it("saldo zerado ou negativo cobre zero meses", () => {
    expect(reserveMonths(-5000, [100000], 0)?.months).toBe(0);
  });

  it("sem gasto nenhum não dá para calcular", () => {
    expect(reserveMonths(100000, [], 0)).toBeNull();
  });

  it("formata com uma casa e o singular abaixo de 2", () => {
    expect(formatMonths(0.43)).toBe("0,4 mês");
    expect(formatMonths(1.96)).toBe("2 meses");
    expect(formatMonths(2.46)).toBe("2,5 meses");
    expect(formatMonths(12)).toBe("12 meses");
  });
});

describe("splitMoney (ocultar valores)", () => {
  it("separa os valores em reais do texto", () => {
    const text = "Sobram R$ 1.234,56, cerca de R$ 50,00 por dia.";
    expect(splitMoney(text)).toEqual([
      { text: "Sobram ", money: false },
      { text: "R$ 1.234,56", money: true },
      { text: ", cerca de ", money: false },
      { text: "R$ 50,00", money: true },
      { text: " por dia.", money: false },
    ]);
  });

  it("texto sem valores fica inteiro", () => {
    expect(splitMoney("Nenhuma conta")).toEqual([{ text: "Nenhuma conta", money: false }]);
  });

  it("aceita valores grandes e sem centavos", () => {
    expect(splitMoney("R$ 1.200.000").filter((p) => p.money).map((p) => p.text)).toEqual(["R$ 1.200.000"]);
  });
});
