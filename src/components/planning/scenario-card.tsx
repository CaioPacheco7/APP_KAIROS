import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Cartão de um cenário de plano (serve para meta e para dívida). */
export function ScenarioCard({
  title,
  recommended,
  feasible,
  rows,
  note,
  children,
}: {
  title: string;
  recommended?: boolean;
  feasible: boolean;
  rows: Array<[label: string, value: string]>;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn(recommended && "ring-2 ring-primary/60", !feasible && "opacity-80")}>
      <CardContent className="grid gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{title}</h3>
          {recommended ? (
            <Badge>Recomendado</Badge>
          ) : !feasible ? (
            <Badge variant="outline">Não cabe hoje</Badge>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-muted-foreground">{note}</p>
        {children}
      </CardContent>
    </Card>
  );
}
