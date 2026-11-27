/**
 * Assinaturas: contas fixas (recorrências de despesa) na categoria
 * "Assinaturas". Funções puras; "hoje" vem de quem chama.
 */

import { daysBetween, daysInMonth, formatDayMonth } from "@/lib/dates";

/** "Assinaturas", "assinatura", "Assinaturas e apps"... (sem ligar para acento e maiúsculas) */
export function isSubscriptionCategory(name: string | null | undefined): boolean {
  if (!name) return false;
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .startsWith("assinatura");
}

/**
 * Próxima cobrança de algo que vence todo dia `day` (dia 31 em mês curto vira
 * o último dia do mês, como nas contas fixas). Conta a partir de `from`.
 */
export function nextChargeDate(day: number, from: string): string {
  const month = from.slice(0, 7);
  const dayIn = (m: string) => Math.min(day, daysInMonth(m));
  const thisMonth = `${month}-${String(dayIn(month)).padStart(2, "0")}`;
  if (thisMonth >= from) return thisMonth;
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return `${next}-${String(dayIn(next)).padStart(2, "0")}`;
}

/** "renova hoje", "renova amanhã", "renova em 5 dias", "renova 12/12" */
export function renewalLabel(next: string, today: string): string {
  const days = daysBetween(today, next);
  if (days <= 0) return "renova hoje";
  if (days === 1) return "renova amanhã";
  if (days <= 7) return `renova em ${days} dias`;
  return `renova ${formatDayMonth(next)}`;
}

export type RecurrenceLike = {
  id: string;
  kind: "income" | "expense";
  description: string;
  amount: number;
  day_of_month: number;
  starts_on: string;
  category_id: string | null;
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  day: number;
  next: string;
  /** dias até a próxima cobrança (0 = hoje) */
  daysUntil: number;
  renewal: string;
};

/** Assinaturas ativas, da próxima cobrança para a mais distante, com o total por mês e por ano. */
export function summarizeSubscriptions(
  recurrences: RecurrenceLike[],
  categoryNames: Map<string, string>,
  today: string,
): { items: Subscription[]; monthly: number; yearly: number } {
  const items = recurrences
    .filter(
      (r) =>
        r.kind === "expense" &&
        r.category_id !== null &&
        isSubscriptionCategory(categoryNames.get(r.category_id)),
    )
    .map((r) => {
      const next = nextChargeDate(r.day_of_month, r.starts_on > today ? r.starts_on : today);
      return {
        id: r.id,
        name: r.description,
        amount: Number(r.amount),
        day: r.day_of_month,
        next,
        daysUntil: daysBetween(today, next),
        renewal: renewalLabel(next, today),
      };
    })
    .sort((a, b) => a.next.localeCompare(b.next) || b.amount - a.amount);

  const monthly = items.reduce((sum, s) => sum + s.amount, 0);
  return { items, monthly, yearly: monthly * 12 };
}
