"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { partnerInputSchema, PartnerInput, Partner } from "@/schemas/company.schema"
import { useUpdatePartner } from "@/hooks/api/company.hooks"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Trash2, Loader2 } from "lucide-react"
import { RemovePartnerDialog } from "./remove-partner-dialog"
import { cn } from "@/lib/utils"

interface EditPartnerDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  partner: Partner
  totalPartners: number
  allPartners?: Partner[]
  isOverEquityLimit?: boolean
}

export function EditPartnerDrawer({ isOpen, onOpenChange, partner, totalPartners, allPartners = [], isOverEquityLimit = false }: EditPartnerDrawerProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const { mutate: updatePartner, isPending, error } = useUpdatePartner({
    onSuccess: () => onOpenChange(false),
  })

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<PartnerInput>({
    resolver: zodResolver(partnerInputSchema),
    defaultValues: {
      name: partner.name,
      email: partner.email ?? '',
      phone: partner.phone ?? '',
      investmentAmount: partner.investmentAmount,
      stakePercentage: partner.stakePercentage,
    },
  })

  useEffect(() => {
    if (partner) {
      reset({
        name: partner.name,
        email: partner.email ?? '',
        phone: partner.phone ?? '',
        investmentAmount: partner.investmentAmount,
        stakePercentage: partner.stakePercentage,
      })
    }
  }, [partner, reset])

  const watchedName = watch('name') || partner.name
  const watchedAmount = watch('investmentAmount') ?? partner.investmentAmount
  const watchedStake = watch('stakePercentage') ?? partner.stakePercentage

  // Calculate current total equity excluding this partner
  const otherPartnersTotal = allPartners
    .filter(p => p.id !== partner.id)
    .reduce((sum, p) => sum + p.stakePercentage, 0)
  
  const currentTotalWithChange = otherPartnersTotal + watchedStake
  const isCurrentOverLimit = currentTotalWithChange > 100
  const maxAllowedStake = Math.max(0, 100 - otherPartnersTotal)

  const onSubmit = (data: PartnerInput) => {
    updatePartner({ id: partner.id, data: { ...data, email: data.email || undefined } })
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-125 border-l border-border p-0 flex flex-col overflow-hidden bg-background">
          <SheetHeader className="p-10 pb-6 flex-row justify-between items-center space-y-0">
            <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Edit Partner</SheetTitle>
            <button onClick={() => setShowRemoveDialog(true)} className="p-2 text-muted-foreground/30 hover:text-red-500 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-10 pb-10 flex flex-col gap-10">
            {/* Equity Warning */}
            {(isOverEquityLimit || isCurrentOverLimit) && (
              <div className="bg-destructive/10 border border-destructive/30 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">⚠ Equity Limit Exceeded</span>
                </div>
                <p className="text-[10px] text-destructive font-medium leading-relaxed">
                  {isOverEquityLimit 
                    ? `Current total equity is over 100%. You must reduce this partner's stake to ${maxAllowedStake.toFixed(1)}% or less.`
                    : `This change would make total equity ${currentTotalWithChange}%. Maximum allowed for this partner: ${maxAllowedStake.toFixed(1)}%.`
                  }
                </p>
              </div>
            )}

            <form id="edit-partner-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 mt-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3 tracking-wide">
                  {typeof error === 'string' ? error : 'Failed to update partner'}
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Full Name</Label>
                <Input className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('name')} />
                {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Email Address</Label>
                <Input className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('email')} />
                {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Phone</Label>
                  <Input className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('phone')} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Investment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                    <Input type="number" className="h-12 bg-muted border-none rounded-none pl-8 text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('investmentAmount', { valueAsNumber: true })} />
                  </div>
                  {errors.investmentAmount && <p className="text-[10px] text-destructive">{errors.investmentAmount.message}</p>}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Equity Stake (%)</Label>
                  {isOverEquityLimit && (
                    <span className="text-[8px] text-destructive font-bold uppercase tracking-widest">
                      Max: {maxAllowedStake.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.01" 
                    max={isOverEquityLimit ? maxAllowedStake : undefined}
                    className={cn(
                      "h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20 text-foreground",
                      isCurrentOverLimit && "border border-destructive/50 text-destructive"
                    )} 
                    {...register('stakePercentage', { 
                      valueAsNumber: true,
                      max: isOverEquityLimit ? maxAllowedStake : undefined
                    })} 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                </div>
                {errors.stakePercentage && <p className="text-[10px] text-destructive">{errors.stakePercentage.message}</p>}
                
                {/* Quick Reduction Buttons */}
                {isOverEquityLimit && partner.stakePercentage > maxAllowedStake && (
                  <div className="flex flex-col gap-2 mt-3">
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">Quick Reduction</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = watchedStake
                          const reductionAmount = currentValue - maxAllowedStake
                          if (reductionAmount > 0) {
                            // Set to max allowed
                            setValue('stakePercentage', maxAllowedStake, { shouldValidate: true })
                          }
                        }}
                        className="text-[8px] font-bold text-destructive uppercase tracking-widest border border-destructive/30 px-2 py-1 hover:bg-destructive/20 transition-colors"
                      >
                        Reduce to Max ({maxAllowedStake.toFixed(1)}%)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = watchedStake
                          const reduction = Math.min(5, currentValue - maxAllowedStake)
                          if (reduction > 0) {
                            setValue('stakePercentage', currentValue - reduction, { shouldValidate: true })
                          }
                        }}
                        className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest border border-border px-2 py-1 hover:bg-muted transition-colors"
                      >
                        -5%
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Distribution Preview */}
            <div className={cn(
              "border p-8 flex flex-col gap-6 relative overflow-hidden",
              isCurrentOverLimit 
                ? "border-destructive/30 bg-destructive/5" 
                : "border-primary/20 bg-primary/5"
            )}>
              <div className={cn(
                "absolute top-0 left-0 bottom-0 w-1",
                isCurrentOverLimit ? "bg-destructive" : "bg-primary"
              )} />
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "text-[9px] tracking-[0.3em] font-bold uppercase",
                  isCurrentOverLimit ? "text-destructive" : "text-primary"
                )}>
                  {isCurrentOverLimit ? "⚠ Over Limit" : "Live Distribution Preview"}
                </span>
                <div className="flex items-end justify-between mt-4">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-2xl font-serif text-foreground tracking-tight">{watchedName}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      ₹{Number(watchedAmount).toLocaleString('en-IN')} &middot; {watchedStake}%
                    </p>
                    {isCurrentOverLimit && (
                      <p className="text-[9px] text-destructive font-medium mt-1">
                        Total would be {currentTotalWithChange}% (exceeds 100%)
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Equity</div>
                    <div className={cn(
                      "text-xl font-serif font-bold",
                      isCurrentOverLimit ? "text-destructive" : "text-foreground"
                    )}>
                      {currentTotalWithChange}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 pt-6 border-t border-border flex items-center justify-between gap-6">
            <SheetClose className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all px-4 py-2 text-foreground">
              Cancel
            </SheetClose>
            <Button 
              form="edit-partner-form" 
              type="submit" 
              disabled={isPending || isCurrentOverLimit} 
              className={cn(
                "h-14 flex-1 font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2 transition-all",
                isCurrentOverLimit 
                  ? "bg-muted text-muted-foreground cursor-not-allowed" 
                  : "bg-primary text-black hover:bg-primary/90"
              )}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                isCurrentOverLimit ? 
                  <span>Reduce Stake to Continue</span> :
                  <><span>Save Changes</span> <ArrowRight className="w-4 h-4" /></>
              }
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <RemovePartnerDialog
        isOpen={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        onConfirm={() => {
          setShowRemoveDialog(false)
          onOpenChange(false)
        }}
        partnerId={partner.id}
        partnerName={partner.name}
        stakePercentage={partner.stakePercentage}
        remainingCount={totalPartners - 1}
      />
    </>
  )
}
