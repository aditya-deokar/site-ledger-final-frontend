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
  PanelLeft,
  Users2,
  UserCheck,
  X
} from "lucide-react"

import Image from "next/image"
import logo from "@/assets/logo.png"
import { ModeToggle } from "@/components/mode-toggle"

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
  const [collapsed, setCollapsed] = useState(false)
  const toggle = useCallback(() => setOpen(o => !o), [])
  const close = useCallback(() => setOpen(false), [])
  const toggleCollapsed = useCallback(() => setCollapsed((value) => !value), [])

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
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const [suspendHoverExpand, setSuspendHoverExpand] = useState(false)
  const isDesktopCompact = collapsed && !hoverExpanded

  useEffect(() => {
    if (!collapsed) {
      setHoverExpanded(false)
      setSuspendHoverExpand(false)
    }
  }, [collapsed])

  const handleMouseEnter = useCallback(() => {
    if (collapsed && !suspendHoverExpand) {
      setHoverExpanded(true)
    }
  }, [collapsed, suspendHoverExpand])

  const handleMouseLeave = useCallback(() => {
    setHoverExpanded(false)
    setSuspendHoverExpand(false)
  }, [])

  const handleNavigation = useCallback(() => {
    close()

    if (collapsed) {
      setHoverExpanded(false)
      setSuspendHoverExpand(true)
    }
  }, [close, collapsed])

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={close} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        "w-64 translate-x-0 lg:relative lg:z-auto",
        !open && "max-lg:-translate-x-full",
        isDesktopCompact ? "lg:w-20" : "lg:w-64"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      >
        {/* Logo & Branding */}
        <div className={cn("flex items-center justify-between gap-3 p-6 pb-8", isDesktopCompact && "lg:px-4 lg:py-8")}>
          <Link href="/" className={cn("group flex min-w-0 items-center gap-4 px-2", isDesktopCompact && "lg:justify-center lg:px-0")} onClick={handleNavigation}>
            <Image
              src={logo}
              alt="SiteLedger Logo"
              width={32}
              height={32}
              className={cn("shrink-0", isDesktopCompact && "lg:h-8 lg:w-8")}
            />
            <div className={cn("flex flex-col gap-0.5 overflow-hidden pl-1 pr-2", isDesktopCompact && "lg:hidden")}>
              <span className="text-xl font-serif tracking-tight text-sidebar-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                SiteLedger
              </span>
            </div>
          </Link>
          {/* Close button on mobile */}
          <button onClick={close} className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-1 flex-col gap-1 px-4 overflow-y-auto scrollbar-none", isDesktopCompact && "lg:px-3")}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavigation}
                title={isDesktopCompact ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                  isDesktopCompact && "lg:justify-center lg:px-2",
                  isActive
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60")} />
                <span className={cn(isDesktopCompact && "lg:hidden")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={cn("border-t border-sidebar-border p-4", isDesktopCompact && "lg:px-3")}>
          <div className={cn("flex items-center gap-2", isDesktopCompact ? "justify-center lg:flex-col" : "justify-between")}>
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "hidden border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/70 transition-colors hover:border-primary/30 hover:text-sidebar-foreground lg:flex",
                isDesktopCompact ? "h-10 w-10 items-center justify-center" : "h-10 flex-1 items-center justify-center gap-2 px-3"
              )}
            >
              <PanelLeft className="h-4 w-4" />
              {!isDesktopCompact && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  {collapsed ? "Expand" : "Collapse"}
                </span>
              )}
            </button>

            <div className={cn("flex", isDesktopCompact ? "justify-center" : "ml-auto")}>
              <ModeToggle />
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className={cn("flex flex-col gap-1 border-t border-sidebar-border p-4", isDesktopCompact && "lg:px-3")}>
          {bottomItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleNavigation}
              title={isDesktopCompact ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 transition-all",
                isDesktopCompact && "lg:justify-center lg:px-2"
              )}
            >
              <item.icon className="w-4 h-4 text-red-400 dark:text-red-500/50" />
              <span className={cn(isDesktopCompact && "lg:hidden")}>{item.label}</span>
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}
