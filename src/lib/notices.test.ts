import { describe, expect, it } from "vitest";
import { billNotice, dueState, sortNotices, taskNotice } from "./notices";

const TODAY = "2026-11-25";

describe("dueState", () => {
  it.each([
    ["2026-11-24", "overdue"],
    ["2026-11-25", "today"],
    ["2026-11-26", "soon"],
    ["2026-11-28", "soon"],
    ["2026-11-29", "later"],
  ] as const)("%s → %s", (date, expected) => {
    expect(dueState(date, TODAY)).toBe(expected);
  });
});

describe("textos dos avisos", () => {
  it("tarefa atrasada (feminino) e lembrete atrasado (masculino)", () => {
    const task = taskNotice({ id: "1", kind: "task", title: "Renovar CNH", due_date: "2026-11-21", remind_at: null }, TODAY);
    expect(task.detail).toBe("Tarefa · atrasada desde 21/11");
    expect(task.href).toBe("/rotina");
    const reminder = taskNotice({ id: "2", kind: "reminder", title: "Ligar", due_date: "2026-11-21", remind_at: null }, TODAY);
    expect(reminder.detail).toBe("Lembrete · atrasado desde 21/11");
    expect(reminder.href).toBe("/rotina?aba=lembretes");
  });

  it("lembrete de hoje mostra o horário", () => {
    const n = taskNotice(
      { id: "3", kind: "reminder", title: "Fatura", due_date: TODAY, remind_at: "2026-11-25T21:00:00.000Z" },
      TODAY,
    );
    expect(n.detail).toBe("Lembrete · hoje às 18:00");
  });

  it("conta a pagar: atrasada, hoje e em breve", () => {
    expect(billNotice({ id: "a", amount: 9990, date: "2026-11-20", description: "Internet" }, TODAY).detail).toMatch(/R\$\s99,90 · venceu 20\/11/);
    expect(billNotice({ id: "b", amount: 20000, date: TODAY, description: null }, TODAY)).toMatchObject({ title: "Conta", state: "today" });
    expect(billNotice({ id: "c", amount: 100, date: "2026-11-27", description: "Luz" }, TODAY).detail).toMatch(/vence 27\/11$/);
  });
});

describe("sortNotices", () => {
  it("atrasados primeiro, depois hoje e em breve; por data dentro de cada grupo", () => {
    const list = [
      billNotice({ id: "soon", amount: 1, date: "2026-11-27", description: "x" }, TODAY),
      taskNotice({ id: "today", kind: "task", title: "y", due_date: TODAY, remind_at: null }, TODAY),
      billNotice({ id: "late2", amount: 1, date: "2026-11-23", description: "z" }, TODAY),
      taskNotice({ id: "late1", kind: "task", title: "w", due_date: "2026-11-20", remind_at: null }, TODAY),
    ];
    expect(sortNotices(list).map((n) => n.id)).toEqual(["task-late1", "bill-late2", "task-today", "bill-soon"]);
  });
});
