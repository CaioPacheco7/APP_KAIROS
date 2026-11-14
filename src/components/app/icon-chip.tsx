import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cada setor tem uma cor própria, só em detalhes: facilita reconhecer onde você está. */
const TONES = {
  gold: "bg-gold-soft text-gold",
  sage: "bg-[#5f9f8a]/15 text-[#2d7560] dark:bg-[#7fc3ad]/15 dark:text-[#8fd0ba]",
  rose: "bg-[#b9645c]/12 text-[#a14a42] dark:bg-[#e0a199]/14 dark:text-[#e8aea6]",
  sky: "bg-[#3f7fd0]/12 text-[#2a5fa8] dark:bg-[#6fa8ee]/14 dark:text-[#95bff2]",
  ember: "bg-[#d9692f]/13 text-[#b4501f] dark:bg-[#f0916a]/14 dark:text-[#f0a07e]",
  neutral: "bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof TONES;

/** Quadradinho arredondado com um ícone dentro. */
export function IconChip({
  icon: Icon,
  tone = "neutral",
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl",
        TONES[tone],
        className,
      )}
    >
      <Icon className={cn("size-[1.15rem]", iconClassName)} aria-hidden />
    </span>
  );
}
