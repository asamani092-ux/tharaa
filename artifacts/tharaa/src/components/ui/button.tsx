import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20 border border-transparent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm",
        outline:
          "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        ghost:
          "hover:bg-accent hover:text-accent-foreground text-muted-foreground border border-transparent",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 shadow-lg shadow-destructive/20 border border-transparent",
        success:
          "bg-success text-success-foreground hover:brightness-110 shadow-lg shadow-success/20 border border-transparent",
        link: 
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-2", // حجم أكبر ومريح للعين واللمس
        sm: "h-10 rounded-[var(--radius-sm)] px-4 text-sm",
        lg: "h-14 rounded-[var(--radius-lg)] px-8 text-lg",
        icon: "h-12 w-12",
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
  isLoading?: boolean // 🌟 إضافة خاصية التحميل الذكية
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    
    // إذا كان المكون يستخدم asChild (مثل استخدامه داخل Link)
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

    // الزر الطبيعي
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
