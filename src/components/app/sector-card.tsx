import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { IconChip, type Tone } from "@/components/app/icon-chip";
import { cn } from "@/lib/utils";

/**
 * Um "setor" do Início em vidro: ícone na cor do setor, título e um atalho
 * "Abrir". A foto da cena já está no fundo, então o painel não leva capa.
 */
export function SectorCard({
  title,
  icon,
  tone = "gold",
  href,
  hrefLabel = "Abrir",
  className,
  bodyClassName,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  hrefLabel?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={cn("glass-panel min-w-0 rounded-[20px] p-4 sm:p-5", className)}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconChip icon={icon} tone={tone} className="size-9 rounded-[11px]" iconClassName="size-4" />
          <h2 className="truncate text-lg leading-none font-extrabold tracking-[-0.035em]">{title}</h2>
        </div>
        {href && (
          <Link
            href={href}
            className="touch-hit glass-inner flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[0.6875rem] font-bold whitespace-nowrap transition-colors outline-none hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
          >
            {hrefLabel}
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        )}
      </header>
      <div className={cn("grid grid-cols-1 gap-4", bodyClassName)}>{children}</div>
    </article>
  );
}
