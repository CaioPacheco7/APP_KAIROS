import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Hourglass } from "@/components/brand/hourglass";
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
 * Semáforo do mês: ícone + nome + % comprometida + uma régua com as três zonas
 * (verde, amarelo, vermelho) e a marca de onde você está. Nunca depende só da cor.
 */
export function HealthSummary({
  health,
  className,
}: {
  health: Health;
  className?: string;
}) {
  const { color, Icon } = STYLE[health.level];
  const ratio = health.ratio;
  const { greenMax, yellowMax } = health;

  // A régua vai até 100%; se o gasto passar da renda, ela se estende.
  const scale = Math.max(100, ratio ?? 0);
  const at = (v: number) => `${(Math.min(v, scale) / scale) * 100}%`;

  return (
    <div
      role="status"
      className={cn("relative grid gap-5 overflow-hidden rounded-2xl border p-5", className)}
      style={{ borderColor: tint(color, 38), background: `linear-gradient(135deg, ${tint(color, 7)}, transparent 60%)` }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl"
          style={{ background: tint(color, 16), color }}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Saúde financeira do mês</p>
          <p className="font-display text-3xl leading-none tracking-normal">{health.label}</p>
        </div>
        {ratio !== null && (
          <p className="ml-auto text-right">
            <span className="font-display text-5xl leading-none tracking-normal tabular-nums">
              {Math.round(ratio)}
              <span className="text-2xl">%</span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">da renda comprometida</span>
          </p>
        )}
      </div>

      {ratio !== null && (
        <div className="grid gap-1.5" aria-hidden>
          <div className="relative h-3">
            {/* zonas */}
            <div className="absolute inset-0 flex overflow-hidden rounded-full">
              <span style={{ width: at(greenMax), background: tint("var(--status-good)", 26) }} />
              <span style={{ width: `calc(${at(yellowMax)} - ${at(greenMax)})`, background: tint("var(--status-warning)", 30) }} />
              <span className="flex-1" style={{ background: tint("var(--status-critical)", 26) }} />
            </div>
            {/* quanto já foi comprometido */}
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: at(ratio), background: color, boxShadow: `0 0 14px -2px ${tint(color, 60)}` }}
            />
            {/* marcador */}
            <span
              className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card"
              style={{ left: at(ratio), background: color }}
            />
          </div>
          <div className="relative h-4 text-[0.6875rem] text-muted-foreground tabular-nums">
            <span className="absolute left-0">0%</span>
            <span className="absolute -translate-x-1/2" style={{ left: at(greenMax) }}>{greenMax}%</span>
            <span className="absolute -translate-x-1/2" style={{ left: at(yellowMax) }}>{yellowMax}%</span>
          </div>
        </div>
      )}

      <p className="text-[0.9375rem] leading-relaxed">{health.message}</p>
    </div>
  );
}

export function HealthCard({ health }: { health: Health }) {
  return (
    <Card className="relative">
      <Hourglass className="pointer-events-none absolute -right-6 -bottom-8 h-48 text-foreground opacity-[0.035]" />
      <CardContent>
        <HealthSummary health={health} className="overflow-visible rounded-none border-0 bg-none p-0" />
      </CardContent>
    </Card>
  );
}
