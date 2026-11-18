import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        //Default behaviors
        default: "bg-primary text-primary-foreground hover:bg-primary/75",
        muted: "bg-muted text-muted-foreground hover:bg-secondary hover:text-seconbg-secondary-foreground",
        link: "text-accent underline-offset-4 hover:underline",

        //Semantic variants
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/75",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/75",
        success:
          "bg-success text-success-foreground hover:bg-success/75",
        info:
          "bg-info text-info-foreground hover:bg-info/75",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/75",

        // Ghost buttons are transparent and only change color on hover
        ghost:
          "hover:bg-primary hover:text-primary-foreground",
        "ghost-destructive":
          "text-destructive hover:bg-destructive hover:text-destructive-foreground",
        "ghost-warning":
          "text-warning hover:bg-warning hover:text-warning-foreground",
        "ghost-success":
          "text-success hover:bg-success hover:text-success-foreground",
        "ghost-info":
          "text-info hover:bg-info hover:text-info-foreground",
        "ghost-secondary":
          "text-secondary hover:bg-secondary hover:text-secondary-foreground",
        "ghost-muted":
          "text-muted-foreground hover:bg-muted hover:text-muted-foreground",

        // Outline buttons have a border and change background and text color on hover
        outline:
          "border border-foreground hover:bg-primary hover:text-primary-foreground",
        "outline-destructive":
          "border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
        "outline-warning":
          "border border-warning text-warning hover:bg-warning hover:text-warning-foreground",
        "outline-success":
          "border border-success text-success hover:bg-success hover:text-success-foreground",
        "outline-info":
          "border border-info text-info hover:bg-info hover:text-info-foreground",
        "outline-secondary":
          "border border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground",
        "outline-muted":
          "border border-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        inline: "h-5 px-1.5 rounded-sm text-xs tracking-wider",
        xs: "h-7 rounded-sm px-2 text-sm",
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
