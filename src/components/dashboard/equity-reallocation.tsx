"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Partner } from "@/schemas/company.schema"
import { useBatchUpdatePartners } from "@/hooks/api/company.hooks"
import { Loader2 } from "lucide-react"

interface EquityReallocationProps {
  partners: Partner[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updatedPartners: Partner[]) => void
}

export function EquityReallocation({ partners, isOpen, onOpenChange, onSave }: EquityReallocationProps) {
  const [tempPartners, setTempPartners] = useState(partners)
  const { mutate: batchUpdatePartners, isPending } = useBatchUpdatePartners({
    onSuccess: () => {
      onSave(tempPartners)
      onOpenChange(false)
    }
  })

  // Reset tempPartners when modal opens or partners change
  useEffect(() => {
    if (isOpen) {
      setTempPartners([...partners])
    }
  }, [isOpen, partners])

  const totalStake = tempPartners.reduce((sum, p) => sum + p.stakePercentage, 0)
  const isOverLimit = totalStake > 100
  const availableEquity = 100 - totalStake

  const updatePartnerStake = (partnerId: string, newStake: number) => {
    setTempPartners(prev => prev.map(p => 
      p.id === partnerId ? { ...p, stakePercentage: newStake } : p
    ))
  }

  const handleSave = () => {
    if (!isOverLimit) {
      // Find partners that have changed
      const changedPartners = tempPartners.filter(tempPartner => {
        const originalPartner = partners.find(p => p.id === tempPartner.id)
        return originalPartner && originalPartner.stakePercentage !== tempPartner.stakePercentage
      })

      if (changedPartners.length > 0) {
        // Prepare data for API call
        const updateData = changedPartners.map(partner => ({
          id: partner.id,
          data: {
            name: partner.name,
            email: partner.email || '',
            phone: partner.phone || '',
            investmentAmount: partner.investmentAmount,
            stakePercentage: partner.stakePercentage
          }
        }))
        
        batchUpdatePartners(updateData)
      } else {
        // No changes, just close
        onOpenChange(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-8 border-b border-border">
          <h2 className="text-2xl font-serif text-foreground">Equity Reallocation</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Adjust partner stakes to ensure total equity does not exceed 100%
          </p>
        </div>

        <div className="p-8">
          {/* Status Bar */}
          <div className={cn(
            "p-4 rounded-lg border mb-6",
            isOverLimit 
              ? "bg-destructive/10 border-destructive/30" 
              : "bg-primary/10 border-primary/30"
          )}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Total Equity</span>
              <span className={cn(
                "text-xl font-bold",
                isOverLimit ? "text-destructive" : "text-primary"
              )}>
                {totalStake.toFixed(1)}%
              </span>
            </div>
            {isOverLimit && (
              <p className="text-xs text-destructive mt-2">
                Exceeds 100% by {(totalStake - 100).toFixed(1)}%
              </p>
            )}
            {!isOverLimit && (
              <p className="text-xs text-primary mt-2">
                Available: {availableEquity.toFixed(1)}%
              </p>
            )}
          </div>

          {/* Partner Adjustments */}
          <div className="space-y-4">
            {tempPartners.map((partner) => (
              <div key={partner.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <Label className="text-sm font-bold">{partner.name}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={partner.stakePercentage}
                      onChange={(e) => updatePartnerStake(partner.id, parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${partner.stakePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-border flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isOverLimit || isPending}
            className={cn(
              isOverLimit && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
