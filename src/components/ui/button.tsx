import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-[0.8125rem] font-bold whitespace-nowrap transition-[background-color,box-shadow,transform,filter,color] duration-200 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 pointer-coarse:after:absolute pointer-coarse:after:-inset-1 pointer-coarse:after:rounded-full pointer-coarse:after:content-['']",
  {
    variants: {
      variant: {
        /** ação principal: tinta quente no claro, marfim no noturno */
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-8px_rgb(var(--glass-shadow)/0.6)] hover:brightness-[1.17]",
        /** destaque da marca: dourado champanhe */
        gold: "bg-gradient-to-b from-[#ecd59c] to-[#c9a55b] text-[#1f1707] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_20px_-10px_rgba(140,100,30,0.7)] hover:brightness-105",
        /** vidro elevado */
        outline:
          "glass-raised text-foreground hover:bg-surface",
        secondary:
          "glass-inner text-foreground hover:bg-raised",
        ghost:
          "text-muted-foreground hover:bg-inner hover:text-foreground",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/18",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        // no toque (celular), os tamanhos pequenos crescem um pouco; o resto da área
        // de toque vem do ::after acima (4 px para cada lado): todos passam de 44 px
        xs: "h-7 gap-1 px-2.5 text-xs pointer-coarse:h-9 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3.5 text-[0.78125rem] pointer-coarse:h-10 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-[0.875rem]",
        icon: "size-10",
        "icon-xs": "size-7 pointer-coarse:size-9 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 pointer-coarse:size-10",
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
