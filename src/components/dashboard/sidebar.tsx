"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Building,
  HardHat,
  Contact,
  Wallet,
  Store,
  PieChart,
  LogOut,
  X,
  PanelLeft,
  Moon,
  Sun
} from "lucide-react"

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
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ArrowLeftRight, label: "My Transactions", href: "/transactions" },
  { icon: Building, label: "Company & Partners", href: "/company" },
  { icon: HardHat, label: "Site Management", href: "/sites" },
  { icon: Contact, label: "Customers", href: "/customers" },
  { icon: Wallet, label: "Investors", href: "/investors" },
  { icon: Store, label: "Vendors", href: "/vendors" },
  { icon: PieChart, label: "Expenses", href: "/expenses" },
]

const bottomItems = [{ icon: LogOut, label: "Logout", href: "/logout" }]

// Track mount globally for sidebar to prevent navigation flickers
let hasSidebarMountedGlobally = false;

export function Sidebar() {
  const pathname = usePathname()
  const { open, collapsed, close, toggleCollapsed } = useSidebar()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch for theme-dependent UI
  useEffect(() => {
    hasSidebarMountedGlobally = true
    setMounted(true)
  }, [])

  const isDark = mounted && (resolvedTheme === 'dark');

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={close} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-300 ease-in-out",
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
          {menuItems.map((item) => (
            <SidebarItem key={item.label} {...item} pathname={pathname} collapsed={collapsed} close={close} />
          ))}
        </nav>


        {/* Bottom Nav */}
        <div className={cn("flex flex-col gap-1 border-t border-sidebar-border p-4", collapsed && "lg:px-3")}>
          {bottomItems.map((item) => (
            <SidebarItem key={item.label} {...item} pathname={pathname} collapsed={collapsed} close={close} isDestructive />
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
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all",
              collapsed && "lg:justify-center lg:px-2"
            )}
            title={mounted ? (isDark ? "Switch to Light" : "Switch to Night") : "Mode Toggle"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && <span>{mounted ? (isDark ? "Light Mode" : "Night Mode") : "Mode Toggle"}</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

interface SidebarItemProps {
  icon: any;
  label: string;
  href: string;
  pathname: string;
  collapsed: boolean;
  close: () => void;
  isDestructive?: boolean;
}

function SidebarItem({ icon: Icon, label, href, pathname, collapsed, close, isDestructive }: SidebarItemProps) {
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={close}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all",
        collapsed && "lg:justify-center lg:px-2",
        isActive
          ? "bg-primary/10 text-primary border-r-2 border-primary"
          : isDestructive
            ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <Icon className={cn("w-4 h-4", isActive ? "text-primary" : isDestructive ? "text-red-400 dark:text-red-500/50" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60")} />
      <span className={cn(collapsed && "lg:hidden")}>{label}</span>
    </Link>
  );
}
