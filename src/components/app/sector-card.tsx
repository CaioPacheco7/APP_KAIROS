import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Um "setor" do app: cartão com foto de capa, ícone, título em serifa e o
 * conteúdo logo abaixo. O texto sobre a foto é sempre claro (há um degradê escuro),
 * então funciona igual nos temas claro e noturno.
 */
export function SectorCard({
  title,
  icon: Icon,
  photo,
  href,
  hrefLabel = "Abrir",
  coverClassName,
  className,
  bodyClassName,
  children,
  layout = "stack",
  priority,
  sizes = "(min-width: 1024px) 560px, 100vw",
}: {
  title: string;
  icon: LucideIcon;
  photo: string;
  href?: string;
  hrefLabel?: string;
  coverClassName?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  /** stack: capa em cima · side: capa à esquerda (telas largas) */
  layout?: "stack" | "side";
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <article
      className={cn(
        "group/sector relative overflow-hidden rounded-3xl border border-border bg-card shadow-card",
        layout === "side" && "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-44 overflow-hidden sm:h-52",
          layout === "side" && "lg:h-full lg:min-h-64",
          coverClassName,
        )}
      >
        <Image
          src={photo}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover/sector:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />

        <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-md">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="font-display text-3xl leading-none tracking-tight sm:text-4xl">{title}</h2>
          </div>
          {href && (
            <Link
              href={href}
              className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium whitespace-nowrap ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/25"
            >
              {hrefLabel}
              <ArrowUpRightIcon className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-5 p-5 sm:p-6", bodyClassName)}>{children}</div>
    </article>
  );
}
