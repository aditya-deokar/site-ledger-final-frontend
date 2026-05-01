"use client"

import type { ComponentProps, ReactNode } from "react"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export type DetailDensityMode = "comfortable" | "compact"

function isCompact(density: DetailDensityMode) {
  return density === "compact"
}

export function DashboardGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("grid min-h-0 gap-4", className)} {...props} />
}

export function DashboardCard({
  action,
  children,
  className,
  contentClassName,
  density = "comfortable",
  description,
  headerClassName,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  density?: DetailDensityMode
  description?: ReactNode
  headerClassName?: string
  title?: ReactNode
}) {
  const compact = isCompact(density)

  return (
    <Card
      size={compact ? "sm" : "default"}
      className={cn(
        "min-h-0 rounded-none border border-border bg-background shadow-none ring-0",
        className,
      )}
    >
      {(title || description || action) && (
        <CardHeader
          className={cn(
            compact ? "gap-0.5 border-b border-border px-3 py-3" : "gap-1 border-b border-border px-4 py-3.5",
            headerClassName,
          )}
        >
          {title ? (
            <CardTitle className={cn(compact ? "text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55" : "text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55")}>
              {title}
            </CardTitle>
          ) : null}
          {description ? (
            <CardDescription className={cn(compact ? "text-[10px] leading-snug text-muted-foreground/70" : "text-[11px] leading-snug text-muted-foreground/70")}>
              {description}
            </CardDescription>
          ) : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      )}
      <CardContent className={cn(compact ? "min-h-0 px-3 pb-3" : "min-h-0 px-4 pb-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

export function KpiBox({
  label,
  progress,
  progressLabel,
  tone = "default",
  value,
  density = "comfortable",
}: {
  label: string
  progress?: number
  progressLabel?: string
  tone?: "default" | "success" | "danger" | "primary"
  value: ReactNode
  density?: DetailDensityMode
}) {
  const compact = isCompact(density)

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col justify-between rounded-none border border-border bg-background",
        compact ? "px-3 py-3" : "px-4 py-4",
      )}
    >
      <span className={cn("font-bold uppercase text-muted-foreground/50", compact ? "text-[8px] tracking-[0.18em]" : "text-[9px] tracking-[0.18em]")}>
        {label}
      </span>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span
          className={cn(
            "min-w-0 truncate font-sans font-bold tracking-tight",
            compact ? "text-lg" : "text-[1.65rem]",
            tone === "success" && "text-emerald-600",
            tone === "danger" && "text-red-500",
            tone === "primary" && "text-primary",
            tone === "default" && "text-foreground",
          )}
        >
          {value}
        </span>
        {typeof progress === "number" ? (
          <div className="flex min-w-[88px] flex-col items-end gap-1">
            <span className={cn("font-bold uppercase text-muted-foreground/55", compact ? "text-[8px] tracking-[0.14em]" : "text-[9px] tracking-[0.14em]")}>
              {progressLabel ?? `${progress.toFixed(0)}%`}
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  tone === "success" ? "bg-emerald-500" : tone === "danger" ? "bg-red-500" : "bg-primary",
                )}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function DetailKeyValue({
  density = "comfortable",
  label,
  value,
  valueClassName,
}: {
  density?: DetailDensityMode
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  const compact = isCompact(density)

  return (
    <div className={cn("grid min-w-0 gap-2 border-b border-border last:border-b-0", compact ? "grid-cols-[84px_minmax(0,1fr)] py-2" : "grid-cols-[96px_minmax(0,1fr)] py-2.5")}>
      <span className={cn("font-bold uppercase text-muted-foreground/50", compact ? "text-[8px] tracking-[0.18em]" : "text-[9px] tracking-[0.18em]")}>
        {label}
      </span>
      <span className={cn("min-w-0 break-words text-right font-medium leading-snug text-foreground", compact ? "text-[11px]" : "text-xs", valueClassName)}>
        {value}
      </span>
    </div>
  )
}

export function DashboardTableShell({
  action,
  bodyClassName,
  children,
  className,
  density = "comfortable",
  description,
  title,
}: {
  action?: ReactNode
  bodyClassName?: string
  children: ReactNode
  className?: string
  density?: DetailDensityMode
  description?: ReactNode
  title: ReactNode
}) {
  const compact = isCompact(density)

  return (
    <DashboardCard
      title={title}
      description={description}
      action={action}
      density={density}
      className={className}
      contentClassName={cn("min-h-0 px-0 pb-0", bodyClassName)}
    >
      {children}
    </DashboardCard>
  )
}

export function CompactModeToggle({
  checked,
  density = "comfortable",
  onCheckedChange,
}: {
  checked: boolean
  density?: DetailDensityMode
  onCheckedChange: (checked: boolean) => void
}) {
  const compact = isCompact(density)

  return (
    <label className={cn("inline-flex items-center gap-2 rounded-none border border-border bg-background", compact ? "px-2 py-1.5" : "px-3 py-2")}>
      <span className={cn("font-bold uppercase text-muted-foreground/60", compact ? "text-[8px] tracking-[0.16em]" : "text-[9px] tracking-[0.16em]")}>
        Compact Mode
      </span>
      <Switch
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </label>
  )
}
