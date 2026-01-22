"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

type AdminPageShellProps = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

function AdminPageShell({ title, subtitle, actions, children }: AdminPageShellProps) {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  )
}

type AdminToolbarProps = {
  search?: React.ReactNode
  filters?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

function AdminToolbar({ search, filters, actions, className }: AdminToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
        {search ? <div className="flex-1">{search}</div> : null}
        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      </div>
      {actions ? <div className="grid grid-cols-1 sm:flex items-center gap-2 md:shrink-0">{actions}</div> : null}
    </div>
  )
}

type AdminResponsiveListProps = {
  desktop: React.ReactNode
  mobile: React.ReactNode
}

function AdminResponsiveList({ desktop, mobile }: AdminResponsiveListProps) {
  return (
    <>
      <div className="hidden md:block">{desktop}</div>
      <div className="md:hidden">{mobile}</div>
    </>
  )
}

type AdminEmptyStateProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description ? <div className="text-xs">{description}</div> : null}
      {action}
    </div>
  )
}

function AdminListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-20 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
      ))}
    </div>
  )
}

type AdminModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "dialog" | "sheet" | "sheetOnMobile"
  footer?: React.ReactNode
  children: React.ReactNode
  bodyClassName?: string
}

const dialogSizeClasses: Record<NonNullable<AdminModalProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
}

function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  variant = "dialog",
  footer,
  children,
  bodyClassName,
}: AdminModalProps) {
  const isMobile = useMediaQuery("(max-width: 639px)")
  const useSheet = variant === "sheet" || (variant === "sheetOnMobile" && isMobile)

  if (useSheet) {
    const side = isMobile ? "bottom" : "right"
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={cn(
            isMobile
              ? "w-screen max-w-none rounded-t-3xl border-t border-border px-0 pb-0"
              : "w-[min(100vw,720px)] max-w-2xl border-l border-border",
            "max-h-[85dvh]"
          )}
        >
          <SheetHeader className="px-6 pb-2 pt-6">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
            <div className={cn("space-y-4", bodyClassName)}>{children}</div>
          </ScrollArea>
          {footer ? (
            <SheetFooter className="border-t border-border bg-white px-6 py-4">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                {footer}
              </div>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogSizeClasses[size]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody className={cn("space-y-4", bodyClassName)}>{children}</DialogBody>
        {footer ? <DialogFooter className="border-t border-border pt-3">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}

type AdminClearButtonProps = {
  onClick: () => void
  label?: string
  className?: string
}

function AdminClearButton({ onClick, label = "Clear filters", className }: AdminClearButtonProps) {
  return (
    <IconButton
      size="icon-sm"
      variant="outline"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={className}
    >
      <XIcon className="size-4" />
    </IconButton>
  )
}

export {
  AdminPageShell,
  AdminToolbar,
  AdminResponsiveList,
  AdminEmptyState,
  AdminListSkeleton,
  AdminModal,
  AdminClearButton,
}
