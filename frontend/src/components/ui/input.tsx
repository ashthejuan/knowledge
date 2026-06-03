import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 border border-[#d6cdbd] bg-white/75 px-4 py-2 text-sm text-[#18221b] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:px-2 file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-[#315b40] focus-visible:ring-2 focus-visible:ring-[#315b40]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
