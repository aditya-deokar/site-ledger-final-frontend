'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useDeleteInvestor } from '@/hooks/api/investor.hooks';
import type { Investor } from '@/schemas/investor.schema';

export function DeleteInvestorConfirm({
  investor,
  onClose,
}: {
  investor: Investor;
  onClose: () => void;
}) {
  const { mutate, isPending } = useDeleteInvestor({ onSuccess: onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm animate-in zoom-in-95 border border-border bg-background p-8 duration-200">
        <h3 className="mb-2 text-lg font-serif text-foreground">Remove Investor</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Remove <strong>{investor.name}</strong> and all their transaction records? Fund values
          will be recomputed.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => mutate(investor.id)}
            disabled={isPending}
            variant="destructive"
            className="h-11 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="h-11 rounded-none px-6 text-[10px] font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
