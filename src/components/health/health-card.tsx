import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { MoneyText } from "@/components/app/money";
import { Card, CardContent } from "@/components/ui/card";
import type { Health, HealthLevel } from "@/lib/finance/health";
import { cn } from "@/lib/utils";

const STYLE: Record<HealthLevel, { color: string; Icon: typeof InfoIcon }> = {
  green: { color: "var(--status-good)", Icon: CircleCheckIcon },
  yellow: { color: "var(--status-warning)", Icon: TriangleAlertIcon },
  red: { color: "var(--status-critical)", Icon: OctagonXIcon },
  unknown: { color: "var(--muted-foreground)", Icon: InfoIcon },
};

const tint = (color: string, pct: number) =>
  `color-mix(in oklab, ${color} ${pct}%, transparent)`;

/**
 * Semáforo do mês: ícone + nome + % comprometida + um medidor com as três
 * zonas (verde, amarelo, vermelho) e a marca de onde você está. Nunca depende só da cor.
 */
export function HealthSummary({
  health,
  className,
  compact = false,
}: {
  health: Health;
  className?: string;
  /** versão enxuta (sem a frase de orientação) */
  compact?: boolean;
}) {
  const { color, Icon } = STYLE[health.level];
  const ratio = health.ratio;
  const { greenMax, yellowMax } = health;

  // A régua vai até 100%; se o gasto passar da renda, ela se estende.
  const scale = Math.max(100, ratio ?? 0);
  const at = (v: number) => `${(Math.min(v, scale) / scale) * 100}%`;

  return (
    <div role="status" className={cn("grid gap-4", className)}>
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-[12px]"
          style={{ background: tint(color, 15), color }}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold text-muted-foreground">Saúde do mês</p>
          <p className="text-xl leading-tight font-extrabold tracking-[-0.03em]">{health.label}</p>
        </div>
        {ratio !== null && (
          <p className="ml-auto text-right">
            <span className="text-[2rem] leading-none font-extrabold tracking-[-0.05em]">
              {Math.round(ratio)}
              <span className="text-lg">%</span>
            </span>
            <span className="mt-0.5 block text-[0.6875rem] sm:text-[0.625rem] font-semibold text-muted-foreground">da renda comprometida</span>
          </p>
        )}
      </div>

      {ratio !== null && (
        <div className="grid gap-1.5" aria-hidden>
          <div className="relative h-2.5">
            {/* zonas: a trilha mostra o caminho todo, em tons claros do mesmo status */}
            <div className="absolute inset-0 flex gap-[2px] overflow-hidden rounded-full">
              <span style={{ width: at(greenMax), background: tint("var(--status-good)", 22) }} />
              <span style={{ width: `calc(${at(yellowMax)} - ${at(greenMax)})`, background: tint("var(--status-warning)", 24) }} />
              <span className="flex-1" style={{ background: tint("var(--status-critical)", 22) }} />
            </div>
            {/* quanto já foi comprometido */}
            <div
              className="animate-grow-x absolute inset-y-0 left-0 rounded-full"
              style={{ width: at(ratio), background: color }}
            />
            {/* marcador com anel da superfície */}
            <span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_3px_var(--glass-surface)]"
              style={{ left: at(ratio), background: color }}
            />
          </div>
          <div className="relative h-4 text-[0.6875rem] sm:text-[0.625rem] font-semibold text-muted-foreground tabular-nums">
            <span className="absolute left-0">0%</span>
            <span className="absolute -translate-x-1/2" style={{ left: at(greenMax) }}>{greenMax}%</span>
            <span className="absolute -translate-x-1/2" style={{ left: at(yellowMax) }}>{yellowMax}%</span>
          </div>
        </div>
      )}

      {!compact && <p className="text-[0.8125rem] leading-relaxed"><MoneyText>{health.message}</MoneyText></p>}
    </div>
  );
}

export function HealthCard({ health }: { health: Health }) {
  return (
    <Card>
      <CardContent>
        <HealthSummary health={health} />
      </CardContent>
    </Card>
  );
}
