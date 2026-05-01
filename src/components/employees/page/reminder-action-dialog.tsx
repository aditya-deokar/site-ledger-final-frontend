import { AlertCircle, Bell, DollarSign, Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

import type { ReminderActionState } from './types';
import { formatCurrency } from './utils';

export function ReminderActionDialog({
  action,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  action: ReminderActionState | null;
  isPending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const isGenerate = action.kind === 'generate';

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <AlertDialogContent className="max-w-lg overflow-hidden rounded-none border-t-4 border-t-primary bg-background p-0">
        <AlertDialogHeader className="p-8 pb-4">
          <div className="flex flex-col items-center gap-5">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center',
                isGenerate ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600',
              )}
            >
              {isGenerate ? <Bell className="h-6 w-6" /> : <DollarSign className="h-6 w-6" />}
            </div>

            <div className="flex flex-col items-center gap-2">
              <AlertDialogTitle className="text-center text-2xl font-serif text-foreground">
                {isGenerate ? `Generate ${action.periodLabel} reminders?` : `Pay ${action.employeeName}?`}
              </AlertDialogTitle>
              <div
                className={cn(
                  'px-3 py-1 text-[9px] font-bold uppercase tracking-widest',
                  isGenerate ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600',
                )}
              >
                {isGenerate ? 'Missing reminders only' : 'Deducts from company fund'}
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 px-8 pb-6">
          <div className="space-y-3 border border-border bg-muted p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">
              {isGenerate ? 'Action Summary' : 'Payment Summary'}
            </p>

            {isGenerate ? (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-bold text-foreground">{action.periodLabel}</span>
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  This creates salary reminders for eligible employees in the selected month. Existing reminders stay untouched, so duplicates will not be created.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Employee</span>
                  <span className="font-bold text-foreground">{action.employeeName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">{formatCurrency(action.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-bold text-foreground">{action.periodLabel}</span>
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  This marks the reminder as paid and deducts the amount from your company&apos;s available fund.
                </p>
              </>
            )}
          </div>

          {Boolean(error) && (
            <div className="border border-red-500/30 bg-red-500/10 p-4 text-[10px] leading-relaxed text-red-600">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {getApiErrorMessage(
                    error,
                    isGenerate ? 'Unable to generate reminders.' : 'Unable to process salary payment.',
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex gap-4 p-8 pt-0 sm:space-x-4">
          <AlertDialogCancel className="h-12 flex-1 rounded-none border-border bg-transparent text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className={cn(
              'h-12 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest disabled:opacity-60',
              isGenerate
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'bg-emerald-600 text-white hover:bg-emerald-700',
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isGenerate ? (
              'Generate Reminders'
            ) : (
              'Confirm Payment'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
