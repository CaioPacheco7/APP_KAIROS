import { cn } from "@/lib/utils";

/** Painel de vidro com cabeçalho (título, subtítulo e uma ação à direita). */
export function Panel({
  title,
  subtitle,
  action,
  className,
  headerClassName,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("glass-panel min-w-0 rounded-[20px] px-4 py-[15px]", className)}>
      <header className={cn("mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2", headerClassName)}>
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] leading-snug font-bold tracking-[-0.024em]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
