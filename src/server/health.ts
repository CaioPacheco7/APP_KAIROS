import { assessHealth, type Health } from "@/lib/finance/health";
import { monthBounds } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ensureRecurring, getProfile } from "./queries";

type Row = {
  type: "income" | "expense";
  amount: number;
  status: "pending" | "settled";
  recurrence_id: string | null;
};

export type MonthSnapshot = {
  health: Health;
  income: number;
  incomeSettled: number;
  committed: number;
  expenseSettled: number;
  fixed: number;
};

/** Números do mês + semáforo. Gera antes as contas fixas do mês, se faltarem. */
export async function getMonthSnapshot(
  month: string,
  today: string,
): Promise<MonthSnapshot> {
  await ensureRecurring(month);

  const db = await createClient();
  const { start, end } = monthBounds(month);
  const [{ data }, profile] = await Promise.all([
    db
      .from("transactions")
      .select("type, amount, status, recurrence_id")
      .is("deleted_at", null)
      .in("type", ["income", "expense"])
      .gte("date", start)
      .lt("date", end),
    getProfile(),
  ]);

  let income = 0;
  let incomeSettled = 0;
  let committed = 0;
  let expenseSettled = 0;
  let fixed = 0;
  for (const row of (data ?? []) as Row[]) {
    const amount = Number(row.amount);
    if (row.type === "income") {
      income += amount;
      if (row.status === "settled") incomeSettled += amount;
    } else {
      committed += amount;
      if (row.status === "settled") expenseSettled += amount;
      if (row.recurrence_id) fixed += amount;
    }
  }

  const health = assessHealth({
    income,
    committed,
    fixed,
    variable: committed - fixed,
    month,
    today,
    greenMax: profile?.health_green_max,
    yellowMax: profile?.health_yellow_max,
  });

  return { health, income, incomeSettled, committed, expenseSettled, fixed };
}
