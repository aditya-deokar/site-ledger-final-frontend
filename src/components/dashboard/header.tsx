"use client"

import { Menu, PanelLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { useSidebar } from "./sidebar"

export function Header() {
  const { toggle, toggleCollapsed } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:px-6 lg:h-20 lg:px-8 dark:bg-background/95 dark:border-border">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggle}
          className="p-2 -ml-2 text-gray-500 transition-colors hover:text-foreground lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={toggleCollapsed}
          className="hidden h-10 w-10 items-center justify-center border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground lg:flex"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
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
