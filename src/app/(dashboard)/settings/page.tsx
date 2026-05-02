'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyLogoUploader } from '@/components/dashboard/company-logo-uploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { updateCompanySchema, UpdateCompanyInput } from '@/schemas/company.schema';
import { useCompany, useUpdateCompany } from '@/hooks/api/company.hooks';

type SettingsTab = 'profile' | 'receipt';

const defaultReceiptSettings = {
  showCompanyLogo: true,
  showGstin: true,
  showPan: true,
  showReraNumber: true,
  showCorporateAddress: true,
  showSupportContact: true,
};

export default function SettingsPage() {
  const { data: companyData, isLoading } = useCompany();
  const { mutate: updateCompany, isPending } = useUpdateCompany();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);

  const company = companyData?.data?.company;
  const receiptSettings = useMemo(
    () => ({ ...defaultReceiptSettings, ...(company?.receiptSettings ?? {}) }),
    [company?.receiptSettings],
  );

  const { register, handleSubmit, reset, setValue, watch } = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      name: '',
      tradeName: '',
      address: '',
      phone: '',
      gstin: '',
      pan: '',
      tan: '',
      cin: '',
      reraNumber: '',
      msmeUdyamNumber: '',
      epfNumber: '',
      esicNumber: '',
      bocwNumber: '',
      logo: '',
      receiptSettings: defaultReceiptSettings,
    },
  });

  useEffect(() => {
    if (!company) return;
    reset({
      name: company.name ?? '',
      tradeName: company.tradeName ?? '',
      address: company.address ?? '',
      phone: company.phone ?? '',
      gstin: company.gstin ?? '',
      pan: company.pan ?? '',
      tan: company.tan ?? '',
      cin: company.cin ?? '',
      reraNumber: company.reraNumber ?? '',
      msmeUdyamNumber: company.msmeUdyamNumber ?? '',
      epfNumber: company.epfNumber ?? '',
      esicNumber: company.esicNumber ?? '',
      bocwNumber: company.bocwNumber ?? '',
      logo: company.logo ?? '',
      receiptSettings,
    });
  }, [company, reset, receiptSettings]);

  const watchedLogo = watch('logo');
  const watchedReceipt = watch('receiptSettings') ?? defaultReceiptSettings;

  const onSubmit = (payload: UpdateCompanyInput) => {
    updateCompany(payload, {
      onSuccess: () => toast.success('Settings updated'),
      onError: () => toast.error('Failed to update settings'),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/20">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-foreground">Settings</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">Company profile and receipt preferences</p>
        </div>
      </div>

      <Dialog open={logoPreviewOpen} onOpenChange={setLogoPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-none">
          <DialogHeader>
            <DialogTitle>Company Logo</DialogTitle>
          </DialogHeader>
          {watch('logo') ? (
            <div className="relative mx-auto h-[65vh] w-full overflow-hidden border border-border bg-muted/10">
              <Image src={watch('logo') as string} alt="Company logo full preview" fill className="object-contain" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border border-border bg-muted/10 p-2 h-fit">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest ${tab === 'profile' ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('receipt')}
            className={`mt-1 w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest ${tab === 'receipt' ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Receipt Settings
          </button>
        </aside>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {tab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border border-border bg-muted/10 p-3">
                <button
                  type="button"
                  onClick={() => setLogoPreviewOpen(true)}
                  className="relative h-16 w-16 shrink-0 overflow-hidden border border-border bg-background"
                  title="View logo"
                >
                  {watch('logo') ? (
                    <Image src={watch('logo') as string} alt="Company logo" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Settings2 className="h-6 w-6" />
                    </div>
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">Company Profile</p>
                  <p className="truncate text-xl font-serif text-foreground">{watch('name') || company?.name || 'Company Name'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Legal Company Name"><Input {...register('name')} className="h-10 rounded-none" /></Field>
            <Field label="Trade Name (DBA)"><Input {...register('tradeName')} className="h-10 rounded-none" /></Field>
            <Field label="Corporate Address"><Input {...register('address')} className="h-10 rounded-none" /></Field>
            <Field label="Support Contact"><Input {...register('phone')} className="h-10 rounded-none" /></Field>
            <Field label="GSTIN"><Input {...register('gstin')} className="h-10 rounded-none" /></Field>
            <Field label="PAN"><Input {...register('pan')} className="h-10 rounded-none" /></Field>
            <Field label="TAN"><Input {...register('tan')} className="h-10 rounded-none" /></Field>
            <Field label="CIN"><Input {...register('cin')} className="h-10 rounded-none" /></Field>
            <Field label="RERA Number"><Input {...register('reraNumber')} className="h-10 rounded-none" /></Field>
            <Field label="MSME / Udyam Number"><Input {...register('msmeUdyamNumber')} className="h-10 rounded-none" /></Field>
            <Field label="EPF Number"><Input {...register('epfNumber')} className="h-10 rounded-none" /></Field>
            <Field label="ESIC Number"><Input {...register('esicNumber')} className="h-10 rounded-none" /></Field>
            <Field label="BOCW Number"><Input {...register('bocwNumber')} className="h-10 rounded-none" /></Field>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company Logo</Label>
              <CompanyLogoUploader value={watchedLogo || null} onChange={(url) => setValue('logo', url)} />
            </div>
              </div>
            </div>
          )}

          {tab === 'receipt' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-3 border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Receipt print options</p>
              <Toggle label="Show Company Logo" checked={!!watchedReceipt.showCompanyLogo} onChange={(v) => setValue('receiptSettings.showCompanyLogo', v)} />
              <Toggle label="Show GSTIN" checked={!!watchedReceipt.showGstin} onChange={(v) => setValue('receiptSettings.showGstin', v)} />
              <Toggle label="Show PAN" checked={!!watchedReceipt.showPan} onChange={(v) => setValue('receiptSettings.showPan', v)} />
              <Toggle label="Show RERA Number" checked={!!watchedReceipt.showReraNumber} onChange={(v) => setValue('receiptSettings.showReraNumber', v)} />
              <Toggle label="Show Corporate Address" checked={!!watchedReceipt.showCorporateAddress} onChange={(v) => setValue('receiptSettings.showCorporateAddress', v)} />
              <Toggle label="Show Support Contact" checked={!!watchedReceipt.showSupportContact} onChange={(v) => setValue('receiptSettings.showSupportContact', v)} />
            </div>
            <div className="border border-border bg-background p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Live Preview</p>
              <div className="border border-border bg-muted/10 p-4">
                <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <p className="text-lg font-serif text-foreground">{watch('name') || company?.name || 'Company Name'}</p>
                    {watchedReceipt.showCorporateAddress && (watch('address') || company?.address) && (
                      <p className="text-xs text-muted-foreground">{watch('address') || company?.address}</p>
                    )}
                    {watchedReceipt.showSupportContact && (watch('phone') || company?.phone) && (
                      <p className="text-xs text-muted-foreground">Support: {watch('phone') || company?.phone}</p>
                    )}
                  </div>
                  {watchedReceipt.showCompanyLogo && watchedLogo && (
                    <div className="relative h-12 w-12 overflow-hidden border border-border bg-background">
                      <Image src={watchedLogo} alt="Logo preview" fill className="object-contain" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1 pt-3 text-xs text-muted-foreground">
                  {watchedReceipt.showGstin && (watch('gstin') || company?.gstin) && <p>GSTIN: {watch('gstin') || company?.gstin}</p>}
                  {watchedReceipt.showPan && (watch('pan') || company?.pan) && <p>PAN: {watch('pan') || company?.pan}</p>}
                  {watchedReceipt.showReraNumber && (watch('reraNumber') || company?.reraNumber) && <p>RERA: {watch('reraNumber') || company?.reraNumber}</p>}
                </div>
                <div className="mt-4 border-t border-border pt-3 text-xs">
                  <p className="text-foreground">Receipt #DUMMY-001</p>
                  <p className="text-muted-foreground">Customer payment received for booking</p>
                  <p className="font-bold text-foreground mt-2">Amount: ₹50,000</p>
                </div>
              </div>
            </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} className="h-10 rounded-none text-[10px] font-bold uppercase tracking-widest">
              <Save className="mr-2 h-4 w-4" />
              {isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between border border-border bg-muted/10 px-3 py-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
