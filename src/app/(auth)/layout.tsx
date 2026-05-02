"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Building2 } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2">
        <Link
          href="/"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Go to home"
        >
          <Building2 className="h-5 w-5" />
        </Link>
      </div>
      <div className="absolute right-6 top-6 z-10">
        <ModeToggle />
      </div>
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
