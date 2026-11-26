import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { capitalize, cn } from "@/lib/utils";

/** Navegação de mês (?mes=YYYY-MM) preservando os outros filtros. Pílula de período do vidro. */
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
    "grid size-[35px] place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
  );

  return (
    <div className="glass-inner flex items-center rounded-full p-[3px]">
      <Link href={href(shiftMonth(month, -1))} aria-label="Mês anterior" className={arrow}>
        <ChevronLeftIcon className="size-4" />
      </Link>
      <span
        aria-live="polite"
        className="flex min-h-[35px] min-w-36 items-center justify-center rounded-full bg-primary px-3 text-center text-[0.75rem] font-bold text-primary-foreground"
      >
        {capitalize(monthLabel(month))}
      </span>
      <Link href={href(shiftMonth(month, 1))} aria-label="Próximo mês" className={arrow}>
        <ChevronRightIcon className="size-4" />
      </Link>
    </div>
  );
}
