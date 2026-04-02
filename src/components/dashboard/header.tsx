"use client"

import { Search, Bell, User, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { useSidebar } from "./sidebar"

export function Header() {
  const { toggle } = useSidebar()

  return (
    <header className="h-16 lg:h-20 border-b border-gray-100 bg-white dark:bg-background dark:border-border flex items-center justify-between px-4 sm:px-6 lg:px-10 shrink-0">
      {/* Left: Hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-foreground transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-6">
        <ModeToggle />

        {/* Search — hidden on small screens */}
        {/* <div className="relative w-48 sm:w-64 lg:w-80 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="SEARCH BLUEPRINTS..."
            className="pl-10 h-10 bg-gray-50 dark:bg-muted border-transparent text-[10px] tracking-widest font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600 focus-visible:bg-white dark:focus-visible:bg-background focus-visible:border-primary/20 rounded-none w-full"
          />
        </div> */}

        {/* Notifications */}
        {/* Removed Notifications Icon */}

        {/* User Profile */}
        {/* Removed User Profile Icon */}
      </div>
    </header>
  )
}
