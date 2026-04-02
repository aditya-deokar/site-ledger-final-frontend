"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { HouseIllustration } from "@/components/auth/house-illustration"
import { Stepper } from "@/components/auth/stepper"
import { StatusMetrics } from "@/components/auth/status-metrics"
import { ModeToggle } from "@/components/mode-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isSignIn = pathname === "/login"

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground selection:bg-primary/20">
      {/* Left Section: Visual/Context */}
      <div className="relative hidden lg:flex flex-col bg-zinc-950 p-16 text-white overflow-hidden border-r border-white/5">
        {/* Top Header */}
        <div className="relative z-20 flex items-center justify-between">
          <Link href="/" className="flex flex-col gap-0.5 group">
            <span className="text-xl font-serif tracking-tight group-hover:text-primary transition-colors">SiteLedger</span>
            <span className="text-[9px] tracking-[0.3em] font-bold text-white/40 uppercase">
              Technical Editorial
            </span>
          </Link>
          <ModeToggle />
        </div>

        {/* Main Content (Changes based on route) */}
        <div className="relative z-20 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          {isSignIn ? (
            <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="w-full flex justify-center drop-shadow-2xl">
                <HouseIllustration />
              </div>
              <div className="flex flex-col gap-6">
                <blockquote className="space-y-4">
                  <p className="text-4xl sm:text-5xl font-serif italic leading-tight tracking-tight text-white/90">
                    &ldquo;Design is not just what it looks like and feels like. Design is how it works.&rdquo;
                  </p>
                  <footer className="flex items-center gap-4">
                    <div className="h-px w-8 bg-primary/40" />
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40">
                      Steve Jobs
                    </span>
                  </footer>
                </blockquote>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex flex-col gap-6">
                <h2 className="text-6xl font-serif italic leading-[1.1] tracking-tighter text-white/95">
                  Build the <br /> <span className="text-primary italic">Future.</span>
                </h2>
                <p className="text-white/40 text-[13px] font-medium leading-relaxed tracking-wide max-w-[280px]">
                  Connect your real estate projects to a global network of institutional investors and partners.
                </p>
              </div>
              
              <Stepper />
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="relative z-20 flex flex-col gap-12">
          {isSignIn ? (
             <div className="grid grid-cols-3 gap-8 border-t border-white/5 pt-8">
                <div className="flex flex-col gap-1">
                   <span className="text-2xl font-serif italic text-white/90">1.2k+</span>
                   <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Global Partners</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-2xl font-serif italic text-white/90">₹450Cr</span>
                   <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">AuM Secured</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-2xl font-serif italic text-white/90">99.9%</span>
                   <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Uptime SLA</span>
                </div>
             </div>
          ) : (
            <div className="border-t border-white/5 pt-8">
              <StatusMetrics />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
            <span>&copy; 2026 SiteLedger Inc. · All Rights Reserved</span>
            <div className="flex gap-8">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Use</Link>
            </div>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Right Section: Forms */}
      <div className="flex flex-col p-8 lg:p-16 justify-center bg-background dark:bg-zinc-950/50">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[380px] animate-in fade-in slide-in-from-right-4 duration-700">
          {children}
        </div>
      </div>
    </div>
  )
}
