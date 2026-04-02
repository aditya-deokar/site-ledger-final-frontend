"use client"

import { useState } from "react"
import { Users, UserPlus, Phone, Mail, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddPartnerDrawer } from "./add-partner-drawer"
import { EditPartnerDrawer } from "./edit-partner-drawer"
import { cn } from "@/lib/utils"

const partners = [
  { id: 1, name: "Aditya Devkar", initials: "AD", email: "aditya@gaa-builders.in", phone: "+91 98765 43210", investment: "₹75,00,000", stake: "25%", color: "bg-primary", stakePercentage: 25 },
  { id: 2, name: "Rohan Mehta", initials: "RM", email: "rohan.m@gaa-builders.in", phone: "+91 81234 56789", investment: "₹60,00,000", stake: "20%", color: "bg-blue-400 dark:bg-blue-500", stakePercentage: 20 },
  { id: 3, name: "Priya Kapoor", initials: "PK", email: "priya.k@gaa-builders.in", phone: "+91 99987 76655", investment: "₹30,00,000", stake: "10%", color: "bg-orange-400 dark:bg-orange-500", stakePercentage: 10 },
]

export function PartnerList() {
  const [editingPartner, setEditingPartner] = useState<typeof partners[0] | null>(null)
  
  const totalStake = partners.reduce((sum, partner) => sum + partner.stakePercentage, 0)
  const totalInvestment = "₹1,65,00,000" // This would be calculated from real data
  const isOverLimit = totalStake > 100

  return (
    <div className="flex flex-col gap-6">
      {/* List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-serif text-foreground tracking-tight">Partners</h3>
          <span className="bg-muted px-2 py-0.5 text-[8px] font-bold tracking-widest text-muted-foreground uppercase">04</span>
        </div>
        
        {/* <AddPartnerDrawer /> */}
      </div>

      {/* Partners Cards */}
      <div className="flex flex-col gap-3">
        {partners.map((partner) => (
          <div 
            key={partner.id} 
            onClick={() => setEditingPartner(partner)}
            className="bg-card border border-border p-6 flex items-center justify-between hover:border-primary/20 transition-all group overflow-hidden relative cursor-pointer"
          >
            {/* Active Indicator Left */}
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-primary/0 group-hover:bg-primary transition-all" />
            
            <div className="flex items-center gap-6 flex-1">
              <div className={`w-12 h-12 ${partner.color} flex items-center justify-center text-black font-bold text-sm select-none`}>
                {partner.initials}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">{partner.name}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{partner.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-16 pr-10">
              <div className="flex flex-col gap-1 items-end min-w-[100px]">
                <span className="text-[8px] tracking-[0.2em] font-bold text-muted-foreground/30 uppercase">Contact</span>
                <span className="text-[10px] text-muted-foreground font-medium">{partner.phone}</span>
              </div>
              
              <div className="flex flex-col gap-1 items-end min-w-[120px]">
                <span className="text-[8px] tracking-[0.2em] font-bold text-muted-foreground/30 uppercase">Investment</span>
                <span className="text-sm font-bold text-foreground">{partner.investment}</span>
              </div>

              <div className="flex flex-col gap-1 items-end min-w-[100px]">
                <span className="text-[8px] tracking-[0.2em] font-bold text-muted-foreground/30 uppercase">Stake</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">{partner.stake}</span>
                  <div className="w-12 h-1 bg-muted relative overflow-hidden">
                    <div className={`h-full ${partner.color} transition-all duration-1000`} style={{ width: partner.stake }} />
                  </div>
                </div>
              </div>
            </div>

            <button className="p-2 text-muted-foreground/20 hover:text-muted-foreground transition-colors group-hover:text-muted-foreground">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        ))}

        {/* Total Row */}
        <div className={cn(
          "border p-6 flex items-center justify-between mt-2",
          isOverLimit 
            ? "bg-destructive/10 border-destructive/30" 
            : "bg-muted/30 border-border/50"
        )}>
          <div className="flex items-center gap-6 flex-1">
             <span className="text-[10px] tracking-[0.2em] font-bold uppercase px-4">
               {isOverLimit ? "Total (Over Limit)" : "Total"}
             </span>
          </div>
          <div className={cn(
            "flex items-center gap-16 pr-10",
            isOverLimit ? "text-destructive" : "text-foreground"
          )}>
             <div className="flex items-center gap-10 min-w-[340px] justify-end">
               <span className="text-lg font-serif tracking-tight">{totalInvestment}</span>
               <div className="flex items-center gap-3">
                 <span className={cn(
                   "text-lg font-serif",
                   isOverLimit && "text-destructive font-bold"
                 )}>
                   {totalStake}%
                 </span>
                 <div className="w-12 h-1.5 bg-muted relative overflow-hidden">
                   <div className={cn(
                     "h-full transition-all duration-500",
                     isOverLimit ? "bg-destructive" : "bg-primary"
                   )} style={{ width: `${Math.min(totalStake, 100)}%` }} />
                 </div>
               </div>
             </div>
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* {editingPartner && (
        <EditPartnerDrawer 
          isOpen={!!editingPartner}
          onOpenChange={(open) => !open && setEditingPartner(null)}
          partner={editingPartner as any}
          totalPartners={partners.length}
        />
      )} */}
    </div>
  )
}
