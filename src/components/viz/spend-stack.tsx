"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/money";
import { capitalize, cn } from "@/lib/utils";
import { niceScale, tickLabel } from "@/lib/viz";
import { ChartTable, Legend } from "./metric";

export type SpendColumn = {
  key: string; // "2026-11"
  label: string; // "nov"
  fullLabel: string; // "novembro de 2026"
  fixed: number; // contas fixas (centavos)
  daily: number; // dia a dia (centavos)
};

/**
 * Saídas por mês, empilhadas: contas fixas (tom escuro, embaixo) e dia a dia
 * (tom claro, em cima), os dois tons da cor das Saídas. Colunas de até 24px,
 * ponta arredondada de 4px, 2px de respiro entre as partes. Cada coluna é
 * focável e mostra os valores; a tabela traz tudo também.
 */
export function SpendStack({ columns, height = 150 }: { columns: SpendColumn[]; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const totals = columns.map((c) => c.fixed + c.daily);
  const scale = niceScale(Math.max(0, ...totals), 3);
  const empty = totals.every((t) => t === 0);

  if (empty) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Sem saídas nestes meses.</p>;
  }

  const a = active === null ? null : columns[active];
  const n = columns.length;

  return (
    <figure className="grid min-w-0 grid-cols-1 gap-2" aria-label="Saídas por mês: contas fixas e dia a dia">
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Legend
          items={[
            { label: "Contas fixas", color: "var(--series-out-fixed)" },
            { label: "Dia a dia", color: "var(--series-out-daily)" },
          ]}
        />
        {a && (
          <span className="text-[0.6875rem] font-extrabold whitespace-nowrap tabular-nums" aria-hidden>
            {capitalize(a.label)} · <span className="money">{formatBRL(a.fixed + a.daily)}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-[40px_minmax(0,1fr)]">
        <div className="relative text-[0.6875rem] sm:text-[0.625rem] text-muted-foreground tabular-nums" style={{ height }} aria-hidden>
          {scale.ticks.map((t) => (
            <span key={t} className="money absolute right-2 -translate-y-1/2" style={{ top: `${(1 - t / scale.max) * 100}%` }}>
              {tickLabel(t, scale.max)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0" style={{ height }} onMouseLeave={() => setActive(null)}>
          {/* grade: linhas finas e contínuas; a base um tom mais forte */}
          {scale.ticks.map((t) => (
            <span
              key={t}
              aria-hidden
              className={cn("absolute inset-x-0 h-px", t === 0 ? "bg-(--viz-axis)" : "bg-(--viz-grid)")}
              style={{ top: `${(1 - t / scale.max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {columns.map((c, i) => {
              const total = c.fixed + c.daily;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-label={`${c.fullLabel}: total ${formatBRL(total)}; contas fixas ${formatBRL(c.fixed)}; dia a dia ${formatBRL(c.daily)}`}
                  aria-pressed={active === i}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex h-full min-w-0 items-end justify-center rounded-[8px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    active === i && "bg-inner",
                  )}
                >
                  <span
                    aria-hidden
                    className="animate-grow-y flex w-[min(62%,24px)] min-w-[6px] flex-col gap-[2px] transition-[height] duration-500 ease-out"
                    style={{ height: `${(total / scale.max) * 100}%`, ["--d" as string]: `${170 + i * 34}ms` }}
                  >
                    {c.daily > 0 && (
                      <i
                        className="block min-h-[2px] rounded-t-[4px] bg-(--series-out-daily)"
                        style={{ flexGrow: c.daily, flexBasis: 0 }}
                      />
                    )}
                    {c.fixed > 0 && (
                      <i
                        className={cn("block min-h-[2px] bg-(--series-out-fixed)", c.daily === 0 && "rounded-t-[4px]")}
                        style={{ flexGrow: c.fixed, flexBasis: 0 }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ml-[40px] grid text-[0.6875rem] sm:text-[0.625rem] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
        {columns.map((c, i) => (
          <span key={c.key} className={cn("truncate text-center", i === n - 1 && "font-bold text-foreground")}>
            {c.label}
          </span>
        ))}
      </div>

      <ChartTable
        caption="Saídas por mês: contas fixas e dia a dia"
        columns={["Mês", "Contas fixas", "Dia a dia", "Total"]}
        rows={columns.map((c) => [c.fullLabel, formatBRL(c.fixed), formatBRL(c.daily), formatBRL(c.fixed + c.daily)])}
      />
    </figure>
  );
}
