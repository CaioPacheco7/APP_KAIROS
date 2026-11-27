import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo (só o cartão, com cantos transparentes) + nome em caixa alta espaçada. */
export function BrandMark({
  size = 34,
  showName = true,
  className,
  nameClassName,
}: {
  size?: number;
  showName?: boolean;
  className?: string;
  nameClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/brand/icone-card.png"
        alt={showName ? "" : "KAIROS"}
        width={size}
        height={size}
        className="shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.25)]"
        loading="eager"
      />
      {showName && (
        <span className={cn("text-[0.8125rem] font-semibold tracking-[0.32em]", nameClassName)}>
          KAIROS
        </span>
      )}
    </span>
  );
}
