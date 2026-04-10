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
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Profile */}
        {/* Removed User Profile Icon */}
      </div>
    </header>
  )
}
