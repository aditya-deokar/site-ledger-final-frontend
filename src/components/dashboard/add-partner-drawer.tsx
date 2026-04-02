"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { partnerInputSchema, PartnerInput } from "@/schemas/company.schema"
import { useAddPartner } from "@/hooks/api/company.hooks"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddPartnerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingPartners?: { stakePercentage: number }[]
}

export function AddPartnerDrawer({ open, onOpenChange, existingPartners = [] }: AddPartnerDrawerProps) {
  const { mutate: addPartner, isPending, error } = useAddPartner({
    onSuccess: () => {
      onOpenChange(false)
      reset()
    },
  })

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PartnerInput>({
    resolver: zodResolver(partnerInputSchema),
    defaultValues: { name: '', email: '', phone: '', investmentAmount: 0, stakePercentage: 0 },
  })

  const watchedName = watch('name') || ''
  const watchedAmount = watch('investmentAmount') || 0
  const watchedStake = watch('stakePercentage') || 0

  // Calculate current total equity
  const currentTotalEquity = existingPartners.reduce((sum, p) => sum + p.stakePercentage, 0)
  const newTotalEquity = currentTotalEquity + watchedStake
  const maxAllowedStake = Math.max(0, 100 - currentTotalEquity)
  const wouldExceedLimit = newTotalEquity > 100

  const onSubmit = (data: PartnerInput) => {
    addPartner({ ...data, email: data.email || undefined })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] border-l border-border p-0 flex flex-col overflow-hidden bg-background">
        <SheetHeader className="p-10 pb-6 flex-row justify-start items-center space-y-0">
          <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Add Partner</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-10 pb-10 flex flex-col gap-10">
          {/* Equity Warning */}
          {wouldExceedLimit && (
            <div className="bg-destructive/10 border border-destructive/30 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">⚠ Equity Limit Exceeded</span>
              </div>
              <p className="text-[10px] text-destructive font-medium leading-relaxed">
                Current total equity: {currentTotalEquity}%. Adding this partner would make it {newTotalEquity}%. 
                Maximum allowed stake: {maxAllowedStake.toFixed(1)}%
              </p>
            </div>
          )}

          <form id="add-partner-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 mt-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3 tracking-wide">
                {typeof error === 'string' ? error : 'Failed to add partner'}
              </div>
            )}
            <div className="grid gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Full Name</Label>
              <Input placeholder="ENTER PARTNER NAME" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('name')} />
              {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Email Address</Label>
              <Input placeholder="EMAIL@COMPANY.IN" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('email')} />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Phone</Label>
                <Input placeholder="+91 XXXXX" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('phone')} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Investment</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                  <Input type="number" placeholder="0" className="h-12 bg-muted border-none rounded-none pl-8 text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('investmentAmount', { valueAsNumber: true })} />
                </div>
                {errors.investmentAmount && <p className="text-[10px] text-destructive">{errors.investmentAmount.message}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Equity Stake (%)</Label>
                <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">
                  Max: {maxAllowedStake.toFixed(1)}%
                </span>
              </div>
              <div className="relative">
                <Input 
                  type="number" 
                  step="0.01" 
                  max={maxAllowedStake}
                  placeholder="0.00" 
                  className={cn(
                    "h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground",
                    wouldExceedLimit && "border border-destructive/50 text-destructive"
                  )} 
                  {...register('stakePercentage', { 
                    valueAsNumber: true,
                    max: maxAllowedStake
                  })} 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
              {errors.stakePercentage && <p className="text-[10px] text-destructive">{errors.stakePercentage.message}</p>}
              {wouldExceedLimit && (
                <p className="text-[9px] text-destructive font-medium">
                  This would exceed 100% total equity
                </p>
              )}
            </div>
          </form>

          {/* Distribution Preview */}
          <div className="border border-primary/20 bg-primary/5 p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-primary" />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] tracking-[0.3em] font-bold text-primary uppercase">Live Distribution Preview</span>
              <div className="flex items-end justify-between mt-4">
                <div className="flex flex-col gap-1">
                  <h4 className="text-2xl font-serif text-foreground tracking-tight">{watchedName || '—'}</h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    ₹{Number(watchedAmount).toLocaleString('en-IN')} &middot; {watchedStake}%
                  </p>
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
            form="add-partner-form" 
            type="submit" 
            disabled={isPending || wouldExceedLimit} 
            className={cn(
              "h-14 flex-1 font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2 transition-all",
              wouldExceedLimit 
                ? "bg-muted text-muted-foreground cursor-not-allowed" 
                : "bg-primary text-black hover:bg-primary/90"
            )}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 
              wouldExceedLimit ? 
                <span>Reduce Stake to Continue</span> :
                <><span>Add Partner</span> <ArrowRight className="w-4 h-4" /></>
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
