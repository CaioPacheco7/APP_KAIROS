import { CircleAlertIcon, CircleCheckIcon, GaugeIcon, TrendingUpIcon, TriangleAlertIcon } from "lucide-react";
import { Money } from "@/components/app/money";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetLine } from "@/lib/finance/budget";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BudgetOverview } from "@/server/budget-data";
import { BudgetDialog } from "./budget-dialog";

/** Status com ícone e texto (nunca só cor). */
function LineStatus({ line, elapsed }: { line: BudgetLine; elapsed: number | null }) {
  if (line.level === "over") {
    return (
      <span className="inline-flex items-center gap-1 text-risk">
        <CircleAlertIcon className="size-3" aria-hidden />
        {line.spent > line.limit ? (
          <>
            passou <Money>{formatBRL(line.spent - line.limit)}</Money>
          </>
        ) : (
          "chegou ao limite"
        )}
      </span>
    );
  }
  if (line.level === "near") {
    return (
      <span className="inline-flex items-center gap-1 text-warn">
        <TriangleAlertIcon className="size-3" aria-hidden />
        perto do limite · faltam <Money>{formatBRL(line.left)}</Money>
      </span>
    );
  }
  // dentro do limite, mas gastando mais rápido que o mês anda
  if (elapsed !== null && line.ratio > elapsed + 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-warn">
        <TrendingUpIcon className="size-3" aria-hidden />
        acima do ritmo do mês · faltam <Money>{formatBRL(line.left)}</Money>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-good">
      <CircleCheckIcon className="size-3" aria-hidden />
      dentro do limite · faltam <Money>{formatBRL(line.left)}</Money>
    </span>
  );
}

/**
 * Orçamento por categoria (RN-12): quanto já foi gasto de cada limite no mês.
 * A barra é o gasto (até o limite); o traço fino é onde o gasto "deveria"
 * estar hoje se o limite fosse usado por igual ao longo do mês.
 */
export function BudgetCard({
  overview,
  categories,
  className,
  style,
}: {
  overview: BudgetOverview;
  /** categorias de despesa (para escolher no formulário) */
  categories: { id: string; name: string }[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const { lines, totals, elapsed, month } = overview;
  const limits = Object.fromEntries(overview.limits);
  const averages = Object.fromEntries(overview.averages);
  const dialogProps = { month, categories, limits, averages };

  return (
    <Card id="orcamento" className={cn("scroll-mt-28", className)} style={style}>
      <CardHeader>
        <CardTitle>Orçamento do mês</CardTitle>
        <CardDescription>Limite de gasto por categoria. Conta tudo: pago, agendado e no cartão</CardDescription>
        {categories.length > 0 && (
          <CardAction>
            <BudgetDialog {...dialogProps} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <div className="glass-inner flex items-start gap-3 rounded-[14px] p-3.5 text-[0.8125rem] text-muted-foreground">
            <GaugeIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Nenhum limite ainda. Escolha uma categoria e diga até quanto quer gastar por mês, por exemplo{" "}
              <strong className="text-foreground">Mercado até R$ 600</strong>. O sino avisa quando chegar em 80% e em 100%.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.8125rem]">
              <span className="font-extrabold">
                <Money>{formatBRL(totals.spent)}</Money> de <Money>{formatBRL(totals.limit)}</Money>
              </span>
              <span className="text-muted-foreground">
                nas {lines.length} {lines.length === 1 ? "categoria" : "categorias"} com limite
                {totals.over > 0 && ` · ${totals.over} ${totals.over === 1 ? "passou" : "passaram"}`}
                {totals.near > 0 && ` · ${totals.near} perto do limite`}
              </span>
            </p>
            <ul className="grid gap-3.5">
              {lines.map((line) => {
                const pct = Math.round(line.ratio * 100);
                return (
                  <li key={line.categoryId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5">
                    <div className="flex min-w-0 items-baseline justify-between gap-3 text-[0.8125rem]">
                      <span className="truncate font-bold">{line.name}</span>
                      <span className="shrink-0 font-bold tabular-nums">
                        <Money>{formatBRL(line.spent)}</Money>
                        <span className="ml-1 text-[0.6875rem] font-semibold text-muted-foreground">
                          de <Money>{formatBRL(line.limit)}</Money>
                        </span>
                      </span>
                    </div>
                    <div className="row-span-3 self-start">
                      <BudgetDialog {...dialogProps} categoryId={line.categoryId} categoryName={line.name} />
                    </div>
                    <div
                      role="meter"
                      aria-label={`${line.name}: ${formatBRL(line.spent)} de ${formatBRL(line.limit)} (${pct}%)`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(pct, 100)}
                      className="relative h-2"
                    >
                      <div className="h-full overflow-hidden rounded-full bg-track">
                        <div
                          className="animate-grow-x h-full rounded-full bg-(--series-out)"
                          style={{ width: `${Math.max(Math.min(line.ratio, 1) * 100, 2)}%` }}
                        />
                      </div>
                      {elapsed !== null && (
                        <span
                          aria-hidden
                          className="absolute -top-[3px] h-[14px] w-[2px] rounded-full bg-foreground shadow-[0_0_0_1.5px_var(--glass-surface)]"
                          style={{ left: `calc(${elapsed * 100}% - 1px)` }}
                        />
                      )}
                    </div>
                    <p className="text-[0.6875rem] font-bold">
                      <LineStatus line={line} elapsed={elapsed} />
                      <span className="ml-1.5 font-semibold text-muted-foreground">· {pct}%</span>
                    </p>
                  </li>
                );
              })}
            </ul>
            {elapsed !== null && (
              <p className="flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
                <span aria-hidden className="h-3 w-[2px] shrink-0 rounded-full bg-foreground" />
                O traço é o ritmo de hoje: até onde o gasto iria se o limite fosse usado por igual no mês.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
