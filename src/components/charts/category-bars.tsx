import { IconChip } from "@/components/app/icon-chip";
import { transactionIcon } from "@/lib/category-icons";
import { Money } from "@/components/app/money";
import { formatBRL } from "@/lib/money";

export type CategoryItem = { label: string; total: number };

const MAX_BARS = 6;

/**
 * Gasto por categoria: lista de medidores ordenada, uma cor só (a das Saídas),
 * para comparar partes entre si. O que passar de MAX_BARS soma em "Outras".
 * Valor e porcentagem sempre em texto, ao lado de cada barra.
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
    <ul className="grid grid-cols-1 gap-3.5">
      {rows.map((row, i) => (
        <li key={row.label} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
          <IconChip
            icon={transactionIcon("expense", row.label)}
            className="row-span-2 size-8 rounded-[10px]"
            iconClassName="size-3.5"
          />
          <div className="flex min-w-0 items-baseline justify-between gap-3 text-[0.8125rem]">
            <span className="truncate font-semibold">{row.label}</span>
            <span className="shrink-0 font-bold tabular-nums">
              <Money>{formatBRL(row.total)}</Money>
              <span className="ml-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
                {Math.round((row.total / grand) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-track" aria-hidden>
            <div
              className="animate-grow-x h-full rounded-full bg-(--series-out)"
              style={{ width: `${Math.max((row.total / max) * 100, 2)}%`, ["--d" as string]: `${180 + i * 45}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
