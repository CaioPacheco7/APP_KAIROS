import { IconChip } from "@/components/app/icon-chip";
import { transactionIcon } from "@/lib/category-icons";
import { formatBRL } from "@/lib/money";

export type CategoryItem = { label: string; total: number };

const MAX_BARS = 6;

/**
 * Gasto por categoria: barras horizontais ordenadas, uma só cor (comparar
 * magnitude entre muitas partes). O que passar de MAX_BARS soma em "Outras".
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
    <ul className="grid grid-cols-1 gap-4">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
          <IconChip
            icon={transactionIcon("expense", row.label)}
            className="row-span-2 size-9 rounded-lg"
            iconClassName="size-4"
          />
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums">
              {formatBRL(row.total)}
              <span className="ml-2 text-xs text-muted-foreground">
                {Math.round((row.total / grand) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-fill/70 to-gold-fill"
              style={{ width: `${Math.max((row.total / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
