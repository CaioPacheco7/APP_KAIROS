import { CoinsIcon, TriangleAlertIcon } from "lucide-react";
import { Money } from "@/components/app/money";
import { Count } from "@/components/viz/count";
import type { DailyAllowance } from "@/lib/finance/health";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * "Hoje você ainda pode gastar": o número que responde se dá para gastar
 * agora. O limite do dia sai da sobra do mês dividida pelos dias que faltam;
 * o medidor mostra quanto dele já foi usado hoje. Em dourado (o destaque da tela).
 */
export function TodayAllowance({ allowance, className }: { allowance: DailyAllowance; className?: string }) {
  const { limit, spent, left, daysLeft } = allowance;
  const over = left < 0;
  const noRoom = limit === 0;
  const used = limit > 0 ? Math.min(spent / limit, 1) : 1;

  return (
    <section
      aria-label="Limite de gastos de hoje"
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-[16px] border border-[#f6e3b4] p-3.5 text-[#22180a]",
        "bg-[radial-gradient(ellipse_at_8%_-20%,#fbe9bd,transparent_68%),linear-gradient(145deg,#e3c37f,#b98d42)]",
        "shadow-[inset_0_1px_2px_rgb(255_247_225/60%),0_6px_14px_rgb(120_84_26/22%)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[0.6875rem] font-bold">
        <span className="flex min-w-0 items-center gap-1.5">
          {over || noRoom ? (
            <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <CoinsIcon className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0">
            {noRoom ? "Sem folga no mês" : over ? "Você passou do limite de hoje em" : "Hoje você ainda pode gastar"}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[rgb(255_250_235/34%)] px-2 py-0.5 text-[0.625rem] max-sm:hidden">
          {daysLeft === 1 ? "último dia do mês" : `faltam ${daysLeft} dias`}
        </span>
      </div>

      {noRoom ? (
        <p className="text-[0.8125rem] leading-snug font-semibold">
          O que entra no mês já está todo comprometido. Se puder, segure os gastos de hoje.
        </p>
      ) : (
        <>
          <p className="text-[clamp(2rem,3.6vw,2.75rem)] leading-none font-extrabold tracking-[-0.065em]">
            <Count value={over ? -left : left} />
          </p>
          <div
            role="meter"
            aria-label="Limite de hoje usado"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={Math.min(spent, limit)}
            aria-valuetext={`${formatBRL(spent)} de ${formatBRL(limit)}`}
            className="h-2 overflow-hidden rounded-full bg-[rgb(255_250_235/38%)]"
          >
            {spent > 0 && (
              <div
                className="animate-grow-x h-full rounded-full bg-[#22180a]"
                style={{ width: `${Math.max(used * 100, 3)}%` }}
              />
            )}
          </div>
          <p className="text-[0.6875rem] font-semibold text-[#3d2c0f]">
            {spent > 0 ? (
              <>
                <Money>{formatBRL(spent)}</Money> gastos de <Money>{formatBRL(limit)}</Money> do limite de hoje
              </>
            ) : (
              <>
                Limite de hoje: <Money>{formatBRL(limit)}</Money>. Nenhum gasto lançado hoje
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}
