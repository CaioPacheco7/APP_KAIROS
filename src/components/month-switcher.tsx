import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { monthLabel, shiftMonth } from "@/lib/dates";

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

  return (
    <div className="flex items-center gap-1">
      <Link
        href={href(shiftMonth(month, -1))}
        aria-label="Mês anterior"
        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <ChevronLeftIcon />
      </Link>
      <span className="min-w-40 text-center text-sm font-medium capitalize">
        {monthLabel(month)}
      </span>
      <Link
        href={href(shiftMonth(month, 1))}
        aria-label="Próximo mês"
        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <ChevronRightIcon />
      </Link>
    </div>
  );
}
