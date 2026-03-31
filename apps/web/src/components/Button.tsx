import { Slot } from "@radix-ui/react-slot"
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

type ButtonProps<T extends ElementType = "button"> = {
  asChild?: boolean
  icon?: ReactNode
} & ComponentPropsWithoutRef<T>

export function Button<T extends ElementType = "button">({
  asChild,
  className = "",
  icon,
  children,
  ...props
}: ButtonProps<T>) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={[
        "inline-flex items-center gap-2 rounded-brand border border-brand-border/60",
        "bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary-foreground",
        "shadow-brand transition-transform duration-200 hover:-translate-y-0.5",
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      {children}
    </Comp>
  )
}
