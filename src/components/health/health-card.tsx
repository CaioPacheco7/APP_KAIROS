import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Health, HealthLevel } from "@/lib/finance/health";
import { cn } from "@/lib/utils";

const STYLE: Record<
  HealthLevel,
  { color: string; Icon: typeof InfoIcon }
> = {
  green: { color: "var(--status-good)", Icon: CircleCheckIcon },
  yellow: { color: "var(--status-warning)", Icon: TriangleAlertIcon },
  red: { color: "var(--status-critical)", Icon: OctagonXIcon },
  unknown: { color: "var(--muted-foreground)", Icon: InfoIcon },
};

/** Semáforo: cor + ícone + texto (nunca só a cor). */
export function HealthSummary({
  health,
  className,
}: {
  health: Health;
  className?: string;
}) {
  const { color, Icon } = STYLE[health.level];
  const width = Math.min(Math.max(health.ratio ?? 0, 0), 100);

  return (
    <div
      role="status"
      className={cn("grid gap-3 rounded-xl border p-4", className)}
      style={{ borderColor: `color-mix(in oklch, ${color} 55%, transparent)` }}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0" style={{ color }} aria-hidden />
        <span className="font-medium">{health.label}</span>
        {health.ratio !== null && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {Math.round(health.ratio)}% da renda comprometida
          </span>
        )}
      </div>

      {health.ratio !== null && (
        <div className="h-2 rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(width, 2)}%`, background: color }}
          />
        </div>
      )}

      <p className="text-sm">{health.message}</p>
    </div>
  );
}

export function HealthCard({ health }: { health: Health }) {
  return (
    <Card>
      <CardContent>
        <HealthSummary health={health} className="border-0 p-0" />
      </CardContent>
    </Card>
  );
}
