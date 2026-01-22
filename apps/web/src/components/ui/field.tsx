import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

type FieldProps = React.ComponentProps<"div"> & {
  label?: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  htmlFor?: string
  required?: boolean
}

type FieldLabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  required?: boolean
}

type FieldMessageProps = React.ComponentProps<"p"> & {
  variant?: "helper" | "error"
}

function Field({
  label,
  description,
  error,
  htmlFor,
  required,
  className,
  children,
  ...props
}: FieldProps) {
  const content = label ? (
    <LabelPrimitive.Root
      data-slot="field-label"
      className="flex flex-col gap-1.5"
      htmlFor={htmlFor}
    >
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </LabelPrimitive.Root>
  ) : (
    children
  )

  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      {content}
      {error ? (
        <FieldMessage variant="error">{error}</FieldMessage>
      ) : description ? (
        <FieldMessage>{description}</FieldMessage>
      ) : null}
    </div>
  )
}

function FieldLabel({
  className,
  required,
  children,
  ...props
}: FieldLabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="field-label"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    >
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </LabelPrimitive.Root>
  )
}

function FieldMessage({
  className,
  variant = "helper",
  ...props
}: FieldMessageProps) {
  return (
    <p
      data-slot="field-message"
      className={cn(
        "text-xs",
        variant === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Field, FieldLabel, FieldMessage }
