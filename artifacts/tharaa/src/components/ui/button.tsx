import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--radius-md)] border-[1.5px] border-transparent",
    "text-[var(--font-base)] font-medium",
    "transition-all duration-[var(--dur-normal)] ease-[var(--ease-out)]",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[var(--secondary-400)] focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-[.45]",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Safe Migration: keep variant key as "default", visually map to primary button
        default:
          "bg-[var(--primary-600)] text-white hover:bg-[var(--primary-800)] shadow-[var(--shadow-sm)]",
        secondary:
          "bg-[var(--secondary-400)] text-white hover:bg-[var(--secondary-600)] shadow-[var(--shadow-sm)]",
        outline:
          "bg-transparent border-[1.5px] border-[var(--secondary-400)] text-[var(--secondary-600)] hover:bg-[var(--secondary-50)]",
        ghost:
          "bg-transparent border-[1.5px] border-transparent text-[var(--primary-600)] hover:bg-[var(--primary-50)] hover:border-[var(--primary-400)]",
        destructive:
          "bg-[var(--error-400)] text-white hover:bg-[var(--error-600)] shadow-[var(--shadow-sm)]",
        success:
          "bg-[var(--success-600)] text-white hover:bg-[#1b5e20] shadow-[var(--shadow-sm)]",
        link: "border-transparent bg-transparent text-[var(--primary-600)] underline-offset-4 hover:underline",
      },
      size: {
        // Matches design system sizing closer to btn-md/sm/lg
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-[var(--radius-sm)] px-3.5 text-[var(--font-sm)]",
        lg: "h-12 rounded-[var(--radius-lg)] px-7 text-[var(--font-md)]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const spinnerClassByVariant = (variant?: ButtonProps["variant"]) => {
  if (variant === "ghost" || variant === "outline" || variant === "link") {
    return "animate-spin text-[var(--primary-600)]"
  }

  if (variant === "secondary") {
    return "animate-spin text-white"
  }

  return "animate-spin text-white"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className={spinnerClassByVariant(variant)} />}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
