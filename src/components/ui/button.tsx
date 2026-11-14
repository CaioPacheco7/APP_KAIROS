import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,box-shadow,transform,filter,color] duration-200 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/35 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** ação principal: tinta quente no claro, marfim no noturno */
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_-10px_rgba(20,15,5,0.5)] hover:brightness-[1.08]",
        /** destaque da marca: dourado champanhe */
        gold: "bg-gradient-to-b from-[#e6cc90] to-[#c9a55b] text-[#1f1707] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_22px_-10px_rgba(160,120,40,0.65)] hover:brightness-105",
        outline:
          "border-input bg-card text-foreground shadow-xs hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/15",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-lg px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-[0.9375rem]",
        icon: "size-10",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
