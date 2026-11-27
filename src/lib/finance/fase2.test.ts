import { describe, expect, it } from "vitest";
import { addMonthsClamped } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { budgetNotice, invoiceNotice } from "@/lib/notices";
import {
  averageByCategory,
  budgetLevel,
  budgetLines,
  budgetTotals,
  effectiveBudgets,
  monthElapsed,
  rollUpSpending,
} from "./budget";
import {
  cardUsage,
  currentInvoice,
  describeInvoice,
  describeInvoices,
  installmentLabel,
  invoiceDates,
  invoiceFor,
  invoiceName,
  invoiceWhen,
  planPurchase,
  splitInstallments,
} from "./cards";

/** fecha dia 28, vence dia 5 do mês seguinte (o mais comum) */
const NEXT = { closingDay: 28, dueDay: 5 };
/** fecha dia 3, vence dia 10 do mesmo mês */
const SAME = { closingDay: 3, dueDay: 10 };

describe("addMonthsClamped", () => {
  it("mesmo dia nos meses seguintes, com o último dia em mês curto", () => {
    expect(addMonthsClamped("2026-11-26", 1)).toBe("2026-12-26");
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonthsClamped("2028-01-30", 1)).toBe("2028-02-29");
  });
});

describe("em qual fatura cai a compra (RN-06)", () => {
  it("fecha num mês e vence no outro", () => {
    expect(invoiceFor("2026-11-26", NEXT)).toBe("2026-12");
    // no dia do fechamento ou depois: fatura seguinte
    expect(invoiceFor("2026-11-28", NEXT)).toBe("2027-01");
    expect(invoiceFor("2026-11-30", NEXT)).toBe("2027-01");
    expect(invoiceFor("2026-12-01", NEXT)).toBe("2027-01");
  });

  it("fecha e vence no mesmo mês", () => {
    expect(invoiceFor("2026-11-02", SAME)).toBe("2026-11");
    expect(invoiceFor("2026-11-03", SAME)).toBe("2026-12");
    expect(invoiceFor("2026-11-26", SAME)).toBe("2026-12");
  });

  it("fechamento no dia 31 em mês curto vale no último dia", () => {
    const c31 = { closingDay: 31, dueDay: 8 };
    expect(invoiceFor("2026-02-27", c31)).toBe("2026-03");
    expect(invoiceFor("2026-02-28", c31)).toBe("2026-04");
    expect(invoiceDates("2026-03", c31)).toEqual({ closing: "2026-02-28", due: "2026-03-08" });
  });

  it("datas de cada fatura", () => {
    expect(invoiceDates("2026-12", NEXT)).toEqual({ closing: "2026-11-28", due: "2026-12-05" });
    expect(invoiceDates("2026-11", SAME)).toEqual({ closing: "2026-11-03", due: "2026-11-10" });
    expect(invoiceDates("2027-01", NEXT)).toEqual({ closing: "2026-12-28", due: "2027-01-05" });
  });
});

describe("parcelas (RN-07)", () => {
  it("o resto dos centavos vai para a primeira", () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(9000, 3)).toEqual([3000, 3000, 3000]);
    expect(splitInstallments(5, 1)).toEqual([5]);
    expect(splitInstallments(10000, 3).reduce((a, b) => a + b)).toBe(10000);
  });

  it("uma parcela por fatura, mês a mês", () => {
    const plan = planPurchase({ amount: 120000, date: "2026-11-30", installments: 3, cycle: NEXT });
    expect(plan).toEqual([
      { number: 1, amount: 40000, date: "2026-11-30", invoiceMonth: "2027-01" },
      { number: 2, amount: 40000, date: "2026-12-30", invoiceMonth: "2027-02" },
      { number: 3, amount: 40000, date: "2027-01-30", invoiceMonth: "2027-03" },
    ]);
  });

  it("à vista é uma parcela só", () => {
    expect(planPurchase({ amount: 5000, date: "2026-11-26", installments: 1, cycle: NEXT })).toEqual([
      { number: 1, amount: 5000, date: "2026-11-26", invoiceMonth: "2026-12" },
    ]);
  });

  it("texto das parcelas", () => {
    expect(installmentLabel(10000, 3, formatBRL)).toMatch(/^3x de R\$\s33,33 \(a 1ª R\$\s33,34\)$/);
    expect(installmentLabel(9000, 3, formatBRL)).toMatch(/^3x de R\$\s30,00$/);
    expect(installmentLabel(9000, 1, formatBRL)).toBe("à vista");
  });
});

describe("situação da fatura", () => {
  const TODAY = "2026-11-26"; // fatura aberta: dezembro (fecha 28/11)
  const inv = (month: string, charges: number, paid = 0) => ({ month, charges, paid, items: 1 });

  it("aberta, fechada, vencida, paga e próxima", () => {
    expect(describeInvoice(inv("2026-12", 5000), NEXT, TODAY).state).toBe("open");
    expect(describeInvoice(inv("2027-01", 5000), NEXT, TODAY).state).toBe("future");
    expect(describeInvoice(inv("2026-11", 5000, 5000), NEXT, TODAY).state).toBe("paid");
    // novembro venceu dia 05/11 e ficou faltando
    expect(describeInvoice(inv("2026-11", 5000, 2000), NEXT, TODAY)).toMatchObject({ state: "overdue", remaining: 3000 });
    // fechou 28/10 mas ainda não venceu (hoje 02/11)
    expect(describeInvoice(inv("2026-11", 5000), NEXT, "2026-11-02").state).toBe("closed");
    // pago a mais não fica negativo
    expect(describeInvoice(inv("2026-11", 5000, 6000), NEXT, TODAY).remaining).toBe(0);
  });

  it("textos", () => {
    const open = describeInvoice(inv("2026-12", 5000), NEXT, TODAY);
    expect(invoiceWhen(open)).toBe("fecha 28/11 · vence 05/12");
    expect(invoiceWhen(describeInvoice(inv("2026-11", 5000), NEXT, TODAY))).toBe("venceu 05/11");
    expect(invoiceName("2026-12", TODAY)).toBe("fatura de dezembro");
    expect(invoiceName("2027-01", TODAY)).toBe("fatura de janeiro de 2027");
  });

  it("a fatura que pede atenção: a vencida/fechada com saldo; senão a aberta", () => {
    const list = describeInvoices([inv("2026-12", 5000), inv("2026-11", 5000, 1000), inv("2026-10", 3000, 3000)], NEXT, TODAY);
    expect(list.map((i) => i.month)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(currentInvoice(list, NEXT, TODAY).month).toBe("2026-11");
    const paid = describeInvoices([inv("2026-12", 5000), inv("2026-11", 5000, 5000)], NEXT, TODAY);
    expect(currentInvoice(paid, NEXT, TODAY).month).toBe("2026-12");
    // sem nenhuma compra: a aberta, zerada
    expect(currentInvoice([], NEXT, TODAY)).toMatchObject({ month: "2026-12", charges: 0, state: "open" });
  });

  it("limite usado inclui as parcelas futuras (RN-08)", () => {
    const usage = cardUsage([inv("2026-11", 5000, 5000), inv("2026-12", 30000), inv("2027-01", 20000)], 100000);
    expect(usage).toEqual({ used: 50000, available: 50000, ratio: 0.5 });
    expect(cardUsage([inv("2026-12", 120000)], 100000).available).toBe(-20000);
    expect(cardUsage([], 0).ratio).toBeNull();
  });
});

describe("orçamento (RN-12)", () => {
  const rows = [
    { category_id: "mercado", month: "2026-09-01", amount: 60000 },
    { category_id: "mercado", month: "2026-11-01", amount: 70000 },
    { category_id: "lazer", month: "2026-10-01", amount: 30000 },
    { category_id: "lazer", month: "2026-11-01", amount: 0 },
    { category_id: "uber", month: "2026-12-01", amount: 20000 },
  ];

  it("vale o limite mais recente até o mês; 0 tira o limite", () => {
    expect(effectiveBudgets(rows, "2026-10")).toEqual(new Map([["mercado", 60000], ["lazer", 30000]]));
    expect(effectiveBudgets(rows, "2026-11")).toEqual(new Map([["mercado", 70000]]));
    expect(effectiveBudgets(rows, "2027-03")).toEqual(new Map([["mercado", 70000], ["uber", 20000]]));
    expect(effectiveBudgets(rows, "2026-08").size).toBe(0);
  });

  it("alertas em 80% e 100%", () => {
    expect(budgetLevel(7900, 10000)).toBe("ok");
    expect(budgetLevel(8000, 10000)).toBe("near");
    expect(budgetLevel(10000, 10000)).toBe("over");
    expect(budgetLevel(12000, 10000)).toBe("over");
  });

  it("a categoria-pai soma as subcategorias", () => {
    const cats = [
      { id: "casa", name: "Casa", parent_id: null },
      { id: "luz", name: "Luz", parent_id: "casa" },
    ];
    const rolled = rollUpSpending(new Map([["casa", 1000], ["luz", 500]]), cats);
    expect(rolled.get("casa")).toBe(1500);
    expect(rolled.get("luz")).toBe(500);
  });

  it("linhas da mais apertada para a mais folgada, com totais", () => {
    const cats = [
      { id: "mercado", name: "Mercado", parent_id: null },
      { id: "lazer", name: "Lazer", parent_id: null },
      { id: "uber", name: "Transporte", parent_id: null },
    ];
    const lines = budgetLines(
      new Map([["mercado", 60000], ["lazer", 20000], ["uber", 10000]]),
      new Map([["mercado", 30000], ["lazer", 25000], ["uber", 8500]]),
      cats,
    );
    expect(lines.map((l) => [l.name, l.level, l.left])).toEqual([
      ["Lazer", "over", -5000],
      ["Transporte", "near", 1500],
      ["Mercado", "ok", 30000],
    ]);
    expect(budgetTotals(lines)).toEqual({ limit: 90000, spent: 63500, over: 1, near: 1 });
  });

  it("categoria com limite e sem gasto aparece zerada", () => {
    const [line] = budgetLines(new Map([["x", 5000]]), new Map(), [{ id: "x", name: "Saúde", parent_id: null }]);
    expect(line).toMatchObject({ spent: 0, left: 5000, ratio: 0, level: "ok" });
  });

  it("ritmo do mês e média para sugerir limite", () => {
    expect(monthElapsed("2026-11", "2026-11-15")).toBe(0.5);
    expect(monthElapsed("2026-10", "2026-11-15")).toBeNull();
    const avg = averageByCategory(
      [
        { category_id: "m", total: 30000 },
        { category_id: "m", total: 60000 },
        { category_id: null, total: 999 },
      ],
      3,
    );
    expect(avg).toEqual(new Map([["m", 30000]]));
  });
});

describe("avisos de fatura e de orçamento", () => {
  const TODAY = "2026-11-26";

  it("fatura vencida, de hoje e em breve", () => {
    const base = { cardId: "c1", cardName: "Roxinho", month: "2026-12", remaining: 45000 };
    const soon = invoiceNotice({ ...base, due: "2026-11-28" }, TODAY);
    expect(soon).toMatchObject({ kind: "invoice", title: "Fatura Roxinho", state: "soon", href: "/cartoes?cartao=c1&fatura=2026-12" });
    expect(soon.detail).toMatch(/^R\$\s450,00 · vence 28\/11$/);
    expect(invoiceNotice({ ...base, due: TODAY }, TODAY).detail).toMatch(/vence hoje$/);
    expect(invoiceNotice({ ...base, due: "2026-11-05" }, TODAY)).toMatchObject({ state: "overdue" });
  });

  it("orçamento perto, no limite e acima", () => {
    const base = { categoryId: "m", name: "Mercado", limit: 60000 };
    const near = budgetNotice({ ...base, spent: 54000, level: "near" }, TODAY);
    expect(near).toMatchObject({ kind: "budget", title: "Orçamento · Mercado", state: "soon", href: "/mes#orcamento" });
    expect(near.detail).toMatch(/^R\$\s540,00 de R\$\s600,00 · 90% do limite$/);
    expect(budgetNotice({ ...base, spent: 60000, level: "over" }, TODAY).detail).toMatch(/^chegou ao limite de R\$\s600,00$/);
    const over = budgetNotice({ ...base, spent: 64000, level: "over" }, TODAY);
    expect(over.state).toBe("overdue");
    expect(over.detail).toMatch(/^passou R\$\s40,00 do limite de R\$\s600,00$/);
  });
});
