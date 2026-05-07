import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input">
type InputMessageProps = React.ComponentProps<"p"> & {
  variant?: "helper" | "error"
}

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-white text-foreground placeholder:text-muted-foreground file:text-foreground flex h-10 w-full min-w-0 rounded-xl border px-3 py-2 text-sm shadow-sm transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

function InputMessage({ className, variant = "helper", ...props }: InputMessageProps) {
  return (
    <p
      data-slot="input-message"
      className={cn(
        "text-xs",
        variant === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input, InputMessage }
