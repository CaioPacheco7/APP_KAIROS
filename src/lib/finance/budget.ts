/**
 * Orçamento por categoria (RN-12). Funções puras.
 *
 * Um limite vale do mês em que foi definido em diante, até ser trocado: o
 * limite de um mês é o mais recente definido até aquele mês (0 = sem limite).
 * O gasto conta tudo da categoria no mês (pago, agendado e no cartão) e a
 * categoria-pai soma as subcategorias.
 */
import { daysInMonth } from "@/lib/dates";

export type BudgetRow = { category_id: string; month: string; amount: number };

/** categoria -> limite do mês (só as que têm limite > 0). */
export function effectiveBudgets(rows: BudgetRow[], month: string): Map<string, number> {
  const latest = new Map<string, { month: string; amount: number }>();
  for (const r of rows) {
    const m = r.month.slice(0, 7);
    if (m > month) continue;
    const current = latest.get(r.category_id);
    if (!current || m > current.month) latest.set(r.category_id, { month: m, amount: Number(r.amount) });
  }
  return new Map([...latest].filter(([, v]) => v.amount > 0).map(([id, v]) => [id, v.amount]));
}

/** ok < 80% · near = 80% a < 100% · over = 100% ou mais (alertas da RN-12) */
export type BudgetLevel = "ok" | "near" | "over";
export const BUDGET_ALERT_RATIO = 0.8;

export function budgetLevel(spent: number, limit: number): BudgetLevel {
  const ratio = spent / limit;
  if (ratio >= 1) return "over";
  if (ratio >= BUDGET_ALERT_RATIO) return "near";
  return "ok";
}

export type CategoryLike = { id: string; name: string; parent_id: string | null };

export type BudgetLine = {
  categoryId: string;
  name: string;
  limit: number;
  spent: number;
  /** limite − gasto (negativo = passou) */
  left: number;
  ratio: number;
  level: BudgetLevel;
};

/** Gasto de cada categoria somando as subcategorias na categoria-pai. */
export function rollUpSpending(spending: Map<string, number>, categories: CategoryLike[]): Map<string, number> {
  const parentOf = new Map(categories.map((c) => [c.id, c.parent_id]));
  const out = new Map<string, number>();
  for (const [id, total] of spending) {
    out.set(id, (out.get(id) ?? 0) + total);
    const parent = parentOf.get(id);
    if (parent) out.set(parent, (out.get(parent) ?? 0) + total);
  }
  return out;
}

/** Linhas do orçamento do mês, das mais apertadas para as mais folgadas. */
export function budgetLines(
  budgets: Map<string, number>,
  spending: Map<string, number>,
  categories: CategoryLike[],
): BudgetLine[] {
  const rolled = rollUpSpending(spending, categories);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return [...budgets]
    .map(([categoryId, limit]) => {
      const spent = rolled.get(categoryId) ?? 0;
      return {
        categoryId,
        name: names.get(categoryId) ?? "Categoria",
        limit,
        spent,
        left: limit - spent,
        ratio: spent / limit,
        level: budgetLevel(spent, limit),
      };
    })
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name, "pt-BR"));
}

export function budgetTotals(lines: BudgetLine[]): { limit: number; spent: number; over: number; near: number } {
  return {
    limit: lines.reduce((s, l) => s + l.limit, 0),
    spent: lines.reduce((s, l) => s + l.spent, 0),
    over: lines.filter((l) => l.level === "over").length,
    near: lines.filter((l) => l.level === "near").length,
  };
}

/**
 * Ritmo esperado: que fração do mês já passou (só no mês em andamento).
 * Serve para a marca "hoje" na barra: gasto à frente dela = acima do ritmo.
 */
export function monthElapsed(month: string, today: string): number | null {
  if (!today.startsWith(month)) return null;
  return Number(today.slice(8, 10)) / daysInMonth(month);
}

/** Média mensal de gasto por categoria (para sugerir um limite). */
export function averageByCategory(rows: { category_id: string | null; total: number }[], months: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.category_id) continue;
    out.set(r.category_id, (out.get(r.category_id) ?? 0) + Number(r.total));
  }
  for (const [id, total] of out) out.set(id, Math.round(total / months));
  return out;
}
