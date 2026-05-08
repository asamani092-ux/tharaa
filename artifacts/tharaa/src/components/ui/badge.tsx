import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-[var(--radius-full)] border px-[10px] py-[3px]",
    "text-[11px] font-semibold whitespace-nowrap",
    "transition-colors",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[var(--secondary-400)] focus-visible:outline-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--primary-600)] text-white",
        secondary: "border-transparent bg-[var(--secondary-400)] text-white",
        success: "border-transparent bg-[var(--success-50)] text-[var(--success-600)]",
        warning: "border-transparent bg-[var(--warning-50)] text-[var(--warning-600)]",
        destructive: "border-transparent bg-[var(--error-50)] text-[var(--error-600)]",
        info: "border-transparent bg-[var(--info-50)] text-[var(--info-600)]",
        neutral: "border-transparent bg-[var(--neutral-200)] text-[var(--text-secondary)]",
        outline: "border-[var(--primary-400)] bg-transparent text-[var(--primary-600)]",
        "outline-gold": "border-[var(--secondary-400)] bg-transparent text-[var(--secondary-600)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
