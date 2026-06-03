import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-xs/relaxed font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#315b40] text-white shadow-lg shadow-[#315b40]/15 hover:bg-[#254833]",
        outline:
          "border-[#d6cdbd] bg-white/70 text-[#26332a] shadow-sm backdrop-blur hover:bg-white aria-expanded:bg-white aria-expanded:text-[#18221b] dark:bg-input/30",
        secondary:
          "border-[#18221b]/10 bg-white/50 text-[#26332a] backdrop-blur hover:bg-white/75 aria-expanded:bg-white/70 aria-expanded:text-[#18221b]",
        ghost:
          "text-[#4f5a50] hover:bg-[#315b40]/10 hover:text-[#18221b] aria-expanded:bg-[#315b40]/10 aria-expanded:text-[#18221b] dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-7 gap-1 px-2.5 text-[0.625rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-8 gap-1.5 px-3 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-9 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-4",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
