"use client"

import { useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeletePartner } from "@/hooks/api/company.hooks"
import { AlertTriangle, Loader2 } from "lucide-react"

interface RemovePartnerDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  partnerId: string
  partnerName: string
  stakePercentage: number
  remainingCount: number
}

export function RemovePartnerDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  partnerId,
  partnerName,
  stakePercentage,
  remainingCount,
}: RemovePartnerDialogProps) {
  const { mutate: deletePartner, isPending, error, reset } = useDeletePartner({
    onSuccess: onConfirm,
  })

  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const errorMessage =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "error" in error && typeof error.error === "string"
        ? error.error
        : null

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-100 border-t-4 border-t-red-500 rounded-none p-0 overflow-hidden bg-background">
        <AlertDialogHeader className="p-8 pb-4">
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <AlertDialogTitle className="text-2xl font-serif text-center text-foreground">
                Remove {partnerName}?
              </AlertDialogTitle>
              <div className="px-3 py-1 bg-red-500/10 text-[9px] font-bold text-red-500 uppercase tracking-widest">
                This removes their equity stake from the company.
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="px-8 pb-8">
          <div className="bg-muted p-6 flex flex-col gap-4 border border-border">
            <div className="flex justify-between items-center text-[10px] tracking-widest font-bold text-muted-foreground uppercase">
              <span>Consequence Summary</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Equity Released:</span>
                <span className="font-bold text-foreground">{stakePercentage}%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Remaining Partners:</span>
                <span className="font-bold text-foreground">{String(remainingCount).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
          {errorMessage && (
            <div className="mt-4 border border-red-500/20 bg-red-500/10 p-4 text-[11px] text-red-600">
              <p className="font-bold">{errorMessage}</p>
              <p className="mt-1 text-red-600/80">
                Partners with posted ledger history stay locked so audit records remain intact.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="p-8 pt-0 flex gap-4 sm:space-x-4">
          <AlertDialogCancel className="flex-1 rounded-none border-border bg-transparent text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted h-14">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              reset()
              deletePartner(partnerId)
            }}
            disabled={isPending}
            className="flex-1 rounded-none bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest h-14 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
