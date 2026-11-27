import { addDays } from "@/lib/dates";
import {
  billNotice,
  sortNotices,
  taskNotice,
  type BillInput,
  type Notice,
  type TaskInput,
} from "@/lib/notices";
import { createClient } from "@/lib/supabase/server";

/** Avisos do sino: tarefas/lembretes vencidos ou de hoje e contas a pagar próximas. */
export async function getNotices(today: string): Promise<Notice[]> {
  const db = await createClient();
  const [tasksRes, billsRes] = await Promise.all([
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
      .select("id, amount, date, description")
      .is("deleted_at", null)
      .eq("type", "expense")
      .eq("status", "pending")
      .lte("date", addDays(today, 3))
      .order("date", { ascending: true })
      .limit(8),
  ]);

  const tasks = ((tasksRes.data ?? []) as TaskInput[]).map((t) => taskNotice(t, today));
  const bills = ((billsRes.data ?? []) as BillInput[]).map((b) => billNotice(b, today));
  return sortNotices([...tasks, ...bills]);
}
