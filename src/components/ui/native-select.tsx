import { ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * <select> nativo (envia valor em <form> sem JS extra) com o visual dos inputs.
 * `className` vai para o contêiner (largura, margens); o <select> preenche tudo.
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        className={cn(
          "h-10 w-full min-w-0 appearance-none rounded-xl border border-input bg-surface-2/70 pr-9 pl-3.5 text-base shadow-xs transition-[color,box-shadow,border-color,background-color] outline-none md:text-sm",
          "focus-visible:border-ring focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/25",
          "disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive",
          "[&>option]:bg-popover [&>option]:text-popover-foreground",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
