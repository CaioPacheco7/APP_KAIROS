import { formatBRL } from "@/lib/money";

export type CategoryItem = { label: string; total: number };

const MAX_BARS = 7;

/**
 * Gasto por categoria: barras horizontais ordenadas, uma só cor
 * (comparação de magnitude, mais de 6 partes). O que passar de MAX_BARS
 * é somado em "Outras".
 */
export function CategoryBars({ items }: { items: CategoryItem[] }) {
  const sorted = [...items].sort((a, b) => b.total - a.total);
  const head = sorted.slice(0, MAX_BARS);
  const tail = sorted.slice(MAX_BARS);
  const rows =
    tail.length > 0
      ? [...head, { label: "Outras", total: tail.reduce((s, i) => s + i.total, 0) }]
      : head;

  const grand = rows.reduce((s, r) => s + r.total, 0);
  const max = Math.max(...rows.map((r) => r.total), 1);

  if (rows.length === 0 || grand === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sem despesas neste mês.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.label} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 tabular-nums">
              {formatBRL(row.total)}
              <span className="ml-2 text-xs text-muted-foreground">
                {Math.round((row.total / grand) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((row.total / max) * 100, 2)}%`,
                background: "var(--series-1)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
