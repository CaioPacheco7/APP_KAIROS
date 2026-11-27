/**
 * Avisos do sino ("o que precisa de você"): tarefas e lembretes que venceram
 * ou vencem hoje, contas e faturas atrasadas ou que vencem em poucos dias, e
 * categorias perto do limite do orçamento.
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
  kind: "task" | "reminder" | "bill" | "invoice" | "budget";
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

export type InvoiceNoticeInput = {
  cardId: string;
  cardName: string;
  /** mês da fatura ("2026-12") */
  month: string;
  due: string;
  remaining: number;
};

/** Fatura com saldo a pagar: vencida ou vencendo em até 3 dias. */
export function invoiceNotice(invoice: InvoiceNoticeInput, today: string): Notice {
  const state = dueState(invoice.due, today);
  const when =
    state === "overdue"
      ? `venceu ${formatDayMonth(invoice.due)}`
      : state === "today"
        ? "vence hoje"
        : `vence ${formatDayMonth(invoice.due)}`;
  return {
    id: `invoice-${invoice.cardId}-${invoice.month}`,
    kind: "invoice",
    title: `Fatura ${invoice.cardName}`,
    detail: `${formatBRL(invoice.remaining)} · ${when}`,
    href: `/cartoes?cartao=${invoice.cardId}&fatura=${invoice.month}`,
    state,
    date: invoice.due,
  };
}

export type BudgetNoticeInput = {
  categoryId: string;
  name: string;
  spent: number;
  limit: number;
  level: "ok" | "near" | "over";
};

/**
 * Orçamento (RN-12): a partir de 80% do limite vira aviso; em 100% ou mais,
 * aviso de risco (mesmo destaque de um atraso).
 */
export function budgetNotice(line: BudgetNoticeInput, today: string): Notice {
  const pct = Math.round((line.spent / line.limit) * 100);
  const detail =
    line.spent > line.limit
      ? `passou ${formatBRL(line.spent - line.limit)} do limite de ${formatBRL(line.limit)}`
      : line.spent === line.limit
        ? `chegou ao limite de ${formatBRL(line.limit)}`
        : `${formatBRL(line.spent)} de ${formatBRL(line.limit)} · ${pct}% do limite`;
  return {
    id: `budget-${line.categoryId}`,
    kind: "budget",
    title: `Orçamento · ${line.name}`,
    detail,
    href: "/mes#orcamento",
    state: line.level === "over" ? "overdue" : "soon",
    date: today,
  };
}

const ORDER: Record<DueState, number> = { overdue: 0, today: 1, soon: 2, later: 3 };

/** Atrasados primeiro, depois hoje, depois em breve; dentro de cada grupo, por data. */
export function sortNotices(list: Notice[]): Notice[] {
  return [...list].sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.date.localeCompare(b.date));
}
