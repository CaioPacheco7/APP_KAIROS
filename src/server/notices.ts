import { addDays } from "@/lib/dates";
import { isSubscriptionCategory } from "@/lib/finance/subscriptions";
import {
  billNotice,
  budgetNotice,
  dueState,
  invoiceNotice,
  sortNotices,
  taskNotice,
  type BillInput,
  type Notice,
  type TaskInput,
} from "@/lib/notices";
import { createClient } from "@/lib/supabase/server";
import { getBudgetOverview } from "./budget-data";
import { getCardSummaries } from "./card-data";
import { getCategoryNames } from "./queries";

/**
 * Avisos do sino: tarefas/lembretes vencidos ou de hoje, contas e faturas a
 * pagar próximas e categorias perto do limite do orçamento (mês atual).
 */
export async function getNotices(today: string): Promise<Notice[]> {
  const db = await createClient();
  const [tasksRes, billsRes, categoryNames, cards, budget] = await Promise.all([
    db
      .from("tasks")
      .select("id, kind, title, due_date, remind_at")
      .is("deleted_at", null)
      .eq("status", "open")
      .not("due_date", "is", null)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(8),
    db
      .from("transactions")
      .select("id, amount, date, description, category_id")
      .is("deleted_at", null)
      .eq("type", "expense")
      .eq("status", "pending")
      .lte("date", addDays(today, 3))
      .order("date", { ascending: true })
      .limit(8),
    getCategoryNames(),
    getCardSummaries(today),
    getBudgetOverview(today.slice(0, 7), today),
  ]);

  const tasks = ((tasksRes.data ?? []) as TaskInput[]).map((t) => taskNotice(t, today));
  const bills = ((billsRes.data ?? []) as (BillInput & { category_id: string | null })[]).map((b) =>
    billNotice(
      {
        ...b,
        subscription: b.category_id !== null && isSubscriptionCategory(categoryNames.get(b.category_id)),
      },
      today,
    ),
  );
  const invoices = cards.flatMap(({ card, invoices }) =>
    invoices
      .filter((i) => (i.state === "closed" || i.state === "overdue") && i.remaining > 0 && dueState(i.due, today) !== "later")
      .map((i) =>
        invoiceNotice({ cardId: card.id, cardName: card.name, month: i.month, due: i.due, remaining: i.remaining }, today),
      ),
  );
  const budgets = budget.lines.filter((l) => l.level !== "ok").map((l) => budgetNotice(l, today));
  return sortNotices([...tasks, ...bills, ...invoices, ...budgets]);
}
