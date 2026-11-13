"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL, formatCompact } from "@/lib/money";

export type MonthlyPoint = {
  month: string; // "2026-11"
  label: string; // "nov"
  income: number; // centavos
  expense: number; // centavos
};

type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
};

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: item.color }}
          />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="ml-auto pl-3 tabular-nums">
            {formatBRL(Number(item.value ?? 0))}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Receitas × despesas por mês (colunas agrupadas, duas cores). */
export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const empty = data.every((d) => d.income === 0 && d.expense === 0);

  return (
    <figure className="grid gap-3">
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: "var(--series-1)" }} />
          Receitas
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: "var(--series-2)" }} />
          Despesas
        </span>
      </figcaption>

      {empty ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Sem movimentação nos últimos meses.
        </p>
      ) : (
        <div className="h-60 w-full" role="img" aria-label="Receitas e despesas por mês">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => formatCompact(v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                content={(props) => <ChartTooltip {...(props as TooltipProps)} />}
              />
              <Bar dataKey="income" name="Receitas" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="expense" name="Despesas" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Ver como tabela</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr>
              <th className="py-1 font-medium">Mês</th>
              <th className="py-1 text-right font-medium">Receitas</th>
              <th className="py-1 text-right font-medium">Despesas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td className="py-1 capitalize">{d.label}</td>
                <td className="py-1 text-right">{formatBRL(d.income)}</td>
                <td className="py-1 text-right">{formatBRL(d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
