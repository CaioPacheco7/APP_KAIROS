import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { IconChip } from "@/components/app/icon-chip";
import { transactionIcon } from "@/lib/category-icons";
import { Money } from "@/components/app/money";
import type { BudgetLevel } from "@/lib/finance/budget";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export type CategoryItem = {
  label: string;
  total: number;
  /** limite do orçamento da categoria no mês (se houver) */
  limit?: number;
  level?: BudgetLevel;
};

const MAX_BARS = 6;

/**
 * Gasto por categoria: lista de medidores ordenada, uma cor só (a das Saídas),
 * para comparar partes entre si. O que passar de MAX_BARS soma em "Outras".
 * Valor e porcentagem sempre em texto, ao lado de cada barra. Categoria com
 * orçamento ganha um traço no limite e, perto dele ou acima, um aviso com
 * ícone e texto (nunca só cor: a barra continua na cor das Saídas).
 */
export function CategoryBars({ items }: { items: CategoryItem[] }) {
  const sorted = [...items].sort((a, b) => b.total - a.total);
  const head = sorted.slice(0, MAX_BARS);
  const tail = sorted.slice(MAX_BARS);
  const rows: CategoryItem[] =
    tail.length > 0
      ? [...head, { label: "Outras", total: tail.reduce((s, i) => s + i.total, 0) }]
      : head;

  const grand = rows.reduce((s, r) => s + r.total, 0);
  const max = Math.max(...rows.map((r) => Math.max(r.total, r.limit ?? 0)), 1);

  if (rows.length === 0 || grand === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sem despesas neste mês.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3.5">
      {rows.map((row, i) => {
        const alert = row.limit && row.level && row.level !== "ok" ? row.level : null;
        return (
          <li key={row.label} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
            <IconChip
              icon={transactionIcon("expense", row.label)}
              className={cn("size-8 rounded-[10px]", alert ? "row-span-3 self-start" : "row-span-2")}
              iconClassName="size-3.5"
            />
            <div className="flex min-w-0 items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="truncate font-semibold">{row.label}</span>
              <span className="shrink-0 font-bold tabular-nums">
                <Money>{formatBRL(row.total)}</Money>
                <span className="ml-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
                  {row.limit ? (
                    <>
                      de <Money>{formatBRL(row.limit)}</Money>
                    </>
                  ) : (
                    `${Math.round((row.total / grand) * 100)}%`
                  )}
                </span>
              </span>
            </div>
            <div className="relative h-2" aria-hidden>
              <div className="h-full overflow-hidden rounded-full bg-track">
                <div
                  className="animate-grow-x h-full rounded-full bg-(--series-out)"
                  style={{ width: `${Math.max((row.total / max) * 100, 2)}%`, ["--d" as string]: `${180 + i * 45}ms` }}
                />
              </div>
              {row.limit ? (
                <span
                  className="absolute -top-[3px] h-[14px] w-[2px] rounded-full bg-foreground shadow-[0_0_0_1.5px_var(--glass-surface)]"
                  style={{ left: `calc(${(row.limit / max) * 100}% - 1px)` }}
                />
              ) : null}
            </div>
            {alert && (
              <p
                className={cn(
                  "flex items-center gap-1 text-[0.6875rem] font-bold",
                  alert === "over" ? "text-risk" : "text-warn",
                )}
              >
                {alert === "over" ? (
                  <CircleAlertIcon className="size-3" aria-hidden />
                ) : (
                  <TriangleAlertIcon className="size-3" aria-hidden />
                )}
                {alert === "over"
                  ? row.total > row.limit!
                    ? <>Passou <Money>{formatBRL(row.total - row.limit!)}</Money> do limite</>
                    : "Chegou ao limite"
                  : `Perto do limite (${Math.round((row.total / row.limit!) * 100)}%)`}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
