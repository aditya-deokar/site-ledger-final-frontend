'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCompany, useUpdateCompany, useWithdrawFund } from '@/hooks/api/company.hooks';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { AddPartnerDrawer } from '@/components/dashboard/add-partner-drawer';
import { EditPartnerDrawer } from '@/components/dashboard/edit-partner-drawer';
import { EquityChart } from '@/components/dashboard/equity-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Mail, Phone, ArrowUpRight, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Partner } from '@/schemas/company.schema';
import { Skeleton } from '@/components/ui/skeleton';

const AVATAR_COLORS = [
  'bg-teal-600', 'bg-blue-600', 'bg-amber-500',
  'bg-rose-600', 'bg-violet-600', 'bg-emerald-600',
];

function getAvatarColor(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function formatINR(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}

// ── Edit Company Dialog ────────────────────────────
const editCompanySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
});

function EditCompanyDialog({ company, open, onClose }: { company: { name: string; address?: string | null }; open: boolean; onClose: () => void }) {
  const { mutate, isPending } = useUpdateCompany();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(editCompanySchema),
    defaultValues: { name: company.name, address: company.address || '' },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Edit Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data, { onSuccess: onClose }))} className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Company Name</Label>
            <Input className="h-11 bg-muted border-none rounded-none text-sm" {...register('name')} />
            {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Address</Label>
            <Input className="h-11 bg-muted border-none rounded-none text-sm" {...register('address')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]">Cancel</Button>
            <Button type="submit" disabled={isPending} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Withdraw Fund Dialog ───────────────────────────
const withdrawSchema = z.object({
  amount: z.coerce.number().positive('Amount is required'),
  note: z.string().optional(),
});

function WithdrawDialog({ availableFund, open, onClose }: { availableFund: number; open: boolean; onClose: () => void }) {
  const { mutate, isPending, error } = useWithdrawFund({ onSuccess: onClose });
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(withdrawSchema),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Withdraw from Company</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pull money from company available fund (owner payout, operational expenses, etc.)
        </p>
        <div className="flex justify-between items-center py-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Available Fund</span>
          <span className="text-xl font-sans font-bold text-primary tabular-nums">{formatINR(availableFund)}</span>
        </div>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 text-[10px] font-bold text-red-500">
              {typeof error === 'object' && 'error' in (error as any) ? (error as any).error : 'Request failed'}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" min={0} className="h-11 pl-8 bg-muted border-none rounded-none text-sm" {...register('amount')} />
            </div>
            {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
            <button
              type="button"
              onClick={() => setValue('amount', availableFund)}
              className="text-[10px] font-bold text-primary self-end hover:underline"
            >
              Withdraw all ({formatINR(availableFund)})
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Note (optional)</Label>
            <Input className="h-11 bg-muted border-none rounded-none text-sm" placeholder="e.g. Owner payout Q1" {...register('note')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]">Cancel</Button>
            <Button type="submit" disabled={isPending} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px] bg-red-500 hover:bg-red-600">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompanySkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-border pb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-64 md:h-12 md:w-96" />
            <Skeleton className="h-3 w-32 mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-24 sm:h-10 sm:w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="border border-border divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 flex items-center gap-4">
                <Skeleton className="h-10 w-10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function CompanyPage() {
  const { data: companyData, isLoading } = useCompany();
  const [addOpen, setAddOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [localPartners, setLocalPartners] = useState<Partner[]>([]);

  // Sync local partners with API data
  useEffect(() => {
    if (companyData?.data?.partners) {
      setLocalPartners(companyData.data.partners);
    }
  }, [companyData?.data?.partners]);

  // Memoize data processing
  const companyInfo = useMemo(() => {
    if (!companyData?.data?.company) return null;
    const { company, partners: apiPartners, partner_fund, investor_fund, total_fund, available_fund } = companyData.data;
    
    // Use local partners if they exist, otherwise use API partners
    const currentPartners = localPartners.length > 0 ? localPartners : apiPartners;
    
    const estDateString = new Date(company.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).toUpperCase();

    const stats = [
      { label: 'Total Fund', value: total_fund },
      { label: 'Partner Fund', value: partner_fund },
      { label: 'Investor Fund', value: investor_fund },
      { label: 'Available Fund', value: available_fund, highlight: true },
    ];

    const totalStake = currentPartners.reduce((s: number, p: Partner) => s + p.stakePercentage, 0);

    return { 
      company, 
      partners: currentPartners, 
      partner_fund, 
      investor_fund, 
      total_fund, 
      available_fund, 
      estDateString, 
      stats,
      totalStake
    };
  }, [companyData, localPartners]);

  const handlePartnerClick = useCallback((partner: Partner) => {
    setEditPartner(partner);
  }, []);

  const handlePartnersUpdate = useCallback((updatedPartners: Partner[]) => {
    setLocalPartners(updatedPartners);
  }, []);

  if (isLoading) {
    return (
      <DashboardShell>
        <CompanySkeleton />
      </DashboardShell>
    );
  }

  if (!companyInfo) return null;

  const { company, partners, partner_fund, estDateString, stats, totalStake, available_fund } = companyInfo;

  return (
    <DashboardShell>
      <div className="space-y-10 animate-in fade-in duration-700">

        {/* Company Header */}
        <div className="flex flex-col gap-6 border-b border-border pb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-muted-foreground/50">
                Your Company
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-foreground tracking-tight break-words">{company.name}</h1>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/40 mt-1">
                Est. {estDateString}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Button
                variant="outline"
                onClick={() => setWithdrawOpen(true)}
                className="h-9 rounded-none border-red-500/30 text-red-500 text-[9px] font-bold tracking-widest uppercase hover:bg-red-50/5 gap-1.5 flex-1 sm:flex-initial"
              >
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditCompanyOpen(true)}
                className="h-9 rounded-none border-border text-[9px] font-bold tracking-widest uppercase hover:bg-muted/50 gap-1.5 flex-1 sm:flex-initial"
              >
                <Pencil className="w-4 h-4" /> Edit Company
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map(({ label, value, highlight }) => (
              <div key={label} className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50 truncate">{label}</span>
                <span className={cn('text-2xl sm:text-3xl font-sans font-bold tracking-tight truncate', highlight ? 'text-primary' : 'text-foreground')}>
                  {formatINR(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Partners + Equity Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Partners list */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-serif text-foreground tracking-tight">Partners</h2>
                <span className="px-2 py-0.5 bg-muted text-[9px] font-bold text-muted-foreground tracking-widest uppercase">
                  {String(partners.length).padStart(2, '0')}
                </span>
              </div>
              <Button
                onClick={() => setAddOpen(true)}
                className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-6"
              >
                <Plus className="w-4 h-4" /> Add Partner
              </Button>
            </div>

            <div className="flex flex-col divide-y divide-border border border-border">
              {partners.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground italic">
                  No partners added yet.
                </div>
              ) : (
                <>
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      onClick={() => handlePartnerClick(partner)}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 px-4 sm:px-6 py-5 hover:bg-muted/30 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                          'w-10 h-10 flex items-center justify-center text-white text-[11px] font-bold tracking-widest shrink-0',
                          getAvatarColor(partner.name)
                        )}>
                          {getInitials(partner.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-base tracking-tight text-foreground truncate">{partner.name}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
                            {partner.email && (
                              <span className="flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-none">
                                <Mail className="w-3 h-3 shrink-0" /> {partner.email}
                              </span>
                            )}
                            {partner.phone && (
                              <span className="flex items-center gap-1.5 shrink-0">
                                <Phone className="w-3 h-3" /> {partner.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 shrink-0 pl-14 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Investment</p>
                          <p className="font-sans text-base sm:text-lg font-bold tracking-tight">{formatINR(partner.investmentAmount)}</p>
                        </div>
                        <div className="text-right min-w-15">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Stake</p>
                          <p className="font-sans text-base sm:text-lg font-bold tracking-tight">{partner.stakePercentage}%</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Total row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 px-4 sm:px-6 py-4 bg-muted/20">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Total</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 shrink-0 pl-0 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <p className="font-sans text-base sm:text-lg tracking-tight text-primary font-bold">{formatINR(partner_fund)}</p>
                      </div>
                      <div className="text-right min-w-15">
                        <p className="font-sans text-base sm:text-lg tracking-tight text-primary font-bold">
                          {totalStake}%
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Equity Chart */}
          <div className="lg:col-span-1">
            <EquityChart partners={partners} onPartnersUpdate={handlePartnersUpdate} />
          </div>
        </div>
      </div>

      <AddPartnerDrawer open={addOpen} onOpenChange={setAddOpen} />

      {editPartner && (
        <EditPartnerDrawer
          isOpen={!!editPartner}
          onOpenChange={(open) => { if (!open) setEditPartner(null); }}
          partner={editPartner}
          totalPartners={partners.length}
        />
      )}

      <EditCompanyDialog company={company} open={editCompanyOpen} onClose={() => setEditCompanyOpen(false)} />
      <WithdrawDialog availableFund={available_fund} open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </DashboardShell>
  );
}
