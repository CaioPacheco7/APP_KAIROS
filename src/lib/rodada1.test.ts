import { describe, expect, it } from "vitest";
import { capturePreview } from "./capture/preview";
import { parseCapture } from "./capture/parse";
import { daysForPreset, daysLabel, extractRepeat, presetFor, repeatLabel } from "./reminders";

const TODAY = "2026-11-27"; // sexta

describe("Registrar entende afazeres sem valor", () => {
  it("“precisava criar uma conta PJ” vira tarefa (era recusado)", () => {
    expect(parseCapture("precisava criar uma conta PJ", TODAY)).toEqual({
      kind: "task",
      title: "Criar uma conta PJ",
      dueDate: null,
    });
  });

  it("com data vira tarefa com prazo; com hora, lembrete", () => {
    expect(parseCapture("preciso criar uma conta PJ amanhã", TODAY)).toEqual({
      kind: "task",
      title: "Criar uma conta PJ",
      dueDate: "2026-11-28",
    });
    expect(parseCapture("tenho que ligar pro banco amanhã às 10h", TODAY)).toEqual({
      kind: "reminder",
      title: "Ligar pro banco",
      date: "2026-11-28",
      time: "10:00",
    });
  });

  it("começa com verbo de afazer", () => {
    expect(parseCapture("renovar a CNH até 20/12", TODAY)).toMatchObject({ kind: "task", dueDate: "2026-12-20" });
    expect(parseCapture("pagar a luz amanhã", TODAY)).toMatchObject({ kind: "task", title: "Pagar a luz", dueDate: "2026-11-28" });
  });

  it("gasto continua gasto", () => {
    expect(parseCapture("uber 23,90 ontem", TODAY)).toMatchObject({ kind: "transaction", amount: 2390 });
    expect(parseCapture("paguei R$ 150 de luz", TODAY)).toMatchObject({ kind: "transaction", amount: 15000 });
    // verbo de afazer, mas com R$: é gasto
    expect(parseCapture("pagar R$ 300 de luz", TODAY)).toMatchObject({ kind: "transaction", amount: 30000 });
  });

  it("conversa solta continua sem registrar", () => {
    expect(parseCapture("oi tudo bem", TODAY).kind).toBe("unknown");
    expect(parseCapture("gastei muito hoje", TODAY).kind).toBe("unknown");
  });
});

describe("lembrete fixo pelo Registrar", () => {
  it("“beber 2,5 L de água todo dia às 10h”", () => {
    expect(parseCapture("beber 2,5 L de água todo dia às 10h", TODAY)).toEqual({
      kind: "reminder",
      title: "Beber 2,5 L de água",
      date: TODAY,
      time: "10:00",
      repeat: [1, 2, 3, 4, 5, 6, 7],
    });
  });

  it("“lembrar de tomar remédio dias úteis 8h”", () => {
    expect(parseCapture("lembrar de tomar remédio dias úteis 8h", TODAY)).toMatchObject({
      kind: "reminder",
      title: "Tomar remédio",
      time: "08:00",
      repeat: [1, 2, 3, 4, 5],
    });
  });

  it("sem horário: às 9h", () => {
    expect(parseCapture("lembrar de regar as plantas toda segunda e quinta", TODAY)).toMatchObject({
      kind: "reminder",
      title: "Regar as plantas",
      time: "09:00",
      repeat: [1, 4],
    });
  });

  it("prévia mostra a repetição", () => {
    const intent = parseCapture("beber água todo dia às 10h", TODAY);
    expect(capturePreview(intent, TODAY)).toEqual({ kind: "reminder", title: "Lembrete fixo: Beber água", detail: "todo dia às 10:00" });
  });
});

describe("repetição", () => {
  it.each([
    ["todo dia", [1, 2, 3, 4, 5, 6, 7]],
    ["todos os dias", [1, 2, 3, 4, 5, 6, 7]],
    ["dias úteis", [1, 2, 3, 4, 5]],
    ["de segunda a sexta", [1, 2, 3, 4, 5]],
    ["no fim de semana", [6, 7]],
    ["toda terça", [2]],
    ["todas as segundas e quartas", [1, 3]],
    ["toda terça-feira e quinta-feira", [2, 4]],
  ] as const)("%s", (text, days) => {
    expect(extractRepeat(`algo ${text}`).days).toEqual(days);
  });

  it("sem repetição", () => {
    expect(extractRepeat("pagar a luz amanhã").days).toBeNull();
    // "dia 10" é data, não repetição
    expect(extractRepeat("pagar a luz dia 10").days).toBeNull();
  });

  it("textos", () => {
    expect(daysLabel([1, 2, 3, 4, 5, 6, 7])).toBe("todo dia");
    expect(daysLabel([5, 1, 2, 3, 4])).toBe("dias úteis");
    expect(daysLabel([6, 7])).toBe("fim de semana");
    expect(daysLabel([3])).toBe("toda qua");
    expect(daysLabel([1, 3, 5])).toBe("seg, qua e sex");
    expect(repeatLabel([1, 2, 3, 4, 5, 6, 7], "10:00:00")).toBe("todo dia às 10:00");
  });

  it("predefinições do formulário", () => {
    expect(presetFor(null)).toBe("once");
    expect(presetFor([1, 2, 3, 4, 5, 6, 7])).toBe("daily");
    expect(presetFor([1, 2, 3, 4, 5])).toBe("weekdays");
    expect(presetFor([2, 4])).toBe("custom");
    expect(daysForPreset("weekdays")).toEqual([1, 2, 3, 4, 5]);
    expect(daysForPreset("custom", [4, 2, 2, 9])).toEqual([2, 4]);
    expect(daysForPreset("once")).toBeNull();
  });
});

describe("saldo do cartão de antes de começar", () => {
  const NEXT = { closingDay: 28, dueDay: 5 }; // fecha 28, vence 5 do mês seguinte
  it("próxima fatura: a fechada que ainda não venceu, senão a aberta", async () => {
    const { nextDueInvoice } = await import("./finance/cards");
    // 27/11: a de dezembro ainda está aberta (fecha 28/11, vence 05/12)
    expect(nextDueInvoice(NEXT, "2026-11-27")).toEqual({ month: "2026-12", closing: "2026-11-28", due: "2026-12-05" });
    // 30/11: a de dezembro fechou e vence 05/12 (é ela que se paga)
    expect(nextDueInvoice(NEXT, "2026-11-30")).toEqual({ month: "2026-12", closing: "2026-11-28", due: "2026-12-05" });
    // 06/12: a de dezembro já venceu; a próxima é a de janeiro (aberta)
    expect(nextDueInvoice(NEXT, "2026-12-06").month).toBe("2027-01");
  });

  it("valor atual + parcelas antigas nas faturas seguintes", async () => {
    const { openingPlan } = await import("./finance/cards");
    const plan = openingPlan({ cycle: NEXT, today: "2026-11-27", current: 120000, perMonth: 20000, months: 3 });
    expect(plan).toEqual([
      { amount: 120000, invoiceMonth: "2026-12", date: "2026-11-27", number: null, total: null },
      { amount: 20000, invoiceMonth: "2027-01", date: "2026-12-27", number: 1, total: 3 },
      { amount: 20000, invoiceMonth: "2027-02", date: "2027-01-27", number: 2, total: 3 },
      { amount: 20000, invoiceMonth: "2027-03", date: "2027-02-27", number: 3, total: 3 },
    ]);
    // uma parcela só não vira grupo de parcelas
    expect(openingPlan({ cycle: NEXT, today: "2026-11-27", current: 0, perMonth: 5000, months: 1 })).toEqual([
      { amount: 5000, invoiceMonth: "2027-01", date: "2026-12-27", number: null, total: null },
    ]);
    expect(openingPlan({ cycle: NEXT, today: "2026-11-27", current: 0, perMonth: 0, months: 0 })).toEqual([]);
  });
});
