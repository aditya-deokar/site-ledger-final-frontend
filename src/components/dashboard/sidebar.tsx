"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  Users,
  LayoutGrid,
  Building2,
  UserCircle,
  LogOut,
  Menu,
  Users2,
  UserCheck,
  X
} from "lucide-react"

import Image from "next/image"
import logo from "@/assets/logo.png"
import { ModeToggle } from "@/components/mode-toggle"

const SIDEBAR_COLLAPSED_STORAGE_KEY = "site-ledger-sidebar-collapsed"

// ── Sidebar Context (for hamburger toggle) ──────────
type SidebarCtx = {
  open: boolean
  collapsed: boolean
  toggle: () => void
  close: () => void
  toggleCollapsed: () => void
}
const SidebarContext = createContext<SidebarCtx>({
  open: false,
  collapsed: false,
  toggle: () => { },
  close: () => { },
  toggleCollapsed: () => { },
})
export const useSidebar = () => useContext(SidebarContext)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
  })
  const toggle = useCallback(() => setOpen(o => !o), [])
  const close = useCallback(() => setOpen(false), [])
  const toggleCollapsed = useCallback(() => setCollapsed((value) => !value), [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return (
    <SidebarContext.Provider value={{ open, collapsed, toggle, close, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

const menuItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: Users2, label: "Company & Partners", href: "/company" },
  { icon: Building2, label: "Site Management", href: "/sites" },
  { icon: UserCheck, label: "Customers", href: "/customers" },
  { icon: UserCircle, label: "Investors", href: "/investors" },
  { icon: Users, label: "Vendors", href: "/vendors" },
  { icon: BarChart3, label: "Expenses", href: "/expenses" },
]

const bottomItems = [{ icon: LogOut, label: "Logout", href: "/logout" }]

export function Sidebar() {
  const pathname = usePathname()
  const { open, collapsed, close, toggleCollapsed } = useSidebar()
  const isDesktopCompact = collapsed
  const desktopTransition = "lg:transition-[width,padding,gap,transform] lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)]"
  const labelTransition = "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-out"
  const compactSlotClass = "lg:h-12 lg:w-12"
  const expandedSlotClass = "h-10 w-10"

  const handleNavigation = useCallback(() => {
    close()
  }, [close])

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={close} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-sidebar-border bg-sidebar transition-[transform] duration-300 ease-out will-change-transform",
        "w-64 translate-x-0 lg:relative lg:z-auto",
        "lg:transition-[width,transform] lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)] lg:will-change-[width]",
        !open && "max-lg:-translate-x-full",
        isDesktopCompact ? "lg:w-20" : "lg:w-60"
      )}>
        {/* Logo & Branding */}
        <div className={cn("relative px-4 pt-5 pb-3", desktopTransition, isDesktopCompact ? "lg:px-2 lg:pt-12 lg:pb-0" : "lg:pt-5 lg:pb-4")}>
          {isDesktopCompact && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
              className="absolute top-2 left-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 items-center justify-center text-sidebar-foreground/80 transition-colors duration-200 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:inline-flex"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className={cn("flex items-center", isDesktopCompact ? "justify-center" : "justify-between gap-3")}>
            <Link
              href="/"
              className={cn(
                "group flex min-w-0 items-center gap-3",
                isDesktopCompact ? "lg:flex-col lg:justify-center lg:gap-0" : "flex-1"
              )}
              onClick={handleNavigation}
            >
              <span className={cn("flex shrink-0 items-center justify-center", isDesktopCompact ? "lg:h-10 lg:w-10" : expandedSlotClass)}>
                <Image
                  src={logo}
                  alt="SiteLedger Logo"
                  width={32}
                  height={32}
                  className={cn("shrink-0", isDesktopCompact && "lg:h-8 lg:w-8")}
                />
              </span>
              <div className={cn(
                "flex flex-col gap-0.5 pr-2",
                labelTransition,
                isDesktopCompact ? "lg:max-w-0 lg:translate-x-1 lg:opacity-0" : "lg:max-w-40 lg:translate-x-0 lg:opacity-100"
              )}>
                <span className="text-xl font-serif tracking-tight text-sidebar-foreground whitespace-nowrap">
                  SiteLedger
                </span>
              </div>
            </Link>

            {!isDesktopCompact && (
              <button
                type="button"
                onClick={toggleCollapsed}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-pressed={collapsed}
                className="hidden h-10 w-10 shrink-0 items-center justify-center text-sidebar-foreground/80 transition-colors duration-200 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:inline-flex"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={close}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-1 flex-col gap-1 px-4 overflow-y-auto scrollbar-none", desktopTransition, isDesktopCompact ? "lg:items-center lg:px-2 lg:pt-0" : "pt-1")}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavigation}
                title={isDesktopCompact ? item.label : undefined}
                className={cn(
                  "group flex items-center text-[10px] font-bold uppercase tracking-widest transition-[padding,background-color,color] duration-300 ease-out",
                  isDesktopCompact
                    ? `${compactSlotClass} lg:justify-center lg:gap-0 lg:px-0 lg:py-0`
                    : "h-11 gap-2 px-2.5 pr-3.5",
                  isActive
                    ? isDesktopCompact
                      ? "bg-primary/10 text-primary"
                      : "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <span className={cn("flex shrink-0 items-center justify-center", isDesktopCompact ? compactSlotClass : expandedSlotClass)}>
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60")} />
                </span>
                <span className={cn(
                  labelTransition,
                  isDesktopCompact ? "lg:max-w-0 lg:translate-x-1 lg:opacity-0" : "lg:max-w-48 lg:translate-x-0 lg:opacity-100"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {isDesktopCompact ? (
          <>
            <div className={cn("border-t border-sidebar-border px-4 py-4", desktopTransition, "lg:px-2")}>
              <div className="flex justify-center">
                <span className={cn("flex items-center justify-center", compactSlotClass)}>
                  <ModeToggle />
                </span>
              </div>
            </div>

            {/* Bottom Nav */}
            <div className={cn("flex flex-col gap-1 border-t border-sidebar-border px-4 py-4", desktopTransition, "lg:items-center lg:px-2")}>
              {bottomItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={handleNavigation}
                  title={item.label}
                  className={cn(
                    "flex items-center text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 transition-[padding,background-color,color] duration-300 ease-out",
                    `${compactSlotClass} lg:justify-center lg:gap-0 lg:px-0 lg:py-0`
                  )}
                >
                  <span className={cn("flex shrink-0 items-center justify-center", compactSlotClass)}>
                    <item.icon className="h-4 w-4 shrink-0 text-red-400 dark:text-red-500/50" />
                  </span>
                  <span className={cn(labelTransition, "lg:max-w-0 lg:translate-x-1 lg:opacity-0")}>
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className={cn("border-t border-sidebar-border px-4 py-4", desktopTransition)}>
            <div className="flex items-center justify-between gap-3">
              <span className={cn("flex items-center justify-center", expandedSlotClass)}>
                <ModeToggle />
              </span>

              {bottomItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={handleNavigation}
                  className="flex h-10 items-center gap-2 rounded-md px-3 text-[10px] font-bold uppercase tracking-widest text-red-500 transition-[background-color,color] duration-300 ease-out hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                >
                  <span className={cn("flex shrink-0 items-center justify-center", expandedSlotClass)}>
                    <item.icon className="h-4 w-4 shrink-0 text-red-400 dark:text-red-500/50" />
                  </span>
                  <span className={cn(labelTransition, "lg:max-w-32 lg:translate-x-0 lg:opacity-100")}>
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
