import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-[12px] border border-input bg-inner px-3.5 py-2.5 text-base shadow-[inset_0_1px_0_var(--glass-gloss)] transition-[color,box-shadow,border-color,background-color] outline-none placeholder:text-muted-foreground/85 focus-visible:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
