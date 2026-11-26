import { cn } from "@/lib/utils";

/**
 * Cabeçalho de página: etiqueta do setor, título grande e bem fechado (como no
 * modelo de vidro), uma linha de apoio e as ações à direita.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "animate-rise flex flex-col items-start justify-between gap-x-6 gap-y-3 md:flex-row md:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="text-[clamp(1.8rem,3.35vw,3.05rem)] leading-[1.03] font-extrabold tracking-[-0.06em]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-[0.8125rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">{actions}</div>}
    </header>
  );
}
