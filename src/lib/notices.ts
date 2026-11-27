/**
 * Avisos do sino ("o que precisa de você"): tarefas e lembretes que venceram
 * ou vencem hoje, e contas a pagar atrasadas ou que vencem em poucos dias.
 * Pura e testável: quem busca os dados é `server/notices.ts`.
 */
import { addDays, formatDayMonth, formatTimeBR } from "@/lib/dates";
import { formatBRL } from "@/lib/money";

export type DueState = "overdue" | "today" | "soon" | "later";

/** Situação de um vencimento em relação a hoje (`soonDays` = "em breve"). */
export function dueState(date: string, today: string, soonDays = 3): DueState {
  if (date < today) return "overdue";
  if (date === today) return "today";
  if (date <= addDays(today, soonDays)) return "soon";
  return "later";
}

export type Notice = {
  id: string;
  kind: "task" | "reminder" | "bill";
  title: string;
  detail: string;
  href: string;
  state: DueState;
  date: string;
};

export type TaskInput = {
  id: string;
  kind: "task" | "reminder";
  title: string;
  due_date: string;
  remind_at: string | null;
};

export type BillInput = {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  /** conta fixa na categoria Assinaturas: o aviso fala em "renova" */
  subscription?: boolean;
};

export function taskNotice(task: TaskInput, today: string): Notice {
  const state = dueState(task.due_date, today);
  const label = task.kind === "reminder" ? "Lembrete" : "Tarefa";
  let when: string;
  if (state === "overdue") {
    when = `${task.kind === "reminder" ? "atrasado" : "atrasada"} desde ${formatDayMonth(task.due_date)}`;
  }
  else if (task.remind_at) when = `hoje às ${formatTimeBR(task.remind_at)}`;
  else when = "para hoje";
  return {
    id: `task-${task.id}`,
    kind: task.kind,
    title: task.title,
    detail: `${label} · ${when}`,
    href: task.kind === "reminder" ? "/rotina?aba=lembretes" : "/rotina",
    state,
    date: task.due_date,
  };
}

export function billNotice(bill: BillInput, today: string): Notice {
  const state = dueState(bill.date, today);
  const verb = bill.subscription ? "renova" : "vence";
  const when =
    state === "overdue"
      ? `${bill.subscription ? "renovou" : "venceu"} ${formatDayMonth(bill.date)}`
      : state === "today"
        ? `${verb} hoje`
        : `${verb} ${formatDayMonth(bill.date)}`;
  return {
    id: `bill-${bill.id}`,
    kind: "bill",
    title: bill.description ?? (bill.subscription ? "Assinatura" : "Conta"),
    detail: `${formatBRL(bill.amount)} · ${when}`,
    href: "/mes",
    state,
    date: bill.date,
  };
}

const ORDER: Record<DueState, number> = { overdue: 0, today: 1, soon: 2, later: 3 };

/** Atrasados primeiro, depois hoje, depois em breve; dentro de cada grupo, por data. */
export function sortNotices(list: Notice[]): Notice[] {
  return [...list].sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.date.localeCompare(b.date));
}
