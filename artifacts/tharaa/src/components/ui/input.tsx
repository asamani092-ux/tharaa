import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          [
            "flex w-full",
            "h-14 px-[14px] py-[12px]",
            "rounded-[var(--radius-lg)] border-[1.5px]",
            "border-[var(--border-strong)] bg-[var(--bg-primary)]",
            "text-[15px] text-[var(--text-primary)]",
            "placeholder:text-[var(--text-secondary)] placeholder:opacity-80",
            "transition-all duration-[var(--dur-normal)] ease-[var(--ease-out)]",
            "hover:border-[var(--primary-400)]",
            "focus-visible:outline-none",
            "focus-visible:border-[var(--secondary-400)]",
            "focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)_/_0.28)]",
            "disabled:cursor-not-allowed disabled:opacity-[.45]",
            "disabled:bg-[var(--neutral-100)] disabled:text-[var(--text-disabled)]",
            "file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-[var(--text-primary)]",
          ].join(" "),
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
