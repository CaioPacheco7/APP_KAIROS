import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 text-[0.6875rem] font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "glass-inner text-foreground",
        /** realce da marca */
        gold: "bg-gold-soft text-gold",
        destructive: "bg-destructive/12 text-destructive",
        outline: "border-line bg-transparent text-muted-foreground",
        ghost: "text-muted-foreground hover:bg-inner",
        link: "text-primary underline-offset-4 hover:underline",
        /** status (sempre acompanhados de texto; ícone quando couber) */
        good: "bg-[color-mix(in_oklab,var(--status-good)_13%,transparent)] text-good",
        warn: "bg-[color-mix(in_oklab,var(--status-warning)_14%,transparent)] text-warn",
        risk: "bg-[color-mix(in_oklab,var(--status-critical)_12%,transparent)] text-risk",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
