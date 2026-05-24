'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { useCreateInvestor, useAddTransaction } from '@/hooks/api/investor.hooks';
import { useSites } from '@/hooks/api/site.hooks';
import {
  createInvestorSchema,
  type CreateInvestorInput,
} from '@/schemas/investor.schema';

import {
  formatINR,
  getAddInvestorDefaultValues,
  getTodayDateInputValue,
  toIsoDateTime,
} from './utils';

export function AddInvestorForm({ onClose }: { onClose: () => void }) {
  const { mutateAsync: createInvestorAsync, isPending: isCreatingInvestor } = useCreateInvestor();
  const { mutateAsync: addTransactionAsync, isPending: isAddingTransaction } = useAddTransaction();
  const { data: sitesData } = useSites();
  const sites = sitesData?.data?.sites ?? [];
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateInvestorInput>({
    resolver: zodResolver(createInvestorSchema),
    defaultValues: getAddInvestorDefaultValues(),
  });

  const investorType = watch('type');
  const fixedRateCadence = watch('fixedRateCadence') ?? 'YEARLY';
  const amountPaidNow = watch('amountPaidNow') || 0;
  const paymentMode = watch('paymentMode') || 'CASH';
  const isSubmitting = isCreatingInvestor || isAddingTransaction;

  const onSubmit = async (data: CreateInvestorInput) => {
    setSubmitError(null);

    try {
      const investorResult = await createInvestorAsync({
        ...data,
        siteId: data.type === 'EQUITY' ? data.siteId : undefined,
        fixedRateCadence: data.type === 'FIXED_RATE' ? data.fixedRateCadence : undefined,
        investmentAmount: undefined,
        amountPaidNow: undefined,
        paymentMode: undefined,
        referenceNumber: undefined,
        paymentDate: undefined,
      });

      const createdInvestorId = investorResult?.data?.investor?.id;

      if (!createdInvestorId) {
        throw new Error('Investor created response was invalid.');
      }

      const totalAmount = Number(data.investmentAmount ?? 0);
      const paidAmount = Number(data.amountPaidNow ?? 0);

      if (totalAmount > 0) {
        try {
          await addTransactionAsync({
            investorId: createdInvestorId,
            data: {
              amount: totalAmount,
              amountPaid: paidAmount,
              note: 'Initial investment entry during investor creation',
              paymentDate: paidAmount > 0 ? toIsoDateTime(data.paymentDate) : undefined,
            },
          });

          if (paidAmount > 0) {
            toast.success(`Investor added and transaction recorded. Paid now: ${formatINR(paidAmount)}`);
          } else {
            toast.success(`Investor added and transaction recorded with pending amount ${formatINR(totalAmount)}`);
          }
        } catch (error) {
          const txError = getApiErrorMessage(error, 'Initial transaction could not be recorded.');
          const message = `Investor created successfully, but transaction failed: ${txError}. Use Ledger & Actions to add it and avoid submitting this form again.`;
          setSubmitError(message);
          toast.error(message);
          return;
        }
      } else {
        toast.success('Investor added successfully.');
      }

      onClose();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to create investor.');
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-10 overflow-y-auto px-10 pb-10">
        <form id="add-investor-form" onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-8">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {(['EQUITY', 'FIXED_RATE'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      field.onChange(type);
                      setValue('fixedRateCadence', type === 'FIXED_RATE' ? 'YEARLY' : undefined);
                    }}
                    className={cn(
                      'border-2 p-3 text-[10px] font-bold uppercase tracking-widest transition-all',
                      field.value === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30',
                    )}
                  >
                    {type === 'EQUITY' ? 'Equity (Site)' : 'Fixed Rate (Company)'}
                  </button>
                ))}
              </div>
            )}
          />

          {submitError && (
            <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-[10px] font-semibold tracking-wide text-destructive">
              {submitError}
            </div>
          )}

          <div
            className={cn(
              'border p-4 text-[11px] leading-relaxed text-muted-foreground',
              investorType === 'EQUITY'
                ? 'border-primary/20 bg-primary/5'
                : 'border-amber-500/20 bg-amber-500/5',
            )}
          >
            {investorType === 'EQUITY'
              ? 'Equity investors are attached to a site. Create the investor here, then use Ledger & Actions later to add capital or record profit share without creating a duplicate record.'
              : 'Fixed-rate investors stay at company level. Create the investor once, then use Ledger & Actions to add capital, return principal, or record interest payments.'}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
              Full Name
            </Label>
            <Input
              placeholder="Investor name"
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
              placeholder="+91 XXXXX XXXXX"
              className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
              {...register('phone')}
            />
          </div>

          {investorType === 'EQUITY' && (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
                  Select Site
                </Label>
                <select
                  {...register('siteId')}
                  className="h-12 border-none bg-muted px-3 text-[10px] font-bold tracking-widest outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose site...</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                {errors.siteId && <p className="text-[10px] text-destructive">{errors.siteId.message}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
                  Equity Percentage (%)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    className="h-12 rounded-none border-none bg-muted pr-8 text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20"
                    {...register('equityPercentage', { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                {errors.equityPercentage && (
                  <p className="text-[10px] text-destructive">{errors.equityPercentage.message}</p>
                )}
              </div>
            </>
          )}

          {investorType === 'FIXED_RATE' && (
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
                    className="h-12 rounded-none border-none bg-muted pr-8 text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20"
                    {...register('fixedRate', { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
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
                      description: 'Rate is treated as annual interest.',
                    },
                    {
                      value: 'MONTHLY' as const,
                      label: 'Monthly',
                      description: 'Rate is treated as monthly interest.',
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

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
              Total Investment Amount (\u20B9)
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20"
              {...register('investmentAmount', { valueAsNumber: true })}
              placeholder="e.g. 500000"
            />
            {errors.investmentAmount && (
              <p className="text-[10px] text-destructive">{errors.investmentAmount.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
              Amount Paid Now (\u20B9)
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20"
              {...register('amountPaidNow', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.amountPaidNow && (
              <p className="text-[10px] text-destructive">{errors.amountPaidNow.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
              Payment Mode
            </Label>
            <select
              className="h-12 border-none bg-muted px-3 text-[10px] font-bold tracking-widest outline-none focus:ring-2 focus:ring-primary"
              {...register('paymentMode')}
            >
              <option value="">Select payment mode</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
            </select>
            {errors.paymentMode && (
              <p className="text-[10px] text-destructive">{errors.paymentMode.message}</p>
            )}
          </div>

          {amountPaidNow > 0 && paymentMode && paymentMode !== 'CASH' && (
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
                Reference Number
              </Label>
              <Input
                className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20"
                {...register('referenceNumber')}
                placeholder={
                  paymentMode === 'CHEQUE'
                    ? 'Cheque number'
                    : paymentMode === 'UPI'
                      ? 'UPI transaction ID'
                      : 'Bank transfer ref / UTR'
                }
              />
              {errors.referenceNumber && (
                <p className="text-[10px] text-destructive">{errors.referenceNumber.message}</p>
              )}
            </div>
          )}

          {amountPaidNow > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">
                Payment Date
              </Label>
              <Input
                type="date"
                className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20"
                {...register('paymentDate')}
                defaultValue={getTodayDateInputValue()}
              />
              {errors.paymentDate && (
                <p className="text-[10px] text-destructive">{errors.paymentDate.message}</p>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="flex items-center justify-between gap-6 border-t border-border p-10 pt-6">
        <SheetClose className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40 transition-all hover:opacity-100">
          Cancel
        </SheetClose>
        <Button
          form="add-investor-form"
          type="submit"
          disabled={isSubmitting}
          className="h-14 flex-1 gap-2 rounded-none bg-primary text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-primary/90"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>Add Investor</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </>
  );
}
