import { describe, expect, it } from "vitest";
import { capturePreview, relativeDay } from "./capture/preview";
import { parseCapture } from "./capture/parse";
import { completionRate, laneFor, weekTotals } from "./routine";
import { capitalize } from "./utils";

const TODAY = "2026-11-25";

describe("weekTotals: hábitos previstos e feitos por dia", () => {
  it("soma por data e ignora dias fora da agenda", () => {
    const totals = weekTotals([
      { days: [{ date: "2026-11-24", status: "done" }, { date: "2026-11-25", status: "open" }] },
      { days: [{ date: "2026-11-24", status: "missed" }, { date: "2026-11-25", status: "off" }] },
    ]);
    expect(totals).toEqual([
      { date: "2026-11-24", scheduled: 2, done: 1 },
      { date: "2026-11-25", scheduled: 1, done: 0 },
    ]);
    expect(completionRate(totals)).toBeCloseTo(33.33, 1);
  });

  it("sem hábitos previstos, a taxa é nula (não 0%)", () => {
    expect(completionRate([{ date: TODAY, scheduled: 0, done: 0 }])).toBeNull();
  });
});

describe("laneFor: raia do quadro de tarefas", () => {
  it.each([
    [null, "nodate"],
    ["2026-11-20", "overdue"],
    [TODAY, "today"],
    ["2026-12-01", "upcoming"],
  ] as const)("%s → %s", (due, lane) => {
    expect(laneFor(due, TODAY)).toBe(lane);
  });
});

describe("prévia do registro rápido (busca do topo)", () => {
  it("dia relativo", () => {
    expect(relativeDay(TODAY, TODAY)).toBe("hoje");
    expect(relativeDay("2026-11-24", TODAY)).toBe("ontem");
    expect(relativeDay("2026-11-26", TODAY)).toBe("amanhã");
    expect(relativeDay("2026-12-02", TODAY)).toBe("02/12");
  });

  it("gasto com categoria reconhecida", () => {
    const p = capturePreview(parseCapture("uber 23,90 ontem", TODAY), TODAY);
    expect(p?.kind).toBe("transaction");
    expect(p?.title).toMatch(/^Gasto de R\$\s23,90$/);
    expect(p?.detail).toContain("Transporte");
    expect(p?.detail).toContain("ontem");
  });

  it("entrada", () => {
    const p = capturePreview(parseCapture("recebi 3000 de salário", TODAY), TODAY);
    expect(p?.title).toMatch(/^Entrada de R\$\s3\.000,00$/);
  });

  it("tarefa, lembrete e nota", () => {
    expect(capturePreview(parseCapture("tarefa: renovar CNH até 20/12", TODAY), TODAY)).toMatchObject({
      kind: "task",
      detail: "prazo 20/12",
    });
    expect(capturePreview(parseCapture("lembrar de pagar a luz amanhã 9h", TODAY), TODAY)).toMatchObject({
      kind: "reminder",
      detail: "amanhã às 09:00",
    });
    expect(capturePreview(parseCapture("anotar: ideia de presente", TODAY), TODAY)).toMatchObject({ kind: "note" });
  });

  it("texto que não é registro não vira prévia", () => {
    expect(capturePreview(parseCapture("transações", TODAY), TODAY)).toBeNull();
  });
});

describe("capitalize", () => {
  it("só a primeira letra", () => {
    expect(capitalize("novembro de 2026")).toBe("Novembro de 2026");
    expect(capitalize("")).toBe("");
  });
});
