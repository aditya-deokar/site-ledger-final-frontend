"use client"

import type { ComponentProps, ReactNode } from "react"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export type DetailDensityMode = "comfortable" | "compact"

function isCompact(density: DetailDensityMode) {
  return density === "compact"
}

function dashboardToneClasses(
  tone: "default" | "primary" | "success" | "danger" | "warning",
) {
  switch (tone) {
    case "primary":
      return "text-primary border-primary/20 bg-primary/5"
    case "success":
      return "text-emerald-700 border-emerald-500/25 bg-emerald-500/10 dark:text-emerald-400"
    case "danger":
      return "text-red-600 border-red-500/25 bg-red-500/10 dark:text-red-400"
    case "warning":
      return "text-amber-700 border-amber-500/25 bg-amber-500/10 dark:text-amber-400"
    default:
      return "text-foreground border-border bg-background"
  }
}

export function DashboardPage({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("space-y-6 animate-in fade-in duration-500", className)}
      {...props}
    />
  )
}

export function DashboardPageHeader({
  action,
  className,
  eyebrow,
  subtitle,
  title,
}: {
  action?: ReactNode
  className?: string
  eyebrow?: ReactNode
  subtitle?: ReactNode
  title: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/55">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 text-4xl font-serif tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-start gap-3">{action}</div> : null}
    </div>
  )
}

export function DashboardSection({
  action,
  bodyClassName,
  children,
  className,
  description,
  title,
}: {
  action?: ReactNode
  bodyClassName?: string
  children: ReactNode
  className?: string
  description?: ReactNode
  title?: ReactNode
}) {
  return (
    <Card
      className={cn(
        "min-h-0 rounded-none border border-border bg-card shadow-none ring-0",
        className,
      )}
    >
      {(title || description || action) && (
        <CardHeader className="gap-1 border-b border-border px-4 py-3.5">
          {title ? (
            <CardTitle className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55">
              {title}
            </CardTitle>
          ) : null}
          {description ? (
            <CardDescription className="text-[11px] leading-snug text-muted-foreground/70">
              {description}
            </CardDescription>
          ) : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      )}
      <CardContent className={cn("px-4 py-4", bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

export function DashboardToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-border bg-card p-3 sm:p-4",
        className,
      )}
      {...props}
    />
  )
}

export function DashboardFilterBar({
  action,
  children,
  className,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  title?: ReactNode
}) {
  return (
    <DashboardToolbar className={className}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
              {title}
            </p>
          ) : <span />}
          {action}
        </div>
      )}
      {children}
    </DashboardToolbar>
  )
}

export function DashboardStatsGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)} {...props} />
}

export function DashboardStatCard({
  className,
  description,
  label,
  onClick,
  tone = "default",
  value,
  valueTitle,
}: {
  className?: string
  description?: ReactNode
  label: string
  onClick?: () => void
  tone?: "default" | "primary" | "success" | "danger" | "warning"
  value: ReactNode
  valueTitle?: string
}) {
  const content = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
        {label}
      </p>
      <p
        title={valueTitle}
        className={cn(
          "mt-2 truncate font-sans font-bold tracking-tight",
          typeof value === "string" && value.length >= 14 ? "text-xl" : "text-2xl sm:text-3xl",
          tone === "default" && "text-foreground",
          tone === "primary" && "text-primary",
          tone === "success" && "text-emerald-600",
          tone === "danger" && "text-red-500",
          tone === "warning" && "text-amber-600",
        )}
      >
        {value}
      </p>
      {description ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "min-w-0 border border-border bg-card p-4 text-left transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn("min-w-0 border border-border bg-card p-4", className)}>
      {content}
    </div>
  )
}

export function DashboardStatusBadge({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode
  className?: string
  tone?: "default" | "primary" | "success" | "danger" | "warning"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
        dashboardToneClasses(tone),
        className,
      )}
    >
      {children}
    </span>
  )
}

export function DashboardEmptyState({
  action,
  className,
  description,
  icon,
  title,
}: {
  action?: ReactNode
  className?: string
  description: ReactNode
  icon?: ReactNode
  title?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center border border-border bg-muted/30 text-muted-foreground/45">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        {title ? (
          <p className="text-sm font-medium text-foreground">{title}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function DashboardNotice({
  children,
  className,
  title,
  tone = "info",
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  tone?: "info" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : tone === "success"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border bg-muted/20 text-foreground"

  return (
    <div className={cn("border p-3.5", toneClass, className)}>
      {title ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]">
          {title}
        </p>
      ) : null}
      <div className={cn("text-sm leading-relaxed", title && "mt-2")}>{children}</div>
    </div>
  )
}

export function DashboardField({
  children,
  className,
  error,
  hint,
  label,
}: {
  children: ReactNode
  className?: string
  error?: ReactNode
  hint?: ReactNode
  label: ReactNode
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[10px] text-muted-foreground/70">{hint}</p> : null}
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  )
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
            <CardTitle className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55">
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
