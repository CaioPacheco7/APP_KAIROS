"use client";

import { FilterIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Money } from "@/components/app/money";
import { formatBRL } from "@/lib/money";
import { normalizeSearch } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export type ActivityRow = {
  id: string;
  title: string;
  category: string;
  account: string;
  date: string; // "25/11"
  amount: number; // centavos
  type: "income" | "expense" | "transfer";
  pending: boolean;
};

const FILTERS = [
  { id: "all", label: "Tudo" },
  { id: "income", label: "Entradas" },
  { id: "expense", label: "Saídas" },
  { id: "transfer", label: "Transferências" },
  { id: "pending", label: "Agendadas" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

/** Últimas movimentações em tabela, com busca e filtro (tudo no navegador). */
export function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const shown = rows.filter((r) => {
    if (filter === "pending" ? !r.pending : filter !== "all" && r.type !== filter) return false;
    const hay = normalizeSearch(`${r.title} ${r.category} ${r.account}`);
    return terms.every((t) => hay.includes(t));
  });

  const field =
    "glass-inner flex min-h-[35px] items-center gap-1.5 rounded-[10px] px-2 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className={cn(field, "min-w-0 flex-1 sm:max-w-56")}>
          <SearchIcon aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar movimentação"
            aria-label="Buscar movimentação"
            className="h-[33px] min-w-0 flex-1 bg-transparent text-[0.75rem] outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className={field}>
          <FilterIcon aria-hidden />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterId)}
            aria-label="Filtrar movimentações"
            className="bg-transparent py-1 text-[0.75rem] font-semibold outline-none"
          >
            {FILTERS.map((f) => (
              <option key={f.id} value={f.id} className="bg-popover text-popover-foreground">
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left sm:table-auto">
          <thead>
            <tr className="text-[0.625rem] font-extrabold text-muted-foreground">
              <th scope="col" className="rounded-l-[8px] bg-inner px-2.5 py-2">Movimentação</th>
              <th scope="col" className="hidden bg-inner px-2.5 py-2 sm:table-cell">Categoria</th>
              <th scope="col" className="hidden bg-inner px-2.5 py-2 md:table-cell">Conta</th>
              <th scope="col" className="hidden bg-inner px-2.5 py-2 sm:table-cell">Dia</th>
              <th scope="col" className="w-28 rounded-r-[8px] bg-inner px-2.5 py-2 text-right sm:w-auto">Valor</th>
            </tr>
          </thead>
          <tbody className="text-[0.75rem]">
            {shown.map((r, i) => (
              <tr key={r.id}>
                <td className={cn("px-2.5 py-2.5", i > 0 && "border-t border-line")}>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-bold">{r.title}</span>
                    {r.pending && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--status-warning)_14%,transparent)] px-1.5 py-0.5 text-[0.5625rem] font-extrabold text-warn">
                        <i aria-hidden className="size-1 rounded-full bg-current" />
                        agendada
                      </span>
                    )}
                  </span>
                  {/* no celular, os detalhes vêm numa linha de apoio */}
                  <span className="mt-0.5 block truncate text-[0.625rem] text-muted-foreground sm:hidden">
                    {r.category} · {r.account} · {r.date}
                  </span>
                </td>
                <td className={cn("hidden px-2.5 py-2.5 whitespace-nowrap text-muted-foreground sm:table-cell", i > 0 && "border-t border-line")}>{r.category}</td>
                <td className={cn("hidden px-2.5 py-2.5 whitespace-nowrap text-muted-foreground md:table-cell", i > 0 && "border-t border-line")}>{r.account}</td>
                <td className={cn("hidden px-2.5 py-2.5 whitespace-nowrap tabular-nums sm:table-cell", i > 0 && "border-t border-line")}>{r.date}</td>
                <td
                  className={cn(
                    "px-2.5 py-2.5 text-right font-extrabold whitespace-nowrap tabular-nums",
                    i > 0 && "border-t border-line",
                    r.type === "income" && "text-money-in",
                    r.type === "transfer" && "text-muted-foreground",
                  )}
                >
                  {r.type === "income" ? "+ " : r.type === "expense" ? "− " : "⇄ "}
                  <Money>{formatBRL(r.amount)}</Money>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && (
        <p role="status" className="px-1 py-2 text-[0.8125rem] text-muted-foreground">
          Nenhuma movimentação com esse filtro.
        </p>
      )}
    </div>
  );
}
