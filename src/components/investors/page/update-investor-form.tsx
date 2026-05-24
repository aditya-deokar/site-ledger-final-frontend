'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose } from '@/components/ui/sheet';
import { getApiErrorMessage } from '@/lib/api-error';
import { getFixedRateInputLabel } from '@/lib/investors';
import { cn } from '@/lib/utils';
import { useUpdateInvestor } from '@/hooks/api/investor.hooks';
import {
  updateInvestorSchema,
  type Investor,
  type UpdateInvestorInput,
} from '@/schemas/investor.schema';

export function UpdateInvestorForm({
  investor,
  onClose,
}: {
  investor: Investor;
  onClose: () => void;
}) {
  const { mutateAsync: updateInvestorAsync, isPending } = useUpdateInvestor();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateInvestorInput>({
    resolver: zodResolver(updateInvestorSchema),
    defaultValues: {
      name: investor.name,
      phone: investor.phone ?? '',
      equityPercentage: investor.equityPercentage ?? 0,
      fixedRate: investor.fixedRate ?? 0,
      fixedRateCadence: investor.fixedRateCadence ?? 'YEARLY',
    },
  });
  const fixedRateCadence = watch('fixedRateCadence') ?? investor.fixedRateCadence ?? 'YEARLY';

  const onSubmit = async (data: UpdateInvestorInput) => {
    try {
      await updateInvestorAsync({ id: investor.id, data });
      toast.success('Investor updated successfully.');
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update investor.'));
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-10 overflow-y-auto px-10 pb-10">
        <form
          id="update-investor-form"
          onSubmit={handleSubmit(onSubmit)}
          className="mt-4 flex flex-col gap-8"
        >
          <div
            className={cn(
              'border p-4 text-[11px] leading-relaxed text-muted-foreground',
              investor.type === 'EQUITY'
                ? 'border-primary/20 bg-primary/5'
                : 'border-amber-500/20 bg-amber-500/5',
            )}
          >
            {investor.type === 'EQUITY'
              ? 'This investor stays attached to their current site. Use Ledger & Actions to add more capital or record profit share.'
              : 'Fixed-rate ledger actions remain available from Ledger & Actions. Updating the saved rate or cadence here will also update the interest calculator and investor labels.'}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
              Full Name
            </Label>
            <Input
              placeholder="Enter investor name"
              className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
              {...register('name')}
            />
            {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
              Contact Number
            </Label>
            <Input
              placeholder="+91"
              className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
              {...register('phone')}
            />
          </div>

          {investor.type === 'EQUITY' && (
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
                Equity Percentage
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="0"
                  className="h-12 rounded-none border-none bg-muted pr-8 text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
                  {...register('equityPercentage', { valueAsNumber: true })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
              </div>
              {errors.equityPercentage && (
                <p className="text-[10px] text-destructive">{errors.equityPercentage.message}</p>
              )}
            </div>
          )}

          {investor.type === 'FIXED_RATE' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
                  {getFixedRateInputLabel(fixedRateCadence)}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0"
                    className="h-12 rounded-none border-none bg-muted pr-8 text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
                    {...register('fixedRate', { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                </div>
                {errors.fixedRate && (
                  <p className="text-[10px] text-destructive">{errors.fixedRate.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
                  Interest Cadence
                </Label>
                <input type="hidden" {...register('fixedRateCadence')} />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: 'YEARLY' as const,
                      label: 'Yearly',
                      description: 'Use annual percentage for payouts.',
                    },
                    {
                      value: 'MONTHLY' as const,
                      label: 'Monthly',
                      description: 'Use monthly percentage for payouts.',
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue('fixedRateCadence', option.value, { shouldValidate: true })}
                      className={cn(
                        'border px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest transition-colors',
                        fixedRateCadence === option.value
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                          : 'border-border text-muted-foreground hover:border-amber-500/20 hover:bg-amber-500/5',
                      )}
                    >
                      {option.label}
                      <span className="mt-1 block text-[9px] normal-case tracking-normal text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.fixedRateCadence && (
                  <p className="text-[10px] text-destructive">{errors.fixedRateCadence.message}</p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="flex items-center justify-between gap-6 border-t border-border p-10 pt-6">
        <SheetClose className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40 transition-all hover:opacity-100">
          Cancel
        </SheetClose>
        <Button
          form="update-investor-form"
          type="submit"
          disabled={isPending}
          className="h-14 flex-1 gap-2 rounded-none bg-primary text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-primary/90"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>Update Investor</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </>
  );
}
