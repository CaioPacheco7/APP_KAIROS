import { BellRingIcon, RepeatIcon } from "lucide-react";
import { Money } from "@/components/app/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Count } from "@/components/viz/count";
import type { Subscription } from "@/lib/finance/subscriptions";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/**
 * Assinaturas (contas fixas na categoria "Assinaturas"): quanto custam por
 * mês e por ano e quando cada uma renova. O sino avisa 3 dias antes.
 */
export function SubscriptionsCard({
  items,
  monthly,
  yearly,
  fixedTotal,
  className,
  style,
}: {
  items: Subscription[];
  monthly: number;
  yearly: number;
  /** total das contas fixas do mês, para mostrar a parte das assinaturas */
  fixedTotal: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card className={className} style={style}>
      <CardHeader>
        <CardTitle>Assinaturas</CardTitle>
        <CardDescription>Contas fixas na categoria Assinaturas. O sino avisa 3 dias antes de renovar</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="glass-inner flex items-start gap-3 rounded-[14px] p-3.5 text-[0.8125rem] text-muted-foreground">
            <RepeatIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Nenhuma assinatura por aqui. Ao cadastrar uma conta fixa como Netflix, Spotify ou academia, escolha a
              categoria <strong className="text-foreground">Assinaturas</strong>: o total aparece aqui e o sino avisa antes de renovar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
            <div className="grid gap-1">
              <p className="text-[0.6875rem] font-semibold text-muted-foreground">Por mês</p>
              <p className="text-[clamp(2rem,3.4vw,2.75rem)] leading-none font-extrabold tracking-[-0.06em]">
                <Count value={monthly} />
              </p>
              <p className="mt-1 text-[0.75rem] font-semibold">
                <Money>{formatBRL(yearly)}</Money> por ano
              </p>
              {fixedTotal > 0 && (
                <p className="text-[0.6875rem] text-muted-foreground">
                  {pct.format(Math.min((monthly / fixedTotal) * 100, 100))}% das contas fixas do mês ·{" "}
                  {items.length} {items.length === 1 ? "assinatura" : "assinaturas"}
                </p>
              )}
            </div>

            <ul className="divide-y divide-line">
              {items.map((s) => {
                const soon = s.daysUntil <= 3;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-[11px]",
                        soon ? "bg-[color-mix(in_oklab,var(--status-warning)_14%,transparent)] text-warn" : "glass-inner text-muted-foreground",
                      )}
                    >
                      {soon ? <BellRingIcon className="size-4" aria-hidden /> : <RepeatIcon className="size-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.875rem] font-bold">{s.name}</p>
                      <p className={cn("text-xs", soon ? "font-semibold text-warn" : "text-muted-foreground")}>
                        {s.renewal} · todo dia {s.day}
                      </p>
                    </div>
                    <p className="shrink-0 text-[0.875rem] font-bold tabular-nums">
                      <Money>{formatBRL(s.amount)}</Money>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
