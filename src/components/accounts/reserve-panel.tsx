import { LifeBuoyIcon } from "lucide-react";
import { IconChip } from "@/components/app/icon-chip";
import { Money } from "@/components/app/money";
import { Panel } from "@/components/app/panel";
import { formatMonths, RESERVE_TARGET, type Reserve } from "@/lib/finance/reserve";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Reserva em meses: por quanto tempo o saldo de hoje pagaria os seus gastos.
 * Medidor de 0 a 6 meses com marcas em 3 e 6 (a referência comum de reserva
 * de emergência). A conta aparece por extenso: nada de número mágico.
 */
export function ReservePanel({ reserve, className }: { reserve: Reserve; className?: string }) {
  const { months, monthlyCost, basis, monthsUsed } = reserve;
  const shown = Math.min(months, RESERVE_TARGET);
  const at = (v: number) => `${(v / RESERVE_TARGET) * 100}%`;
  const reading =
    months >= RESERVE_TARGET
      ? "Acima da referência de 6 meses."
      : months >= 3
        ? "Dentro da referência de 3 a 6 meses."
        : "Abaixo da referência comum, de 3 a 6 meses.";

  return (
    <Panel
      title="Reserva em meses"
      subtitle="Por quanto tempo o saldo pagaria os seus gastos"
      className={className}
      action={<IconChip icon={LifeBuoyIcon} tone="gold" className="size-9 rounded-[11px] max-sm:hidden" />}
    >
      <p className="text-[clamp(2rem,3.4vw,2.75rem)] leading-none font-extrabold tracking-[-0.06em]">
        {months > 0 ? formatMonths(months) : "0 mês"}
      </p>
      <p className="mt-1.5 text-[0.75rem] font-semibold">{reading}</p>

      <div className="mt-4 grid gap-1.5">
        <div
          role="meter"
          aria-label="Reserva em meses"
          aria-valuemin={0}
          aria-valuemax={RESERVE_TARGET}
          aria-valuenow={Math.round(shown * 10) / 10}
          aria-valuetext={`${formatMonths(months)}; referência de 3 a 6 meses`}
          className="relative h-2.5 rounded-full bg-gold-soft"
        >
          {months > 0 && (
            <div
              className="animate-grow-x h-full rounded-full bg-gold-fill"
              style={{ width: `max(${at(shown)}, 6px)` }}
            />
          )}
          {/* marca da referência mínima (3 meses), com anel da superfície */}
          <span
            aria-hidden
            className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_var(--glass-surface)]"
            style={{ left: at(3) }}
          />
        </div>
        <div className="relative h-4 text-[0.625rem] font-semibold text-muted-foreground tabular-nums" aria-hidden>
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2" style={{ left: at(3) }}>
            3
          </span>
          <span className="absolute right-0">6 meses</span>
        </div>
      </div>

      <p className={cn("mt-2 text-[0.6875rem] leading-relaxed text-muted-foreground")}>
        Saldo total ÷ <Money>{formatBRL(monthlyCost)}</Money> por mês,{" "}
        {basis === "history"
          ? `o seu gasto médio ${monthsUsed === 1 ? "do mês passado" : `dos últimos ${monthsUsed} meses`}`
          : "o que já está comprometido neste mês"}{" "}
        (contas fixas + dia a dia).
      </p>
    </Panel>
  );
}
