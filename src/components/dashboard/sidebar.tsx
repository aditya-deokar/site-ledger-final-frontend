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
  X
} from "lucide-react"

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
  toggle: () => {},
  close: () => {},
  toggleCollapsed: () => {},
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
  const { open, collapsed, close } = useSidebar()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={close} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-gray-100 bg-sidebar transition-all duration-300 dark:bg-background dark:border-border",
        "w-64 translate-x-0 lg:relative lg:z-auto",
        !open && "max-lg:-translate-x-full",
        collapsed ? "lg:w-20" : "lg:w-64"
      )}>
        {/* Logo & Branding */}
        <div className={cn("flex items-center justify-between gap-3 p-6 pb-8", collapsed && "lg:px-4")}>
          <Link href="/" className={cn("group flex min-w-0 flex-col gap-0.5", collapsed && "lg:items-center")} onClick={close}>
            <span className="text-xl font-serif tracking-tight text-gray-900 dark:text-foreground group-hover:text-primary transition-colors">
              SiteLedger
            </span>
            <span className={cn("text-[9px] tracking-[0.3em] font-bold text-gray-400 dark:text-muted-foreground uppercase", collapsed && "lg:hidden")}>
              Construction Management
            </span>
          </Link>
          {/* Close button on mobile */}
          <button onClick={close} className="lg:hidden text-gray-400 hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-1 flex-col gap-1 px-4", collapsed && "lg:px-3")}>
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
                    ? "bg-primary/5 text-primary border-r-2 border-primary"
                    : "text-gray-400 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500")} />
                <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Nav */}
        <div className={cn("flex flex-col gap-1 border-t border-gray-50 p-4 dark:border-border", collapsed && "lg:px-3")}>
          {bottomItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={close}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted/50 transition-all",
                collapsed && "lg:justify-center lg:px-2"
              )}
            >
              <item.icon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}
