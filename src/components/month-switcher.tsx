import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Navegação de mês (?mes=YYYY-MM) preservando os outros filtros. */
export function MonthSwitcher({
  basePath,
  month,
  params = {},
}: {
  basePath: string;
  month: string;
  params?: Record<string, string | undefined>;
}) {
  const href = (m: string) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    query.set("mes", m);
    return `${basePath}?${query}`;
  };

  const arrow = cn(
    "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
  );

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-xs">
      <Link href={href(shiftMonth(month, -1))} aria-label="Mês anterior" className={arrow}>
        <ChevronLeftIcon className="size-4" />
      </Link>
      <span className="min-w-36 px-2 text-center text-sm font-medium first-letter:uppercase">
        {monthLabel(month)}
      </span>
      <Link href={href(shiftMonth(month, 1))} aria-label="Próximo mês" className={arrow}>
        <ChevronRightIcon className="size-4" />
      </Link>
    </div>
  );
}
