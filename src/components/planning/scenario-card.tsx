import { SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Cartão de um cenário de plano (serve para meta e para dívida). */
export function ScenarioCard({
  title,
  recommended,
  feasible,
  highlight,
  rows,
  note,
  children,
}: {
  title: string;
  recommended?: boolean;
  feasible: boolean;
  /** o número principal do cenário (ex.: valor mensal) */
  highlight: { label: string; value: string };
  rows: Array<[label: string, value: string]>;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "h-full",
        recommended && "border-gold-fill/60 shadow-pop ring-1 ring-gold-fill/25",
        !feasible && "opacity-85",
      )}
    >
      <CardContent className="grid h-full content-start gap-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{title}</h3>
          {recommended ? (
            <Badge variant="gold" className="gap-1">
              <SparklesIcon /> Recomendado
            </Badge>
          ) : !feasible ? (
            <Badge variant="outline">Não cabe hoje</Badge>
          ) : null}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{highlight.label}</p>
          <p className="mt-1 font-display text-5xl leading-none tracking-normal tabular-nums">
            {highlight.value}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-4 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
        <div className="mt-auto">{children}</div>
      </CardContent>
    </Card>
  );
}
