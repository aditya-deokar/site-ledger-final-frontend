"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditCompanyDrawer } from "./edit-company-drawer"

export function CompanyHeader() {
  const [isEditOpen, setIsEditOpen] = useState(false)

  return (
    <>
      <div className="bg-card border border-border p-10 flex items-center justify-between shadow-sm relative overflow-hidden group">
        {/* Decorative Line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/20" />
        <div className="absolute top-0 left-0 w-1/4 h-[3px] bg-primary" />

        {/* Company Info */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] tracking-[0.3em] font-medium text-muted-foreground uppercase">
              Your Company
            </span>
            <h2 className="text-5xl font-serif text-foreground tracking-tight leading-tight">
              GAA <br /> Builders
            </h2>
            <span className="text-[10px] tracking-[0.2em] font-bold text-muted-foreground/50 dark:text-muted-foreground/30 uppercase mt-2">
              Est. 21 March 2026
            </span>
          </div>
          
          <Button 
            onClick={() => setIsEditOpen(true)}
            variant="outline" 
            className="h-10 px-6 border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase hover:bg-primary hover:text-black dark:hover:text-black transition-all rounded-none w-fit"
          >
            Edit Company
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="flex gap-16 mr-10 items-end text-foreground">
          <StatItem label="Total Fund" value="₹3,00,00k" trend="+12%" />
          <StatItem label="Partner Fund" value="₹1,85,00k" />
          <StatItem label="Investor Fund" value="₹95,00k" />
        </div>
      </div>

      <EditCompanyDrawer 
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  )
}

function StatItem({ label, value, trend }: { label: string, value: string, trend?: string }) {
  return (
    <div className="flex flex-col gap-2 min-w-[120px]">
      <span className="text-[10px] tracking-[0.2em] font-bold text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-serif text-foreground tracking-tighter">
          {value}
        </span>
        {trend && (
          <div className="flex items-center text-primary">
            <TrendingUp className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  )
}
