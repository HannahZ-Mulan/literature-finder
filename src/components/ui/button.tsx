import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // primary:墨色渐变 + 琥珀扫光(SPEC-004)。btn-shine 提供 hover 扫光。
        default:
          "btn-shine bg-gradient-to-br from-[#2a2418] to-primary text-primary-foreground shadow-[0_6px_16px_-8px_hsl(30_22%_10%/0.5)] hover:shadow-[0_10px_22px_-10px_hsl(30_22%_10_/0.6)] hover:-translate-y-[1px]",
        destructive:
          "bg-gradient-to-br from-[#c4573a] to-destructive text-destructive-foreground shadow-[0_6px_16px_-8px_hsl(14_62%_41%/0.5)] hover:shadow-[0_10px_22px_-10px_hsl(14_62%_41%/0.6)] hover:-translate-y-[1px]",
        outline:
          "border border-[hsl(40_76%_40%/0.3)] bg-card/60 backdrop-blur-[8px] hover:border-[hsl(40_76%_40%)] hover:bg-[hsl(45_80%_85%/0.4)] hover:-translate-y-[1px]",
        secondary:
          "bg-card/60 backdrop-blur-[8px] border border-white/50 text-secondary-foreground hover:bg-card/80 hover:-translate-y-[1px]",
        ghost:
          "hover:bg-[hsl(40_76%_40%/0.1)] hover:text-[hsl(40_76%_30%)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
