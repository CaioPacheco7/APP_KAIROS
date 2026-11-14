import type { LucideIcon } from "lucide-react";
import { Hourglass } from "@/components/brand/hourglass";
import { IconChip, type Tone } from "@/components/app/icon-chip";
import { cn } from "@/lib/utils";

/** Estado vazio acolhedor: explica o que é a área e oferece o próximo passo. */
export function EmptyState({
  icon,
  tone = "gold",
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid justify-items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      <Hourglass className="pointer-events-none absolute -right-4 -bottom-6 h-36 text-foreground opacity-[0.04]" />
      <IconChip icon={icon} tone={tone} className="size-12 rounded-2xl" />
      <div className="grid grid-cols-1 gap-1">
        <p className="font-display text-2xl leading-tight">{title}</p>
        {children && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {children}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
