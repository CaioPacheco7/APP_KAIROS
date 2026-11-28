import { assessHealth, dailyAllowance, type DailyAllowance, type Health } from "@/lib/finance/health";
import { reserveMonths, type Reserve } from "@/lib/finance/reserve";
import { monthBounds, shiftMonth } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ensureRecurring, getProfile } from "./queries";

type Row = {
  type: "income" | "expense";
  amount: number;
  date: string;
  status: "pending" | "settled";
  recurrence_id: string | null;
  installment_number: number | null;
  before_start: boolean | null;
};

export type MonthSnapshot = {
  health: Health;
  /** "quanto ainda posso gastar hoje" (só no mês em andamento) */
  allowance: DailyAllowance | null;
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
      .select("type, amount, date, status, recurrence_id, installment_number, before_start")
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
  let spentToday = 0;
  for (const row of (data ?? []) as Row[]) {
    const amount = Number(row.amount);
    if (row.type === "income") {
      income += amount;
      if (row.status === "settled") incomeSettled += amount;
    } else {
      committed += amount;
      if (row.status === "settled") expenseSettled += amount;
      // contas fixas e parcelas a partir da 2ª: compromisso conhecido desde o início do mês
      // (e o que foi lançado como "antes de começar", que não é gasto de hoje)
      if (row.recurrence_id || Number(row.installment_number ?? 1) > 1 || row.before_start) fixed += amount;
      else if (row.date === today) spentToday += amount;
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
  const allowance = dailyAllowance({ income, committed, spentToday, month, today });

  return { health, allowance, income, incomeSettled, committed, expenseSettled, fixed };
}

/**
 * Reserva em meses: o saldo de hoje contra o gasto médio dos 3 meses
 * anteriores (pagos + agendados). Sem histórico, usa o mês atual.
 */
export async function getReserve(
  month: string,
  balance: number,
  currentCommitted: number,
): Promise<Reserve | null> {
  const db = await createClient();
  const { data } = await db
    .from("v_monthly_summary")
    .select("month, expense_settled, expense_pending")
    .gte("month", `${shiftMonth(month, -3)}-01`)
    .lt("month", `${month}-01`)
    .order("month", { ascending: true });
  const past = ((data ?? []) as { expense_settled: number; expense_pending: number }[]).map(
    (r) => Number(r.expense_settled) + Number(r.expense_pending),
  );
  return reserveMonths(balance, past, currentCommitted);
}
