import { cache } from "react";
import {
  averageByCategory,
  budgetLines,
  budgetTotals,
  effectiveBudgets,
  monthElapsed,
  type BudgetLine,
  type CategoryLike,
} from "@/lib/finance/budget";
import { shiftMonth } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Budget, SpendingByCategory } from "@/types/database";

export type BudgetOverview = {
  month: string;
  lines: BudgetLine[];
  totals: ReturnType<typeof budgetTotals>;
  /** fração do mês que já passou (só no mês em andamento) */
  elapsed: number | null;
  /** categoria -> limite atual (para o formulário) */
  limits: Map<string, number>;
  /** categoria -> gasto médio dos últimos meses (para sugerir um limite) */
  averages: Map<string, number>;
};

/** Orçamento do mês: limites, gasto de cada categoria e média recente. */
export const getBudgetOverview = cache(async (month: string, today: string): Promise<BudgetOverview> => {
  const db = await createClient();
  const [budgetsRes, spendingRes, pastRes, categoriesRes] = await Promise.all([
    db.from("budgets").select("category_id, month, amount").lte("month", `${month}-01`),
    db.from("v_spending_by_category").select("month, category_id, total").eq("month", `${month}-01`),
    db
      .from("v_spending_by_category")
      .select("month, category_id, total")
      .gte("month", `${shiftMonth(month, -3)}-01`)
      .lt("month", `${month}-01`),
    // inclui arquivadas: um limite antigo continua com nome
    db.from("categories").select("id, name, parent_id").is("deleted_at", null),
  ]);

  const limits = effectiveBudgets((budgetsRes.data ?? []) as Budget[], month);
  const spending = new Map<string, number>();
  for (const r of (spendingRes.data ?? []) as SpendingByCategory[]) {
    if (r.category_id) spending.set(r.category_id, Number(r.total));
  }
  const past = (pastRes.data ?? []) as SpendingByCategory[];
  const monthsWithData = new Set(past.map((r) => r.month.slice(0, 7))).size;
  const lines = budgetLines(limits, spending, (categoriesRes.data ?? []) as CategoryLike[]);

  return {
    month,
    lines,
    totals: budgetTotals(lines),
    elapsed: monthElapsed(month, today),
    limits,
    averages: averageByCategory(
      past.map((r) => ({ category_id: r.category_id, total: Number(r.total) })),
      Math.max(monthsWithData, 1),
    ),
  };
});
