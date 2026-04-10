"use client"

import { createContext, useContext, useState, useCallback } from "react"
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
  Users2,
  UserCheck,
  Receipt,
  X,
  PanelLeft,
  Moon,
  Sun
} from "lucide-react"

import { ModeToggle } from "@/components/mode-toggle"
import { useTheme } from "next-themes"

import Image from "next/image"
import logo from "@/assets/logo.png"

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
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })

  const toggle = useCallback(() => setOpen(o => !o), [])
  const close = useCallback(() => setOpen(false), [])
  
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', JSON.stringify(next))
      return next
    })
  }, [])

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
  { icon: Receipt, label: "Transactions", href: "/transactions" },
]

const bottomItems = [{ icon: LogOut, label: "Logout", href: "/logout" }]

export function Sidebar() {
  const pathname = usePathname()
  const { open, collapsed, close, toggleCollapsed } = useSidebar()
  const { theme, setTheme } = useTheme()

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
        collapsed ? "lg:w-20" : "lg:w-64"
      )}>
        {/* Logo & Branding */}
        <div className={cn("flex items-center justify-between gap-3 p-6 pb-8", collapsed && "lg:px-4 lg:py-8")}>
          <Link href="/" className={cn("group flex min-w-0 items-center gap-4 px-2", collapsed && "lg:justify-center lg:px-0")} onClick={close}>
            <Image
              src={logo}
              alt="SiteLedger Logo"
              width={32}
              height={32}
              className={cn("shrink-0", collapsed && "w-8 h-8")}
            />
            {!collapsed && (
              <div className="flex flex-col gap-0.5 overflow-hidden pl-1 pr-2">
                <span className="text-xl font-serif tracking-tight text-sidebar-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                  SiteLedger
                </span>
              </div>
            )}
          </Link>
          {/* Close button on mobile */}
          {!collapsed && (
            <button onClick={close} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-1 flex-col gap-1 px-4 overflow-y-auto scrollbar-none", collapsed && "lg:px-3")}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={close}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                  collapsed && "lg:justify-center lg:px-2",
                  isActive
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60")} />
                <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>


        {/* Bottom Nav */}
        <div className={cn("flex flex-col gap-1 border-t border-sidebar-border p-4", collapsed && "lg:px-3")}>
          {bottomItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={close}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 transition-all",
                collapsed && "lg:justify-center lg:px-2"
              )}
            >
              <item.icon className="w-4 h-4 text-red-400 dark:text-red-500/50" />
              <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Controls: Mode & Collapse */}
        <div className={cn("flex flex-col gap-1 border-t border-sidebar-border p-4", collapsed && "lg:px-3")}>
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all",
              collapsed && "lg:justify-center lg:px-2"
            )}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <PanelLeft className={cn("w-4 h-4", collapsed && "lg:w-5 lg:h-5")} />
            {!collapsed && <span>Collapse Sidebar</span>}
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all",
              collapsed && "lg:justify-center lg:px-2"
            )}
            title={collapsed ? "Toggle Night Mode" : undefined}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Night Mode"}</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
