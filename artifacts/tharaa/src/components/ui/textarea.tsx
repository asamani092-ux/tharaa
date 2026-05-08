import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          [
            "flex min-h-[96px] w-full",
            "rounded-[var(--radius-md)] border-[1.5px] border-[var(--border-strong)]",
            "bg-[var(--bg-primary)] px-[14px] py-[10px]",
            "text-[var(--font-base)] text-[var(--text-primary)]",
            "placeholder:text-[var(--text-secondary)] placeholder:opacity-80",
            "transition-all duration-[var(--dur-normal)] ease-[var(--ease-out)]",
            "hover:border-[var(--primary-400)]",
            "focus-visible:outline-none",
            "focus-visible:border-[var(--primary-600)]",
            "focus-visible:shadow-[0_0_0_3px_rgba(45,55,82,.12)]",
            "disabled:cursor-not-allowed disabled:opacity-[.45]",
            "disabled:bg-[var(--neutral-100)] disabled:text-[var(--text-disabled)]",
          ].join(" "),
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
