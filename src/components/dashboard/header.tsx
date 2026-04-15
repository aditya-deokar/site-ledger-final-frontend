"use client"

import { Menu } from "lucide-react"

import { useSidebar } from "./sidebar"

export function Header() {
  const { toggle } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:px-6 lg:hidden dark:bg-background/95 dark:border-border">
      <div className="flex items-center">
        <button
          onClick={toggle}
          className="p-2 -ml-2 text-gray-500 transition-colors hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
