/**
 * Regras da tela Rotina (puras e testáveis): totais da semana de hábitos e as
 * raias do quadro de tarefas.
 */
import type { DayStatus } from "@/lib/habits";

export type DayTotal = { date: string; scheduled: number; done: number };

/**
 * Para cada um dos últimos dias: quantos hábitos estavam previstos e quantos
 * foram feitos (dias fora da agenda não contam como previstos).
 */
export function weekTotals(
  habits: Array<{ days: Array<{ date: string; status: DayStatus }> }>,
): DayTotal[] {
  const byDate = new Map<string, DayTotal>();
  for (const habit of habits) {
    for (const day of habit.days) {
      const total = byDate.get(day.date) ?? { date: day.date, scheduled: 0, done: 0 };
      if (day.status !== "off") total.scheduled += 1;
      if (day.status === "done") total.done += 1;
      byDate.set(day.date, total);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** % dos hábitos previstos que foram feitos no período (null se nada previsto). */
export function completionRate(totals: DayTotal[]): number | null {
  const scheduled = totals.reduce((s, d) => s + d.scheduled, 0);
  if (scheduled === 0) return null;
  return (totals.reduce((s, d) => s + d.done, 0) / scheduled) * 100;
}

export type Lane = "overdue" | "today" | "upcoming" | "nodate";

export const LANES: ReadonlyArray<{ id: Lane; label: string }> = [
  { id: "overdue", label: "Atrasadas" },
  { id: "today", label: "Hoje" },
  { id: "upcoming", label: "Próximos dias" },
  { id: "nodate", label: "Sem data" },
];

/** Em que raia do quadro fica uma tarefa aberta. */
export function laneFor(dueDate: string | null, today: string): Lane {
  if (!dueDate) return "nodate";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}
