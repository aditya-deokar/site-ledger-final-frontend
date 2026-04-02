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
  Settings,
  LogOut,
  User,
  Users2,
  UserCheck,
  X
} from "lucide-react"

// ── Sidebar Context (for hamburger toggle) ──────────
type SidebarCtx = { open: boolean; toggle: () => void; close: () => void }
const SidebarContext = createContext<SidebarCtx>({ open: false, toggle: () => {}, close: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(o => !o), [])
  const close = useCallback(() => setOpen(false), [])
  return <SidebarContext.Provider value={{ open, toggle, close }}>{children}</SidebarContext.Provider>
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

const bottomItems = [
  // { icon: User, label: "Profile", href: "/profile" },
  { icon: LogOut, label: "Logout", href: "/logout" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { open, close } = useSidebar()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={close} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "h-screen w-64 bg-sidebar dark:bg-background border-r border-gray-100 dark:border-border flex flex-col shrink-0",
        // Mobile: fixed overlay, slides in
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo & Branding */}
        <div className="p-8 pb-10 flex items-center justify-between">
          <Link href="/" className="flex flex-col gap-0.5 group" onClick={close}>
            <span className="text-xl font-serif tracking-tight text-gray-900 dark:text-foreground group-hover:text-primary transition-colors">
              SiteLedger
            </span>
            <span className="text-[9px] tracking-[0.3em] font-bold text-gray-400 dark:text-muted-foreground uppercase">
              Construction Management
            </span>
          </Link>
          {/* Close button on mobile */}
          <button onClick={close} className="lg:hidden text-gray-400 hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={close}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                  isActive
                    ? "bg-primary/5 text-primary border-r-2 border-primary"
                    : "text-gray-400 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500")} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Nav */}
        <div className="p-4 border-t border-gray-50 dark:border-border flex flex-col gap-1">
          {bottomItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={close}
              className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted/50 transition-all"
            >
              <item.icon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
