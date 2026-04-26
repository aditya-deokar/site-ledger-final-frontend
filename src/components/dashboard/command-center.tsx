'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  Building,
  Hammer,
  IndianRupee,
  Loader2,
  Pencil,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useCreateSite, useToggleSite, useDeleteSite, useBookFlat, useFloors, useWings, useCreateFloor, useCreateFlat, useUpdateFlatDetails, useAddExpense, useSites, useAddFund, useWithdrawFund as useWithdrawSiteFund, useExpenses } from '@/hooks/api/site.hooks';
import { useAddPartner, useUpdatePartner, useDeletePartner, useUpdateCompany, useWithdrawFund as useWithdrawCompanyFund, useCompany } from '@/hooks/api/company.hooks';
import { useCreateInvestor, useUpdateInvestor, useDeleteInvestor, useInvestors, useAddTransaction } from '@/hooks/api/investor.hooks';
import { useCreateVendor, useUpdateVendor, useDeleteVendor, useVendors } from '@/hooks/api/vendor.hooks';
import { useAllCustomers, useSiteCustomers, useUpdateCustomer, useRecordCustomerPayment, useCancelDeal } from '@/hooks/api/customer.hooks';
import { useCreateEmployee, useDeleteEmployee, useEmployees, usePaySalary, useUpdateEmployee } from '@/hooks/api/employee.hooks';
import { useMarkAttendance } from '@/hooks/api/attendance.hooks';
import { createSiteSchema, CreateSiteInput, bookFlatSchema, BookFlatInput, BookFlatAgreementLineInput, Floor, Flat, createExpenseSchema, CreateExpenseInput } from '@/schemas/site.schema';
import { partnerInputSchema, PartnerInput } from '@/schemas/company.schema';
import { createInvestorSchema, CreateInvestorInput, updateInvestorSchema, UpdateInvestorInput } from '@/schemas/investor.schema';
import { createVendorSchema, CreateVendorInput, updateVendorSchema, UpdateVendorInput } from '@/schemas/vendor.schema';
import { updateCustomerSchema, UpdateCustomerInput, recordPaymentSchema, RecordPaymentInput, cancelDealSchema } from '@/schemas/customer.schema';
import { createEmployeeSchema, CreateEmployeeInput, PaySalaryInput, paySalarySchema, UpdateEmployeeInput } from '@/schemas/employee.schema';
import type { AttendanceStatus } from '@/schemas/attendance.schema';
import { Field, FormError, FormShell, KeyToggle, SearchableSelect } from '@/components/dashboard/navigator/form-primitives';
import {
  ACTIONS_NEEDING_SELECTOR,
  ACTIONS_NEEDING_SUB_SELECTOR,
  ACTIONS_USING_SITE_SELECTOR,
  BOOKING_AGREEMENT_LINE_TYPES,
  CATEGORIES,
  COMMON_UNIT_TYPES,
  COMMON_VENDOR_CATEGORIES,
  INPUT_CLS,
  LABEL_CLS,
  UNIT_TYPE_PICK_OPTIONS,
} from '@/components/dashboard/navigator/command-center/constants';
import { ContextInsightPanel } from '@/components/dashboard/navigator/command-center/context-insight-panel';
import { EntitySelector } from '@/components/dashboard/navigator/command-center/entity-selector';
import { KeyList } from '@/components/dashboard/navigator/command-center/key-list';
import { SiteQuickPickerSelector } from '@/components/dashboard/navigator/command-center/site-quick-picker-selector';
import type { Phase } from '@/components/dashboard/navigator/command-center/types';
import {
  employeeStatusLabel,
  formatINR,
  getShortcutNumber,
  getTodayDateInputValue,
  getTodayDateTimeInputValue,
  parseOptionalNumber,
  parseOptionalPositiveInteger,
  toDateInputValue,
  formatShortDate,
  toIsoDate,
  toIsoDateTime,
} from '@/components/dashboard/navigator/command-center/utils';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { groupCustomerDeals } from '@/lib/customer-grouping';
import type { CustomerWithSite } from '@/schemas/customer.schema';

function buildVendorTypeOptions(vendors: Array<{ type?: string | null }>) {
  const types = new Map<string, string>();
  COMMON_VENDOR_CATEGORIES.forEach((type) => types.set(type.toLowerCase(), type));
  vendors.forEach((vendor) => {
    const type = vendor.type?.trim();
    if (type) types.set(type.toLowerCase(), type);
  });

  return Array.from(types.values())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((type) => ({ value: type, label: type }));
}

function CreateSiteForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useCreateSite({ onSuccess: () => { reset(); toast.success('Site created'); onSuccess(); } });
  const { register, control, handleSubmit, watch, reset, setValue, setFocus, formState: { errors } } = useForm<CreateSiteInput>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: {
      name: '',
      address: '',
      projectType: 'NEW_CONSTRUCTION',
      totalFloors: undefined,
      hasMultipleWings: false,
      includeGroundFloor: false,
      wings: [],
    },
  });
  const projectType = watch('projectType') || 'NEW_CONSTRUCTION';
  const hasMultipleWings = watch('hasMultipleWings') || false;
  const {
    fields: wingFields,
    append: appendWing,
    remove: removeWing,
  } = useFieldArray({
    control,
    name: 'wings',
  });

  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  useEffect(() => {
    if (!hasMultipleWings && wingFields.length > 0) {
      setValue('wings', [], { shouldValidate: true });
    }
  }, [hasMultipleWings, setValue, wingFields.length]);

  const onSubmit = (data: CreateSiteInput) => {
    const payload: CreateSiteInput = {
      ...data,
      totalFloors: hasMultipleWings ? undefined : (data.totalFloors || undefined),
      hasMultipleWings: !!data.hasMultipleWings,
      includeGroundFloor: data.includeGroundFloor,
      wings: data.hasMultipleWings
        ? data.wings?.map((wing) => ({
          name: wing.name.trim(),
          floorCount: wing.floorCount,
          includeGroundFloor: !!wing.includeGroundFloor,
        }))
        : undefined,
    };

    mutate(payload);
  };

  return (
    <FormShell title="Create New Site" onBack={onBack} isPending={isPending} submitLabel="Create Site" formId="create-site-form">
      <form id="create-site-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to create site')} />}
        <Field label="Project Name" error={errors.name?.message}>
          <input placeholder="e.g. Sai Residency Phase 2" className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Site Address" error={errors.address?.message}>
          <textarea placeholder="Plot 45, Sector 8, Tech-City" className={cn(INPUT_CLS, 'min-h-16 resize-none py-3')} {...register('address')} />
        </Field>
        <input type="hidden" {...register('projectType')} />
        <Field label="Project Type">
          <KeyToggle
            options={['NEW_CONSTRUCTION', 'REDEVELOPMENT'] as const as string[]}
            value={projectType}
            onChange={(v) => setValue('projectType', v as 'NEW_CONSTRUCTION' | 'REDEVELOPMENT', { shouldValidate: true })}
            renderOption={(t, selected) => (
              <div className={cn('flex items-center gap-3 border px-4 py-3 transition-all',
                selected ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-muted/30')}>
                {t === 'NEW_CONSTRUCTION' ? <Building className="h-4 w-4" /> : <Hammer className="h-4 w-4" />}
                <span className="text-[10px] font-bold uppercase tracking-widest">{t === 'NEW_CONSTRUCTION' ? 'New Build' : 'Redev'}</span>
                {selected && <span className="ml-auto text-[9px] text-primary">*</span>}
              </div>
            )}
          />
          <p className="text-[9px] text-muted-foreground/40 mt-1">Use Left/Right Arrow keys to switch</p>
        </Field>
        <input type="hidden" {...register('hasMultipleWings')} />
        <Field label="Multiple Wings">
          <KeyToggle
            options={['NO', 'YES']}
            value={hasMultipleWings ? 'YES' : 'NO'}
            onChange={(value) => setValue('hasMultipleWings', value === 'YES', { shouldValidate: true })}
            renderOption={(option, selected) => (
              <div className={cn(
                'border px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all text-center',
                selected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/30',
              )}>
                {option === 'YES' ? 'Yes, Use Wings' : 'No, Single Block'}
              </div>
            )}
          />
          <p className="text-[9px] text-muted-foreground/40 mt-1">When enabled, add wing-wise floor counts below.</p>
        </Field>
        {hasMultipleWings && (
          <Field label="Wings" error={errors.wings?.message as string | undefined}>
            <div className="flex flex-col gap-3">
              {wingFields.length === 0 && (
                <p className="text-[10px] text-muted-foreground/60">
                  Add at least one wing.
                </p>
              )}
              {wingFields.map((wingField, index) => (
                <div key={wingField.id} className="border border-border bg-muted/20 p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_10rem_auto] gap-3 items-end">
                    <Field label={`Wing ${index + 1} Name`} error={errors.wings?.[index]?.name?.message}>
                      <input
                        placeholder={`e.g. Wing ${String.fromCharCode(65 + index)}`}
                        className={INPUT_CLS}
                        {...register(`wings.${index}.name` as const)}
                      />
                    </Field>
                    <Field label="Floor Count" error={errors.wings?.[index]?.floorCount?.message}>
                      <input
                        type="number"
                        min={1}
                        placeholder="e.g. 10"
                        className={INPUT_CLS}
                        {...register(`wings.${index}.floorCount` as const, { setValueAs: parseOptionalPositiveInteger })}
                      />
                    </Field>
                    <button
                      type="button"
                      data-navbtn="true"
                      data-wing-remove={index}
                      onClick={() => {
                        removeWing(index);
                        setTimeout(() => {
                          if (index > 0) {
                            const prevRemoveBtn = document.querySelector(`[data-wing-remove="${index - 1}"]`) as HTMLButtonElement;
                            prevRemoveBtn?.focus();
                          } else {
                            const addWingBtn = document.querySelector('[data-add-wing-btn]') as HTMLButtonElement;
                            addWingBtn?.focus();
                          }
                        }, 50);
                      }}
                      className="h-12 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3 border border-border/50 bg-background/50 px-3 py-2">
                    <input
                      type="checkbox"
                      id={`wing-${index}-ground`}
                      className="h-4 w-4 rounded border-border"
                      {...register(`wings.${index}.includeGroundFloor` as const)}
                    />
                    <label htmlFor={`wing-${index}-ground`} className="text-[10px] font-bold uppercase tracking-widest text-foreground/60 cursor-pointer">
                      Include Ground Floor for this wing
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                data-navbtn="true"
                data-add-wing-btn
                onClick={() => appendWing({ name: '', floorCount: 1, includeGroundFloor: false })}
                className="h-11 border border-border px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                Add Wing
              </button>
            </div>
          </Field>
        )}
        {!hasMultipleWings && (
          <>
            <Field label="Number of Floors" error={errors.totalFloors?.message}>
              <input
                type="number"
                min={1}
                placeholder="e.g. 5"
                className={INPUT_CLS}
                {...register('totalFloors', { setValueAs: parseOptionalPositiveInteger })}
              />
              <p className="text-[9px] text-muted-foreground/40 mt-1">Enter the number of floors for this single block site.</p>
            </Field>
            <Field label="Ground Floor">
              <div className="flex items-center gap-3 border border-border bg-muted/20 px-4 py-3">
                <input
                  type="checkbox"
                  id="includeGroundFloor"
                  className="h-4 w-4 rounded border-border"
                  {...register('includeGroundFloor')}
                />
                <label htmlFor="includeGroundFloor" className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 cursor-pointer">
                  Include Ground Floor
                </label>
              </div>
              <p className="text-[9px] text-muted-foreground/40 mt-1">Check this if the site includes a ground floor.</p>
            </Field>
          </>
        )}
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Select floor + flat details directly while booking units.</p>
      </form>
    </FormShell>
  );
}

// â”€â”€â”€ FORM: Add Partner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AddSiteExpenseForm({ site, onSuccess, onBack, onVendorChange }: { site: any; onSuccess: () => void; onBack: () => void; onVendorChange: (id: string | null) => void }) {
  const { data: vendorsData } = useVendors();
  const vendors = vendorsData?.data?.vendors ?? [];
  const vendorTypeOptions = useMemo(() => buildVendorTypeOptions(vendors), [vendors]);
  const { mutateAsync: createVendorQuick, isPending: isCreatingVendorQuick } = useCreateVendor();
  const [showQuickVendorCreate, setShowQuickVendorCreate] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickVendorCategory, setQuickVendorCategory] = useState<string>(COMMON_VENDOR_CATEGORIES[0]);
  const { mutate, isPending, error } = useAddExpense(site.id, {
    onSuccess: () => {
      reset();
      toast.success('Expense added');
      onSuccess();
    }
  });
  const { register, handleSubmit, watch, reset, setValue, setFocus, formState: { errors } } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      type: 'GENERAL',
      reason: '',
      vendorId: '',
      description: '',
      amount: 0,
      amountPaid: 0,
      paymentDate: getTodayDateTimeInputValue(),
      paymentMode: 'CASH',
      referenceNumber: '',
    },
  });
  const expenseType = watch('type') || 'GENERAL';
  const selectedVendorId = watch('vendorId') || '';

  useEffect(() => {
    onVendorChange(expenseType === 'VENDOR' ? (selectedVendorId || null) : null);
  }, [expenseType, selectedVendorId, onVendorChange]);

  // No manual focus override to let FormShell handle it naturally from the first field

  const onSubmit = (d: CreateExpenseInput) => {
    const paidAmount = d.amountPaid ?? 0;
    const payload: CreateExpenseInput = {
      ...d,
      reason: d.reason || undefined,
      description: d.description || undefined,
      paymentDate: d.paymentDate ? toIsoDate(d.paymentDate) : undefined,
      vendorId: d.type === 'VENDOR' ? d.vendorId || undefined : undefined,
      amountPaid: paidAmount === 0 ? undefined : paidAmount,
      paymentMode: paidAmount > 0 ? d.paymentMode : undefined,
      referenceNumber: paidAmount > 0 && d.paymentMode !== 'CASH' ? d.referenceNumber?.trim() || undefined : undefined,
    };

    if (payload.type === 'VENDOR' && !payload.vendorId) {
      toast.error('Select a vendor for vendor expense');
      return;
    }

    mutate(payload);
  };

  const handleQuickVendorCreate = async () => {
    const name = quickVendorName.trim();
    const category = quickVendorCategory.trim();

    if (!name) {
      toast.error('Vendor name is required');
      return;
    }

    if (!category) {
      toast.error('Vendor category is required');
      return;
    }

    try {
      const response = await createVendorQuick({ name, type: category });
      const createdVendorId = response?.data?.vendor?.id as string | undefined;
      if (createdVendorId) {
        setValue('vendorId', createdVendorId, { shouldValidate: true });
      }
      setShowQuickVendorCreate(false);
      toast.success('Vendor created');
    } catch (createError) {
      toast.error(getApiErrorMessage(createError, 'Failed to create vendor'));
    }
  };

  const paymentMode = watch('paymentMode') || 'CASH';
  const amountPaid = watch('amountPaid') || 0;

  return (
    <FormShell 
      title={`Add Expense in ${site?.name}`} 
      onBack={onBack} 
      isPending={isPending || isCreatingVendorQuick} 
      submitLabel="Save Expense" 
      formId="add-site-expense-form"
    >
      <form id="add-site-expense-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to add expense')} />}
        
        <Field label="Expense Type">
          <input type="hidden" {...register('type')} />
          <KeyToggle
            options={['GENERAL', 'VENDOR']}
            value={expenseType}
            onChange={(v) => setValue('type', v as 'GENERAL' | 'VENDOR', { shouldValidate: true })}
            renderOption={(t, selected) => (
              <div className={cn(
                'border px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all text-center',
                selected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/30',
              )}>
                {t === 'GENERAL' ? 'General' : 'Vendor'}
                {selected && <span className="ml-2 text-[9px]">*</span>}
              </div>
            )}
          />
        </Field>
        {expenseType === 'VENDOR' ? (
          <Field label="Vendor" error={errors.vendorId?.message}>
            <input type="hidden" {...register('vendorId')} />
            <SearchableSelect
              options={vendors.map((vendor: any) => ({
                value: vendor.id,
                label: vendor.name,
                keywords: [vendor.type, vendor.phone, vendor.email].filter(Boolean),
              }))}
              value={selectedVendorId}
              onValueChange={(nextValue) => setValue('vendorId', nextValue, { shouldValidate: true })}
              placeholder="Select vendor..."
              searchPlaceholder="Type vendor name..."
              emptyText="No vendors match your search."
              renderNoResults={(query) => (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-muted-foreground/60">No vendors match "{query.trim()}".</p>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = query.trim();
                      if (!trimmed) return;
                      setQuickVendorName(trimmed);
                      setShowQuickVendorCreate(true);
                    }}
                    className="h-9 border border-primary/40 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors"
                  >
                    Create Vendor
                  </button>
                </div>
              )}
            />
            {showQuickVendorCreate && (
              <div className="mt-3 border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Create Vendor</p>
                  <button type="button" onClick={() => setShowQuickVendorCreate(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
                <div className="grid gap-2">
                  <input
                    value={quickVendorName}
                    onChange={(e) => setQuickVendorName(e.target.value)}
                    placeholder="Vendor name"
                    className={cn(INPUT_CLS, 'h-10')}
                  />
                  <SearchableSelect
                    options={vendorTypeOptions}
                    value={quickVendorCategory}
                    onValueChange={setQuickVendorCategory}
                    placeholder="Select or type category..."
                    searchPlaceholder="Search or create category..."
                    emptyText="Type a new category name."
                    allowCustom
                  />
                  <button
                    type="button"
                    onClick={handleQuickVendorCreate}
                    disabled={isCreatingVendorQuick}
                    className="mt-1 h-10 bg-primary text-black text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isCreatingVendorQuick ? 'Creating...' : 'Create & Select Vendor'}
                  </button>
                </div>
              </div>
            )}
          </Field>
        ) : (
          <Field label="Reason" error={errors.reason?.message}>
            <input placeholder="e.g. Cement purchase, Site transport" className={INPUT_CLS} {...register('reason')} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (INR)" error={errors.amount?.message}>
            <input type="number" min={0} className={INPUT_CLS} {...register('amount', { valueAsNumber: true })} />
          </Field>
          <Field label="Amount Paid (optional)" error={errors.amountPaid?.message}>
            <input type="number" min={0} className={INPUT_CLS} {...register('amountPaid', { valueAsNumber: true })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Initial Payment Date (optional)">
            <input type="datetime-local" className={INPUT_CLS} {...register('paymentDate')} />
          </Field>
          {amountPaid > 0 && (
            <Field label="Payment Mode" error={errors.paymentMode?.message}>
              <SearchableSelect
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'UPI', label: 'UPI' },
                ]}
                value={paymentMode}
                onValueChange={(v) => setValue('paymentMode', v as any, { shouldValidate: true })}
                placeholder="Select mode..."
                searchPlaceholder="Search mode..."
              />
            </Field>
          )}
        </div>

        {amountPaid > 0 && paymentMode !== 'CASH' && (
          <Field label={getBookingReferenceLabel(paymentMode)} error={errors.referenceNumber?.message}>
            <input 
              placeholder={getBookingReferenceLabel(paymentMode)} 
              className={INPUT_CLS} 
              {...register('referenceNumber')} 
            />
          </Field>
        )}
        <Field label="Description (optional)">
          <textarea className={cn(INPUT_CLS, 'min-h-16 resize-none py-3')} {...register('description')} />
        </Field>
      </form>
    </FormShell>
  );
}


function ManageFundsForm({ site, onSuccess, onBack }: { site: any; onSuccess: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<'ADD' | 'PULL'>('ADD');
  const { data: companyData } = useCompany();
  const companyFunds = companyData?.data;
  const maxAvailableToAdd = companyFunds?.available_fund || 0;
  const maxAvailableToPull = site.remainingFund || 0;

  const { mutate: addFund, isPending: adding, error: addError } = useAddFund(site.id, {
    onSuccess: () => {
      toast.success(`Transferred ${formatINR(Number(amount))} to ${site.name}`);
      onSuccess();
    }
  });

  const { mutate: pullFund, isPending: pulling, error: pullError } = useWithdrawSiteFund(site.id, {
    onSuccess: () => {
      toast.success(`Pulled ${formatINR(Number(amount))} from ${site.name}`);
      onSuccess();
    }
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: { amount: 0, note: '' }
  });

  const amount = watch('amount') || 0;
  const isPending = adding || pulling;
  const error = mode === 'ADD' ? addError : pullError;

  const onSubmit = (data: any) => {
    if (mode === 'ADD') {
      if (data.amount > maxAvailableToAdd) {
        toast.error('Insufficient funds in company wallet');
        return;
      }
      addFund({ amount: Number(data.amount), note: data.note });
    } else {
      if (data.amount > maxAvailableToPull) {
        toast.error('Insufficient funds in site balance');
        return;
      }
      pullFund({ amount: Number(data.amount), note: data.note });
    }
  };

  return (
    <FormShell
      title={`Manage Funds: ${site.name}`}
      onBack={onBack}
      isPending={isPending}
      submitLabel={mode === 'ADD' ? 'Inject Fund' : 'Pull Fund'}
      formId="manage-funds-form"
    >
      <form id="manage-funds-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        {error && <FormError msg={getApiErrorMessage(error, 'Fund operation failed')} />}
        
        <Field label="Operation Type">
          <KeyToggle
            options={['ADD', 'PULL']}
            value={mode}
            onChange={(v) => setMode(v as any)}
            renderOption={(opt, selected) => (
              <div className={cn(
                'border px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all text-center',
                selected 
                  ? opt === 'ADD' ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' : 'border-red-500 bg-red-500/5 text-red-600'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/30',
              )}>
                {opt === 'ADD' ? 'Add Fund (Inject)' : 'Pull Fund (Reclaim)'}
              </div>
            )}
          />
        </Field>

        <Field label="Amount (INR)" error={errors.amount?.message as string}>
          <div className="relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-bold">₹</span>
             <input
              type="number"
              min={1}
              className={cn(INPUT_CLS, 'pl-8')}
              {...register('amount', { valueAsNumber: true, min: { value: 1, message: 'Amount must be greater than 0' } })}
            />
          </div>
          <div className="mt-2 flex justify-between items-center">
            <p className="text-[9px] text-muted-foreground/50 italic font-bold uppercase tracking-widest">
              {mode === 'ADD' ? `Available: ${formatINR(maxAvailableToAdd)}` : `Remaning: ${formatINR(maxAvailableToPull)}`}
            </p>
            {mode === 'PULL' && (
              <button 
                type="button" 
                onClick={() => reset({ amount: maxAvailableToPull })}
                className="text-[9px] font-black text-primary hover:underline uppercase tracking-tighter"
              >
                Pull Max
              </button>
            )}
          </div>
        </Field>

        <Field label="Narration / Note (Optional)">
          <textarea
            placeholder={mode === 'ADD' ? 'e.g. Budget increase for materials' : 'e.g. Project finished, reclaiming surplus'}
            className={cn(INPUT_CLS, 'min-h-24 py-3')}
            {...register('note')}
          />
        </Field>
      </form>
    </FormShell>
  );
}

function AddPartnerForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { data: companyData } = useCompany();
  const partners = companyData?.data?.partners ?? [];
  const totalEquity = partners.reduce((s: number, p: any) => s + p.stakePercentage, 0);
  const maxStake = Math.max(0, 100 - totalEquity);

  const { mutate, isPending, error } = useAddPartner({ onSuccess: () => { reset(); toast.success('Partner added'); onSuccess(); } });
  const { register, handleSubmit, reset, setFocus, formState: { errors } } = useForm<PartnerInput>({
    resolver: zodResolver(partnerInputSchema),
    defaultValues: { name: '', email: '', phone: '', investmentAmount: 0, stakePercentage: 0 },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  return (
    <FormShell title="Add Partner" onBack={onBack} isPending={isPending} submitLabel="Add Partner" formId="add-partner-form">
      <form id="add-partner-form" onSubmit={handleSubmit((d) => mutate({ ...d, email: d.email || undefined }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to add partner')} />}
        {totalEquity >= 100 && (
          <div className="bg-destructive/10 border border-destructive/30 p-3 text-[10px] font-bold text-destructive">
            Equity is already at {totalEquity}%. You can still add a partner with 0% stake.
          </div>
        )}
        <Field label="Full Name" error={errors.name?.message}>
          <input placeholder="Partner name" className={INPUT_CLS} {...register('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" error={errors.email?.message}>
            <input placeholder="email@company.in" className={INPUT_CLS} {...register('email')} />
          </Field>
          <Field label="Phone">
            <input placeholder="+91 XXXXX" className={INPUT_CLS} {...register('phone')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Investment (INR)" error={errors.investmentAmount?.message}>
            <input type="number" min={0} placeholder="0" className={INPUT_CLS} {...register('investmentAmount', { valueAsNumber: true })} />
          </Field>
          <Field label={`Equity % (max ${maxStake.toFixed(1)}%)`} error={errors.stakePercentage?.message}>
            <input type="number" min={0} max={100} step={0.01} placeholder="0" className={INPUT_CLS} {...register('stakePercentage', { valueAsNumber: true })} />
          </Field>
        </div>
      </form>
    </FormShell>
  );
}

// â”€â”€â”€ FORM: Edit Company â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const editCompanySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
});

function EditCompanyForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { data: companyData, isLoading: loading } = useCompany();
  const company = companyData?.data?.company;
  const { mutate, isPending, error } = useUpdateCompany();
  const { register, handleSubmit, reset, setFocus, formState: { errors } } = useForm({
    resolver: zodResolver(editCompanySchema),
    defaultValues: { name: company?.name || '', address: company?.address || '' },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  // Reset form when company data loads
  useEffect(() => {
    if (company) reset({ name: company.name, address: company.address || '' });
  }, [company, reset]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <FormShell title="Edit Company" onBack={onBack} isPending={isPending} submitLabel="Save Changes" formId="edit-company-form">
      <form id="edit-company-form" onSubmit={handleSubmit((d) => mutate(d, { onSuccess: () => { toast.success('Company updated'); onSuccess(); } }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to update')} />}
        <Field label="Company Name" error={errors.name?.message}>
          <input className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <input className={INPUT_CLS} {...register('address')} />
        </Field>
      </form>
    </FormShell>
  );
}

// â”€â”€â”€ FORM: Withdraw Fund â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const withdrawSchema = z.object({
  amount: z.coerce.number().positive('Amount is required'),
  note: z.string().optional(),
});

function WithdrawFundForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { data: companyData, isLoading: loading } = useCompany();
  const availableFund = companyData?.data?.available_fund ?? 0;
  const { mutate, isPending, error } = useWithdrawCompanyFund({ onSuccess: () => { reset(); toast.success('Withdrawal recorded'); onSuccess(); } });
  const { register, handleSubmit, reset, setValue, setFocus, formState: { errors } } = useForm({
    resolver: zodResolver(withdrawSchema),
  });
  useEffect(() => { setTimeout(() => setFocus('amount'), 50); }, [setFocus]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <FormShell title="Withdraw from Company" onBack={onBack} isPending={isPending} submitLabel="Withdraw" formId="withdraw-form" destructive>
      <form id="withdraw-form" onSubmit={handleSubmit((d) => mutate(d))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Withdrawal failed')} />}
        <div className="flex items-center justify-between border border-border bg-muted/30 px-4 py-3">
          <span className={LABEL_CLS}>Available Fund</span>
          <span className="text-xl font-bold text-primary tabular-nums">{formatINR(availableFund)}</span>
        </div>
        <Field label="Amount (INR)" error={errors.amount?.message}>
          <input type="number" min={0} placeholder="0" className={INPUT_CLS} {...register('amount')} />
          <button type="button" tabIndex={-1} onClick={() => setValue('amount', availableFund)}
            className="mt-1 self-end text-[10px] font-bold text-primary hover:underline">
            Withdraw all ({formatINR(availableFund)})
          </button>
        </Field>
        <Field label="Note (optional)">
          <input placeholder="e.g. Owner payout Q1" className={INPUT_CLS} {...register('note')} />
        </Field>
      </form>
    </FormShell>
  );
}

// â”€â”€â”€ FORM: Add Investor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AddInvestorForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { data: sitesData } = useSites();
  const sites = sitesData?.data?.sites || [];
  const { mutate: createInvestor, isPending: isCreatingInvestor, error: createError } = useCreateInvestor();
  const { mutate: addTransaction, isPending: isAddingTransaction } = useAddTransaction();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, watch, reset, resetField, setValue, formState: { errors } } = useForm<CreateInvestorInput>({
    resolver: zodResolver(createInvestorSchema),
    defaultValues: {
      type: 'EQUITY',
      equityPercentage: 0,
      fixedRate: 0,
      investmentAmount: 0,
      amountPaidNow: 0,
      paymentMode: 'CASH',
      paymentDate: getTodayDateInputValue(),
    },
  });
  const investorType = watch('type');
  const selectedEquitySiteId = watch('siteId') || '';
  const investmentAmount = watch('investmentAmount') || 0;
  const amountPaidNow = watch('amountPaidNow') || 0;
  const paymentMode = watch('paymentMode') || 'CASH';

  const isSubmitting = isCreatingInvestor || isAddingTransaction;

  const onSubmit = async (d: CreateInvestorInput) => {
    setSubmitError(null);

    if (d.type === 'EQUITY' && !d.siteId) {
      toast.error('Select a site for equity investor');
      return;
    }

    try {
      // Step 1: create investor first
      const investorResult = await new Promise<any>((resolve, reject) => {
        createInvestor({
          ...d,
          siteId: d.type === 'EQUITY' ? d.siteId : undefined,
          equityPercentage: d.equityPercentage,
          fixedRate: d.fixedRate,
          // Remove payment-related fields - backend doesn't expect them
          investmentAmount: undefined,
          amountPaidNow: undefined,
          paymentMode: undefined,
          referenceNumber: undefined,
          paymentDate: undefined,
        }, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      const createdInvestorId = investorResult?.data?.investor?.id ?? investorResult?.investor?.id;
      if (!createdInvestorId) {
        throw new Error('Investor created response was invalid.');
      }

      // Step 2: add transaction using amount and paid-now values
      const totalAmount = Number(d.investmentAmount ?? 0);
      const paidNowAmount = Number(d.amountPaidNow ?? 0);

      if (totalAmount > 0) {
        try {
          await new Promise<any>((resolve, reject) => {
            addTransaction({
              investorId: createdInvestorId,
              data: {
                amount: totalAmount,
                amountPaid: paidNowAmount,
                note: 'Initial investment entry during investor creation',
                paymentDate: d.paymentDate ? toIsoDate(d.paymentDate) : undefined,
              },
            }, {
              onSuccess: resolve,
              onError: reject,
            });
          });

          if (paidNowAmount > 0) {
            toast.success(`Investor added and transaction recorded. Paid now: ${formatINR(paidNowAmount)}`);
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

      reset();
      onSuccess();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to create investor.');
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <FormShell title="Add Investor" onBack={onBack} isPending={isSubmitting} submitLabel="Add Investor" formId="add-investor-form">
      <form id="add-investor-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {submitError && <FormError msg={submitError} />}
        {createError && <FormError msg={getApiErrorMessage(createError, 'Failed to add investor')} />}

        <Field label="Investor Type">
          <KeyToggle
            options={['EQUITY', 'FIXED_RATE']}
            value={investorType}
            onChange={(v) => { resetField('siteId'); resetField('equityPercentage'); resetField('fixedRate'); setValue('type', v as 'EQUITY' | 'FIXED_RATE'); }}
            renderOption={(t, selected) => (
              <div className={cn('border px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all text-center',
                selected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/30')}>
                {t === 'EQUITY' ? 'Equity (Site)' : 'Fixed Rate'}
                {selected && <span className="ml-2 text-[9px]">*</span>}
              </div>
            )}
          />
          <p className="text-[9px] text-muted-foreground/40 mt-1">Use Left/Right Arrow keys to switch</p>
        </Field>

        <Field label="Full Name" error={errors.name?.message}>
          <input placeholder="Investor name" className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Contact Number">
          <input placeholder="+91 XXXXX XXXXX" className={INPUT_CLS} {...register('phone')} />
        </Field>

        {investorType === 'EQUITY' && (
          <>
            <Field label="Select Site">
              <input type="hidden" {...register('siteId')} />
              <SearchableSelect
                options={sites.map((siteItem: any) => ({
                  value: siteItem.id,
                  label: siteItem.name,
                  keywords: [siteItem.address].filter(Boolean),
                }))}
                value={selectedEquitySiteId}
                onValueChange={(nextValue) => setValue('siteId', nextValue, { shouldValidate: true })}
                placeholder="Choose site..."
                searchPlaceholder="Type site name..."
                emptyText="No sites match your search."
              />
            </Field>
            <Field label="Equity Percentage (%)" error={errors.equityPercentage?.message}>
              <input type="number" step={0.01} min={0} max={100} className={INPUT_CLS} {...register('equityPercentage', { valueAsNumber: true })} />
            </Field>
          </>
        )}
        {investorType === 'FIXED_RATE' && (
          <Field label="Fixed Rate (% p.a.)" error={errors.fixedRate?.message}>
            <input type="number" step={0.01} min={0} className={INPUT_CLS} {...register('fixedRate', { valueAsNumber: true })} />
          </Field>
        )}

        <Field label="Total Investment Amount (INR)" error={errors.investmentAmount?.message}>
          <input
            type="number"
            min={0}
            step="0.01"
            className={INPUT_CLS}
            {...register('investmentAmount', { valueAsNumber: true })}
            placeholder="e.g. 500000"
          />
        </Field>

        {investmentAmount > 0 && (
          <div className="border border-border bg-muted/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-3">
              Immediate Payment (Optional)
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount Paid Now (INR)" error={errors.amountPaidNow?.message}>
                <input
                  type="number"
                  min={0}
                  max={investmentAmount}
                  step="0.01"
                  className={INPUT_CLS}
                  {...register('amountPaidNow', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Payment Mode">
                <select className={INPUT_CLS} {...register('paymentMode')}>
                  <option value="">Select payment mode</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                </select>
              </Field>
            </div>

            {amountPaidNow > 0 && paymentMode && paymentMode !== 'CASH' && (
              <Field label="Reference Number" error={errors.referenceNumber?.message}>
                <input
                  className={INPUT_CLS}
                  {...register('referenceNumber')}
                  placeholder={
                    paymentMode === 'CHEQUE' ? 'Cheque number' :
                    paymentMode === 'UPI' ? 'UPI transaction ID' :
                    'Bank transfer ref / UTR'
                  }
                />
              </Field>
            )}

            <Field label="Payment Date">
              <input
                type="date"
                className={INPUT_CLS}
                {...register('paymentDate')}
                defaultValue={getTodayDateInputValue()}
              />
            </Field>

            {amountPaidNow > 0 && (
              <div className="border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-[10px] text-amber-700">
                  {formatINR(amountPaidNow)} will be recorded immediately as principal investment.
                  Remaining {formatINR(investmentAmount - amountPaidNow)} will be pending.
                </p>
              </div>
            )}
          </div>
        )}
      </form>
    </FormShell>
  );
}

// Form: Add Vendor

function AddVendorForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { data: vendorsData } = useVendors();
  const vendorTypeOptions = useMemo(() => buildVendorTypeOptions(vendorsData?.data?.vendors ?? []), [vendorsData?.data?.vendors]);
  const { mutate, isPending, error } = useCreateVendor({ onSuccess: () => { reset(); toast.success('Vendor added'); onSuccess(); } });
  const { register, handleSubmit, reset, setFocus, setValue, watch, formState: { errors } } = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: { name: '', type: '', phone: '', email: '' },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);
  const vendorType = watch('type') || '';

  return (
    <FormShell title="Add Vendor" onBack={onBack} isPending={isPending} submitLabel="Add Vendor" formId="add-vendor-form">
      <form id="add-vendor-form" onSubmit={handleSubmit((d) => mutate({ ...d, email: d.email || undefined }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to add vendor')} />}
        <Field label="Vendor Name" error={errors.name?.message}>
          <input placeholder="Enter vendor name" className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Vendor Type" error={errors.type?.message}>
          <input type="hidden" {...register('type')} />
          <SearchableSelect
            options={vendorTypeOptions}
            value={vendorType}
            onValueChange={(value) => setValue('type', value, { shouldValidate: true })}
            placeholder="Select or type vendor type..."
            searchPlaceholder="Search or create vendor type..."
            emptyText="Type a new vendor type."
            allowCustom
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input placeholder="+91" className={INPUT_CLS} {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input placeholder="vendor@email.com" className={INPUT_CLS} {...register('email')} />
          </Field>
        </div>
      </form>
    </FormShell>
  );
}

// â”€â”€â”€ FORM: Edit Forms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EditPartnerForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useUpdatePartner({ onSuccess: () => { toast.success('Partner updated'); onSuccess(); } });
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<PartnerInput>({
    resolver: zodResolver(partnerInputSchema),
    defaultValues: {
      name: entity?.name || '',
      email: entity?.email || '',
      phone: entity?.phone || '',
      investmentAmount: entity?.investmentAmount || 0,
      stakePercentage: entity?.stakePercentage || 0,
    },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  return (
    <FormShell title={`Edit Partner: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Save Partner" formId="edit-partner-form">
      <form id="edit-partner-form" onSubmit={handleSubmit((d) => mutate({ id: entity.id, data: { ...d, email: d.email || undefined } }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to update partner')} />}
        <Field label="Full Name" error={errors.name?.message}>
          <input className={INPUT_CLS} {...register('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" error={errors.email?.message}>
            <input className={INPUT_CLS} {...register('email')} />
          </Field>
          <Field label="Phone">
            <input className={INPUT_CLS} {...register('phone')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Investment (INR)" error={errors.investmentAmount?.message}>
            <input type="number" className={INPUT_CLS} {...register('investmentAmount', { valueAsNumber: true })} />
          </Field>
          <Field label="Equity %" error={errors.stakePercentage?.message}>
            <input type="number" step={0.01} className={INPUT_CLS} {...register('stakePercentage', { valueAsNumber: true })} />
          </Field>
        </div>
      </form>
    </FormShell>
  );
}

function EditInvestorForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useUpdateInvestor({ onSuccess: () => { toast.success('Investor updated'); onSuccess(); } });
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<UpdateInvestorInput>({
    resolver: zodResolver(updateInvestorSchema),
    defaultValues: {
      name: entity?.name || '',
      phone: entity?.phone || '',
      equityPercentage: entity?.equityPercentage || 0,
      fixedRate: entity?.fixedRate || 0,
    },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  return (
    <FormShell title={`Edit Investor: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Save Changes" formId="edit-investor-form">
      <form id="edit-investor-form" onSubmit={handleSubmit((d) => mutate({ id: entity.id, data: d }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to update investor')} />}
        <Field label="Full Name" error={errors.name?.message}>
          <input className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Phone">
          <input className={INPUT_CLS} {...register('phone')} />
        </Field>
        {entity?.type === 'EQUITY' ? (
          <Field label="Equity Percentage (%)" error={errors.equityPercentage?.message}>
            <input type="number" step={0.01} className={INPUT_CLS} {...register('equityPercentage', { valueAsNumber: true })} />
          </Field>
        ) : (
          <Field label="Fixed Rate (% p.a.)" error={errors.fixedRate?.message}>
            <input type="number" step={0.01} className={INPUT_CLS} {...register('fixedRate', { valueAsNumber: true })} />
          </Field>
        )}
      </form>
    </FormShell>
  );
}

function EditVendorForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { data: vendorsData } = useVendors();
  const vendorTypeOptions = useMemo(() => buildVendorTypeOptions(vendorsData?.data?.vendors ?? []), [vendorsData?.data?.vendors]);
  const { mutate, isPending, error } = useUpdateVendor({ onSuccess: () => { toast.success('Vendor updated'); onSuccess(); } });
  const { register, handleSubmit, setFocus, setValue, watch, formState: { errors } } = useForm<UpdateVendorInput>({
    resolver: zodResolver(updateVendorSchema),
    defaultValues: {
      name: entity?.name || '',
      type: entity?.type || '',
      phone: entity?.phone || '',
      email: entity?.email || '',
    },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);
  const vendorType = watch('type') || '';

  return (
    <FormShell title={`Edit Vendor: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Save Vendor" formId="edit-vendor-form">
      <form id="edit-vendor-form" onSubmit={handleSubmit((d) => mutate({ id: entity.id, data: d }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to update vendor')} />}
        <Field label="Vendor Name" error={errors.name?.message}>
          <input className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Vendor Type" error={errors.type?.message}>
          <input type="hidden" {...register('type')} />
          <SearchableSelect
            options={vendorTypeOptions}
            value={vendorType}
            onValueChange={(value) => setValue('type', value, { shouldValidate: true })}
            placeholder="Select or type vendor type..."
            searchPlaceholder="Search or create vendor type..."
            emptyText="Type a new vendor type."
            allowCustom
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input className={INPUT_CLS} {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input className={INPUT_CLS} {...register('email')} />
          </Field>
        </div>
      </form>
    </FormShell>
  );
}

function EditCustomerForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useUpdateCustomer({ onSuccess: () => { toast.success('Customer updated'); onSuccess(); } });
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      name: entity?.name || '',
      phone: entity?.phone || '',
      email: entity?.email || '',
    },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  return (
    <FormShell title={`Edit Customer: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Save Changes" formId="edit-customer-form">
      <form id="edit-customer-form" onSubmit={handleSubmit((d) => mutate({ siteId: entity.siteId, flatId: entity.flatId, customerId: entity.id, data: d }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to update customer')} />}
        <Field label="Full Name" error={errors.name?.message}>
          <input className={INPUT_CLS} {...register('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input className={INPUT_CLS} {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input className={INPUT_CLS} {...register('email')} />
          </Field>
        </div>
      </form>
    </FormShell>
  );
}

function RecordPaymentForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useRecordCustomerPayment({ onSuccess: () => { toast.success('Payment recorded'); onSuccess(); } });
  type RecordPaymentFormValues = {
    amount: number;
    note?: string;
    paymentMode: RecordPaymentInput['paymentMode'];
    referenceNumber?: string;
  };

  const { register, handleSubmit, setError, clearErrors, setFocus, setValue, watch, formState: { errors } } = useForm<RecordPaymentFormValues>({
    defaultValues: { amount: 0, note: '', paymentMode: 'CASH', referenceNumber: '' },
  });
  useEffect(() => { setTimeout(() => setFocus('amount'), 50); }, [setFocus]);
  const paymentMode = watch('paymentMode') ?? 'CASH';

  useEffect(() => {
    if (paymentMode === 'CASH') {
      setValue('referenceNumber', undefined);
      clearErrors('referenceNumber');
    }
  }, [clearErrors, paymentMode, setValue]);

  return (
    <FormShell title={`Record Payment: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Record Payment" formId="record-payment-form">
      <form
        id="record-payment-form"
        onSubmit={handleSubmit((values) => {
          const parsed = recordPaymentSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const issuePath = issue?.path?.[0];
            if (typeof issuePath === 'string') {
              setError(issuePath as keyof RecordPaymentFormValues, { type: 'manual', message: issue.message });
            }
            return;
          }

          clearErrors();
          mutate({ customerId: entity.id, siteId: entity.siteId, data: parsed.data });
        })}
        className="flex flex-col gap-6"
      >
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to record payment')} />}
        <Field label="Amount Paid (INR)" error={errors.amount?.message}>
          <input type="number" className={INPUT_CLS} {...register('amount', { valueAsNumber: true })} />
        </Field>
        <Field label="Payment Mode" error={errors.paymentMode?.message}>
          <select className={INPUT_CLS} {...register('paymentMode')}>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
          </select>
        </Field>
        {paymentMode !== 'CASH' && (
          <Field label="Reference Number" error={errors.referenceNumber?.message}>
            <input
              placeholder={paymentMode === 'CHEQUE' ? 'Cheque number' : paymentMode === 'UPI' ? 'UPI transaction ID' : 'Bank transfer ref / UTR'}
              className={INPUT_CLS}
              {...register('referenceNumber')}
            />
          </Field>
        )}
        <Field label="Note">
          <input placeholder="Optional accounting note..." className={INPUT_CLS} {...register('note')} />
        </Field>
      </form>
    </FormShell>
  );
}

function CancelDealForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useCancelDeal({ onSuccess: () => { toast.success('Deal cancelled'); onSuccess(); } });
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm({
    resolver: zodResolver(cancelDealSchema),
    defaultValues: { reason: '', refundAmount: 0 },
  });
  useEffect(() => { setTimeout(() => setFocus('reason'), 50); }, [setFocus]);

  return (
    <FormShell title={`Cancel Deal: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Confirm Cancellation" formId="cancel-deal-form" destructive>
      <form id="cancel-deal-form" onSubmit={handleSubmit((d) => mutate({ siteId: entity.siteId, flatId: entity.flatId, customerId: entity.id, data: d }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to cancel deal')} />}
        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 p-3">
          Warning: This will set the flat back to AVAILABLE and mark the deal as cancelled.
        </p>
        <Field label="Reason for Cancellation" error={errors.reason?.message}>
          <input placeholder="e.g. Better option found, Financial issues" className={INPUT_CLS} {...register('reason')} />
        </Field>
        <Field label="Refund Amount (INR)" error={errors.refundAmount?.message}>
          <input type="number" className={INPUT_CLS} {...register('refundAmount', { valueAsNumber: true })} />
        </Field>
      </form>
    </FormShell>
  );
}

const bookingAgreementCalculationModeSchema = z.enum(['FIXED_AMOUNT', 'PERCENTAGE']);

const bookingAgreementLineDraftSchema = z.object({
  type: z.enum(BOOKING_AGREEMENT_LINE_TYPES),
  label: z.string().trim().min(1, 'Line label is required'),
  amount: z.number().min(0, 'Line amount must be zero or more'),
  ratePercent: z.number().min(0).optional(),
  calculationMode: bookingAgreementCalculationModeSchema.optional(),
  note: z.string().optional().or(z.literal('')),
}).superRefine((line, ctx) => {
  if (line.type === 'TAX' && (line.ratePercent === undefined || line.ratePercent <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ratePercent'],
      message: 'Enter tax percentage',
    });
  }

  if (line.type === 'DISCOUNT') {
    const mode = line.calculationMode ?? 'FIXED_AMOUNT';
    if (mode === 'PERCENTAGE' && (line.ratePercent === undefined || line.ratePercent <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ratePercent'],
        message: 'Enter discount percentage',
      });
    }
    if (mode === 'FIXED_AMOUNT' && line.amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Enter discount amount',
      });
    }
  }
});

const bookFlatFlowSchema = bookFlatSchema.extend({
  wingId: z.string().optional(),
  floorNumber: z.number().int().min(0, 'Select a floor number'),
  customFlatId: z.string().trim().min(1, 'Flat name/ID is required'),
  unitType: z.string().trim().min(1, 'Unit type is required'),
  flatType: z.enum(['CUSTOMER', 'EXISTING_OWNER']).default('CUSTOMER'),
  customerMode: z.enum(['NEW', 'EXISTING']).default('NEW'),
  existingCustomerId: z.string().optional(),
  agreementLines: z.array(bookingAgreementLineDraftSchema).default([]),
}).superRefine((data, ctx) => {
  if (data.customerMode === 'EXISTING' && !data.existingCustomerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['existingCustomerId'],
      message: 'Select an existing customer',
    });
  }

  if (data.bookingAmount > 0 && !data.paymentMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['paymentMode'],
      message: 'Select the payment mode for the booking amount',
    });
  }

  if (data.bookingAmount > 0 && data.paymentMode && data.paymentMode !== 'CASH' && !data.referenceNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['referenceNumber'],
      message: 'Reference number is required for non-cash booking payments',
    });
  }

  // Wing requirement
  if (data.wingId === undefined && !!(ctx as any).site?.hasMultipleWings) {
    // Note: Since site is not available in schema, we'll handle this in superRefine or form-level
  }
});

type BookFlatFlowInput = z.input<typeof bookFlatFlowSchema>;
type BookFlatAgreementLineDraftInput = NonNullable<BookFlatFlowInput['agreementLines']>[number];
type BookingAgreementCalculationMode = z.infer<typeof bookingAgreementCalculationModeSchema>;
type BookingAgreementLineComputationInput = Pick<
  BookFlatAgreementLineDraftInput,
  'type' | 'amount' | 'ratePercent' | 'calculationMode'
>;

function getBookingReferenceLabel(paymentMode?: BookFlatInput['paymentMode']) {
  switch (paymentMode) {
    case 'CHEQUE':
      return 'Cheque Number';
    case 'BANK_TRANSFER':
      return 'Bank Transfer Ref / UTR';
    case 'UPI':
      return 'UPI Transaction ID';
    default:
      return 'Reference Number';
  }
}

function defaultBookingAgreementLineAffectsProfit(type: BookFlatAgreementLineInput['type']) {
  return type !== 'TAX';
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getBookingAgreementLineCalculationMode(line: BookingAgreementLineComputationInput): BookingAgreementCalculationMode {
  if (line.type === 'TAX') return 'PERCENTAGE';
  if (line.type === 'DISCOUNT') return line.calculationMode ?? 'FIXED_AMOUNT';
  return 'FIXED_AMOUNT';
}

function resolveBookingAgreementLineAmount(line: BookingAgreementLineComputationInput, sellingPrice: number) {
  if (line.type === 'TAX') {
    return roundMoney(sellingPrice * ((line.ratePercent ?? 0) / 100));
  }

  if (line.type === 'DISCOUNT' && getBookingAgreementLineCalculationMode(line) === 'PERCENTAGE') {
    return roundMoney(sellingPrice * ((line.ratePercent ?? 0) / 100));
  }

  return roundMoney(line.amount ?? 0);
}

function createDefaultBookingAgreementLine(): BookFlatAgreementLineDraftInput {
  return {
    type: '' as any, // Don't prefill
    label: '',
    amount: 0,
    ratePercent: undefined,
    calculationMode: 'FIXED_AMOUNT',
    note: '',
  };
}

function BookFlatForm({
  site,
  onSuccess,
  onBack,
  onFloorChange,
  onWingChange,
}: {
  site: any;
  onSuccess: () => void;
  onBack: () => void;
  onFloorChange?: (floorNumber: number | null) => void;
  onWingChange?: (wingId: string | null) => void;
}) {
  const { data: floorsData, isLoading: floorsLoading, refetch: refetchFloors } = useFloors(site.id);
  const { data: wingsData, isLoading: wingsLoading } = useWings(site.id);
  const { data: allCustomersData } = useAllCustomers();
  const floors: Floor[] = floorsData?.data?.floors ?? [];
  const wings: any[] = wingsData?.data?.wings ?? [];
  const availableCustomers = (allCustomersData?.data?.customers ?? []).filter((customer: any) => customer.dealStatus === 'ACTIVE');
  const groupedExistingCustomers = useMemo(
    () => groupCustomerDeals(availableCustomers as CustomerWithSite[]),
    [availableCustomers],
  );

  const { mutateAsync: createFloor, isPending: isCreatingFloor, error: createFloorError } = useCreateFloor(site.id);
  const { mutateAsync: createFlat, isPending: isCreatingFlat, error: createFlatError } = useCreateFlat(site.id);
  const { mutateAsync: updateFlatDetails, isPending: isUpdatingFlatDetails, error: updateFlatDetailsError } = useUpdateFlatDetails(site.id);
  const { mutateAsync: bookFlat, isPending: isBooking, error: bookingError } = useBookFlat(site.id);

  const { register, control, handleSubmit, watch, setValue, setFocus, formState: { errors } } = useForm<BookFlatFlowInput>({
    resolver: zodResolver(bookFlatFlowSchema),
    defaultValues: {
      wingId: '',
      floorNumber: -1,
      customFlatId: '',
      unitType: '', // Don't prefill
      flatType: 'CUSTOMER',
      customerMode: 'NEW',
      existingCustomerId: '',
      name: '',
      phone: '',
      email: '',
      sellingPrice: 0,
      bookingAmount: 0,
      paymentMode: 'CASH',
      referenceNumber: '',
      agreementLines: [],
    },
  });
  const {
    fields: agreementLineFields,
    append: appendAgreementLine,
    remove: removeAgreementLine,
  } = useFieldArray({
    control,
    name: 'agreementLines',
  });

  const wingId = watch('wingId');
  const hasWings = wings.length > 0;

  const floorNumbers: number[] = useMemo(() => {
    // Filter floors by selected wing if applicable
    const filteredFloors = hasWings 
      ? floors.filter(f => f.wingId === wingId)
      : floors;

    const selectedWing = wings.find(w => w.id === wingId);
    const declaredTotal = hasWings 
      ? Number(selectedWing?.floorsCount ?? 0)
      : Number(site?.totalFloors ?? 0);
    
    const actualFloorNumbers = Array.from(
      new Set(
        filteredFloors
          .map((floor) => floor.floorNumber)
          .filter((n): n is number => Number.isFinite(n) && n >= 0)
      )
    );
    const hasActualGroundFloor = actualFloorNumbers.includes(0);

    // Sites/Floors & Flats treats floorNumber 0 as Ground Floor. Prefer the
    // real floor records over site metadata so older sites still show it here.
    const includeGF = hasActualGroundFloor || (!hasWings && !!site?.includeGroundFloor);
    
    let base: number[] = [];
    if (declaredTotal > 0) {
      base = Array.from({ length: declaredTotal }, (_, idx) => idx + 1);
      if (includeGF) base.unshift(0);
      actualFloorNumbers.forEach((number) => {
        if (!base.includes(number)) base.push(number);
      });
      base.sort((a, b) => a - b);
    } else {
      base = actualFloorNumbers.length ? actualFloorNumbers.sort((a, b) => a - b) : (includeGF ? [0, 1] : [1]);
    }
    return base;
  }, [floors, hasWings, site?.includeGroundFloor, site?.totalFloors, wingId, wings]);

  const fallbackFloorNumber = floorNumbers[0] ?? 1;

  const floorNumber = Number(watch('floorNumber') || 0);
  const customerMode = watch('customerMode') || 'NEW';
  const selectedExistingCustomerId = watch('existingCustomerId');
  const unitType = watch('unitType');
  const flatType = watch('flatType') || 'CUSTOMER';
  const sellingPrice = Number(watch('sellingPrice') || 0);
  const bookingAmount = Number(watch('bookingAmount') || 0);
  const bookingPaymentMode = watch('paymentMode') || 'CASH';
  const remaining = Math.max(0, sellingPrice - bookingAmount);

  const selectedExistingCustomer = groupedExistingCustomers.find((customer) => customer.groupKey === selectedExistingCustomerId);
  const selectedFloor = floors.find((floor: Floor) => 
    floor.floorNumber === floorNumber && 
    (!hasWings || floor.wingId === wingId)
  );
  const getFloorLabel = (number: number) => {
    const floor = floors.find((candidate: Floor) =>
      candidate.floorNumber === number &&
      (!hasWings || candidate.wingId === wingId)
    );
    return floor?.floorName || (number === 0 ? 'Ground Floor' : `Floor ${number}`);
  };

  // Conditional focus based on wings
  useEffect(() => {
    const target = hasWings ? 'wingId' : 'floorNumber';
    const timer = setTimeout(() => {
      setFocus(target);
    }, 150);
    return () => clearTimeout(timer);
  }, [setFocus, hasWings]);

  useEffect(() => {
    if (hasWings && !wingId && wings.length === 1) {
      setValue('wingId', wings[0].id, { shouldValidate: true });
      onWingChange?.(wings[0].id);
    }
  }, [hasWings, wingId, wings, setValue, onWingChange]);

  useEffect(() => {
    if (customerMode === 'EXISTING' && selectedExistingCustomer) {
      setValue('name', selectedExistingCustomer.displayName || '', { shouldValidate: true });
      setValue('phone', selectedExistingCustomer.phone || '', { shouldValidate: true });
      setValue('email', selectedExistingCustomer.email || '', { shouldValidate: true });
      return;
    }

    if (customerMode === 'NEW') {
      setValue('existingCustomerId', '', { shouldValidate: true });
    }
  }, [customerMode, selectedExistingCustomer, setValue]);

  useEffect(() => {
    if (hasWings && !wingId) return;
    if (!floorNumbers.length) return;
    if (floorNumber >= 0 && floorNumbers.includes(floorNumber)) return;

    setValue('floorNumber', fallbackFloorNumber, { shouldValidate: true });
  }, [fallbackFloorNumber, floorNumber, floorNumbers, hasWings, setValue, wingId]);

  useEffect(() => {
    onFloorChange?.(Number.isFinite(floorNumber) && floorNumber >= 0 ? floorNumber : null);
    return () => onFloorChange?.(null);
  }, [floorNumber, onFloorChange]);

  useEffect(() => {
    if (bookingAmount <= 0 || bookingPaymentMode === 'CASH') {
      setValue('referenceNumber', '', { shouldValidate: true });
    }
  }, [bookingAmount, bookingPaymentMode, setValue]);

  const onSubmit = async (data: BookFlatFlowInput) => {
    const normalizedFlatId = data.customFlatId.trim().toLowerCase();
    const resolvedUnitType = data.unitType.trim();
    let workingFloors = floors;
    let workingFloor = workingFloors.find((floor: Floor) => 
      floor.floorNumber === data.floorNumber && 
      (!hasWings || floor.wingId === data.wingId)
    );

    if (!workingFloor) {
      const floorName = data.floorNumber === 0 ? 'Ground Floor' : `Floor ${data.floorNumber}`;

      await createFloor({ 
        floorName,
        wingId: hasWings ? data.wingId : undefined 
      });
      const refreshed = await refetchFloors();
      workingFloors = (refreshed.data?.data?.floors ?? []) as Floor[];
      workingFloor = workingFloors.find((f: Floor) => 
        f.floorNumber === data.floorNumber && 
        (!hasWings || f.wingId === data.wingId)
      );
    }

    if (!workingFloor) {
      toast.error(`Floor ${data.floorNumber} is not ready yet. Please retry.`);
      return;
    }

    let workingFlat = workingFloor.flats.find((flat: Flat) =>
      flat.status === 'AVAILABLE' &&
      (
        (flat.customFlatId && flat.customFlatId.trim().toLowerCase() === normalizedFlatId) ||
        (!flat.customFlatId && String(flat.flatNumber ?? '').trim() === data.customFlatId.trim())
      )
    );

    if (!workingFlat) {
      await createFlat({
        floorId: workingFloor.id,
        data: {
          customFlatId: data.customFlatId.trim(),
          unitType: resolvedUnitType,
          flatType: data.flatType ?? 'CUSTOMER',
        },
      });

      const refreshed = await refetchFloors();
      workingFloors = (refreshed.data?.data?.floors ?? []) as Floor[];
      workingFloor = workingFloors.find((floor: Floor) => floor.floorNumber === data.floorNumber);
      workingFlat = workingFloor?.flats.find((flat: Flat) =>
        flat.status === 'AVAILABLE' && flat.customFlatId?.trim().toLowerCase() === normalizedFlatId
      );
    }

    if (!workingFlat) {
      toast.error('Flat could not be prepared for booking. Please try again.');
      return;
    }

    if (resolvedUnitType && workingFlat.unitType !== resolvedUnitType) {
      await updateFlatDetails({
        flatId: workingFlat.id,
        data: {
          customFlatId: workingFlat.customFlatId?.trim() || data.customFlatId.trim(),
          unitType: resolvedUnitType,
          flatType: data.flatType ?? 'CUSTOMER',
        },
      });
    }

    await bookFlat({
      flatId: workingFlat.id,
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        sellingPrice: data.sellingPrice,
        bookingAmount: data.bookingAmount,
        paymentMode: data.bookingAmount > 0 ? data.paymentMode : undefined,
        referenceNumber: data.bookingAmount > 0 ? data.referenceNumber?.trim() || undefined : undefined,
        agreementLines: (data.agreementLines ?? []).map((line) => {
          const calculationMode = getBookingAgreementLineCalculationMode(line);
          const isPercentageLine = line.type === 'TAX' || (line.type === 'DISCOUNT' && calculationMode === 'PERCENTAGE');

          return {
            type: line.type,
            label: line.label.trim(),
            amount: resolveBookingAgreementLineAmount(line, data.sellingPrice),
            ratePercent: isPercentageLine ? line.ratePercent : undefined,
            calculationBase: isPercentageLine ? data.sellingPrice : undefined,
            affectsProfit: defaultBookingAgreementLineAffectsProfit(line.type),
            note: line.note?.trim() || undefined,
          };
        }),
      },
    });

    toast.success('Flat booked');
    onSuccess();
  };

  const isPending = floorsLoading || isCreatingFloor || isCreatingFlat || isUpdatingFlatDetails || isBooking;

  return (
    <FormShell title={`Book Flat in ${site?.name}`} onBack={onBack} isPending={isPending} submitLabel="Confirm Booking" formId="book-flat-form">
      <form id="book-flat-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {(createFloorError || createFlatError || updateFlatDetailsError || bookingError) && (
          <FormError msg={getApiErrorMessage(createFloorError || createFlatError || updateFlatDetailsError || bookingError, 'Failed to book flat')} />
        )}

        {hasWings && (
          <Field label="Select Wing" error={errors.wingId?.message}>
            <input type="hidden" {...register('wingId')} />
            <SearchableSelect
              options={wings.map((w) => ({ value: w.id, label: w.name }))}
              value={wingId || ''}
              onValueChange={(v) => {
                setValue('wingId', v, { shouldValidate: true });
                setValue('floorNumber', -1); // Reset floor when wing changes
                onWingChange?.(v || null);
              }}
              placeholder="Choose wing..."
              searchPlaceholder="Type wing name..."
            />
          </Field>
        )}

        <Field label="Floor Number" error={errors.floorNumber?.message}>
          <input type="hidden" {...register('floorNumber')} />
          <SearchableSelect
            options={floorNumbers.map((number) => ({ 
              value: String(number), 
              label: getFloorLabel(number),
              keywords: number === 0 ? ['0', 'ground', 'ground floor', 'gf'] : [String(number), `floor ${number}`],
            }))}
            value={floorNumber !== -1 ? String(floorNumber) : ''}
            onValueChange={(nextValue) => setValue('floorNumber', nextValue ? Number(nextValue) : -1, { shouldValidate: true })}
            placeholder="Select floor..."
            searchPlaceholder="Type floor number..."
            emptyText="No matching floor found."
          />
        </Field>




        <Field label="Flat Name / ID" error={errors.customFlatId?.message}>
          <input placeholder="e.g. A-101" className={INPUT_CLS} {...register('customFlatId')} />
          <p className="text-[10px] text-muted-foreground/60">
            If this flat already exists and is available on the selected floor, booking will use it. Otherwise a new flat is created and booked.
          </p>
        </Field>

        <Field label="Unit Type" error={errors.unitType?.message}>
          <input type="hidden" {...register('unitType')} />
          <SearchableSelect
            options={UNIT_TYPE_PICK_OPTIONS.map((type) => ({ value: type, label: type === 'CUSTOM' ? 'Custom' : type }))}
            value={unitType || ''}
            onValueChange={(nextValue) => setValue('unitType', nextValue, { shouldValidate: true })}
            placeholder="Select unit type..."
            searchPlaceholder="Type unit type..."
            emptyText="No matching unit type found. You can type your own."
            allowCustom={true}
          />
        </Field>

        <input type="hidden" {...register('flatType')} />
        <Field label="Flat Type">
          <KeyToggle
            options={['CUSTOMER', 'EXISTING_OWNER']}
            value={flatType}
            onChange={(value) => setValue('flatType', value as 'CUSTOMER' | 'EXISTING_OWNER', { shouldValidate: true })}
            renderOption={(type, selected) => (
              <div className={cn(
                'border px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all text-center',
                selected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/30',
              )}>
                {type === 'CUSTOMER' ? 'Customer Flat' : 'Existing Owner'}
              </div>
            )}
          />
        </Field>

        <input type="hidden" {...register('customerMode')} />
        <Field label="Customer Type">
          <KeyToggle
            options={['NEW', 'EXISTING']}
            value={customerMode}
            onChange={(value) => setValue('customerMode', value as 'NEW' | 'EXISTING', { shouldValidate: true })}
            renderOption={(mode, selected) => (
              <div className={cn(
                'border px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all text-center',
                selected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/30',
              )}>
                {mode === 'NEW' ? 'New Customer' : 'Existing Customer'}
              </div>
            )}
          />
        </Field>

        {customerMode === 'EXISTING' && (
          <Field label="Select Existing Customer" error={errors.existingCustomerId?.message}>
            <input type="hidden" {...register('existingCustomerId')} />
            <SearchableSelect
              options={groupedExistingCustomers.map((customer) => ({
                value: customer.groupKey,
                label: customer.displayName,
                description: `${customer.dealCount} flat${customer.dealCount > 1 ? 's' : ''} / ${new Set(customer.deals.map((deal) => deal.siteId).filter(Boolean)).size} site${new Set(customer.deals.map((deal) => deal.siteId).filter(Boolean)).size === 1 ? '' : 's'}`,
                keywords: [
                  customer.phone,
                  customer.email,
                  ...customer.deals.flatMap((deal) => [deal.siteName, deal.wingName, deal.floorName, deal.customFlatId, deal.unitType]),
                ].filter((keyword): keyword is string => Boolean(keyword)),
              }))}
              value={selectedExistingCustomerId || ''}
              onValueChange={(nextValue) => setValue('existingCustomerId', nextValue, { shouldValidate: true })}
              placeholder="Select customer..."
              searchPlaceholder="Type name, phone, site, flat..."
              emptyText="No customers match your search."
            />
            {groupedExistingCustomers.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60">No active customers found. Switch to New Customer to continue.</p>
            )}
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer Name" error={errors.name?.message}>
            <input className={INPUT_CLS} {...register('name')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input className={INPUT_CLS} {...register('phone')} />
          </Field>
        </div>

        <Field label="Email (optional)" error={errors.email?.message}>
          <input className={INPUT_CLS} {...register('email')} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Selling Price (INR)" error={errors.sellingPrice?.message}>
            <input type="number" min={0} className={INPUT_CLS} {...register('sellingPrice', { valueAsNumber: true })} />
          </Field>
          <Field label="Booking Amount (INR)" error={errors.bookingAmount?.message}>
            <input type="number" min={0} className={INPUT_CLS} {...register('bookingAmount', { valueAsNumber: true })} />
          </Field>
        </div>

        {bookingAmount > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Payment Mode" error={errors.paymentMode?.message}>
              <SearchableSelect
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'UPI', label: 'UPI' },
                ]}
                value={bookingPaymentMode || 'CASH'}
                onValueChange={(nextValue) => setValue('paymentMode', nextValue as BookFlatInput['paymentMode'], { shouldValidate: true })}
                placeholder="Select payment mode..."
                searchPlaceholder="Search mode..."
              />
            </Field>
            {bookingPaymentMode !== 'CASH' ? (
              <Field label={getBookingReferenceLabel(bookingPaymentMode)} error={errors.referenceNumber?.message}>
                <input className={INPUT_CLS} placeholder={getBookingReferenceLabel(bookingPaymentMode)} {...register('referenceNumber')} />
              </Field>
            ) : (
              <Field label="Reference Number">
                <div className="flex h-12 items-center border border-dashed border-border bg-muted px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Cash payment does not require a reference number.
                </div>
              </Field>
            )}
          </div>
        )}

        <div className="border border-border bg-muted/20 p-4">
          <div>
            <p className={LABEL_CLS}>Agreement Lines (Optional)</p>
            <p className="text-[10px] text-muted-foreground/60">
              Add charges, tax, discounts, or credits while booking so the customer agreement is ready upfront.
            </p>
          </div>

          {agreementLineFields.length === 0 ? (
            <p className="mt-4 text-[10px] text-muted-foreground/60">
              No additional agreement rows yet. Base price line is created automatically from selling price.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {agreementLineFields.map((line, index) => {
                const typePath = `agreementLines.${index}.type` as const;
                const labelPath = `agreementLines.${index}.label` as const;
                const amountPath = `agreementLines.${index}.amount` as const;
                const ratePercentPath = `agreementLines.${index}.ratePercent` as const;
                const calculationModePath = `agreementLines.${index}.calculationMode` as const;
                const notePath = `agreementLines.${index}.note` as const;
                const lineType = (watch(typePath) || 'CHARGE') as BookFlatAgreementLineInput['type'];
                const discountCalculationMode = (watch(calculationModePath) || 'FIXED_AMOUNT') as BookingAgreementCalculationMode;
                const ratePercent = Number(watch(ratePercentPath) || 0);
                const watchedLine = watch(`agreementLines.${index}` as const);
                const resolvedAmount = resolveBookingAgreementLineAmount({
                  type: lineType,
                  amount: Number(watchedLine?.amount ?? 0),
                  calculationMode: discountCalculationMode,
                  ratePercent: Number.isFinite(ratePercent) ? ratePercent : 0,
                }, sellingPrice);
                const shouldUsePercentage = lineType === 'TAX' || (lineType === 'DISCOUNT' && discountCalculationMode === 'PERCENTAGE');

                return (
                  <div key={line.id} className="border border-border bg-background p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className={LABEL_CLS}>Line {index + 1}</p>
                      <button
                        type="button"
                        data-navbtn="true"
                        onClick={() => removeAgreementLine(index)}
                        className="h-9 border border-border px-3 text-[9px] font-bold uppercase tracking-widest text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>

                    <input type="hidden" {...register(typePath)} />

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Line Type" error={errors.agreementLines?.[index]?.type?.message}>
                        <SearchableSelect
                          options={BOOKING_AGREEMENT_LINE_TYPES.map((type) => ({ value: type, label: type }))}
                          value={lineType}
                          onValueChange={(nextValue) => {
                            const nextType = nextValue as BookFlatAgreementLineInput['type'];
                            setValue(typePath, nextType, { shouldValidate: true });
                            if (nextType === 'TAX') {
                              setValue(calculationModePath, 'PERCENTAGE', { shouldValidate: true });
                              setValue(amountPath, 0, { shouldValidate: true });
                            } else if (nextType === 'DISCOUNT') {
                              setValue(calculationModePath, 'FIXED_AMOUNT', { shouldValidate: true });
                            } else {
                              setValue(calculationModePath, 'FIXED_AMOUNT', { shouldValidate: true });
                              setValue(ratePercentPath, undefined, { shouldValidate: true });
                            }
                          }}
                          placeholder="Select type..."
                          searchPlaceholder="Search type..."
                          autoFocus={index === agreementLineFields.length - 1} // Focus newly added line
                        />
                      </Field>

                      {lineType === 'DISCOUNT' ? (
                        <Field label="Discount Mode" error={errors.agreementLines?.[index]?.calculationMode?.message}>
                          <SearchableSelect
                            options={[
                              { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
                              { value: 'PERCENTAGE', label: 'Percentage (%)' },
                            ]}
                            value={discountCalculationMode}
                            onValueChange={(nextValue) => {
                              const nextMode = nextValue as BookingAgreementCalculationMode;
                              setValue(calculationModePath, nextMode, { shouldValidate: true });
                              if (nextMode === 'PERCENTAGE') {
                                setValue(amountPath, 0, { shouldValidate: true });
                              } else {
                                setValue(ratePercentPath, undefined, { shouldValidate: true });
                              }
                            }}
                            placeholder="Select mode..."
                            searchPlaceholder="Search mode..."
                          />
                        </Field>
                      ) : lineType === 'TAX' ? (
                        <Field label="Tax Basis">
                          <div className="flex h-12 items-center border border-dashed border-border bg-muted px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            Percentage of base price
                          </div>
                        </Field>
                      ) : (
                        <Field label="Amount (INR)" error={errors.agreementLines?.[index]?.amount?.message}>
                          <input
                            type="number"
                            min={0}
                            className={INPUT_CLS}
                            {...register(amountPath, { valueAsNumber: true })}
                          />
                        </Field>
                      )}
                    </div>

                    {shouldUsePercentage ? (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <Field
                          label={lineType === 'TAX' ? 'Tax Percentage (%)' : 'Discount Percentage (%)'}
                          error={errors.agreementLines?.[index]?.ratePercent?.message}
                        >
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={INPUT_CLS}
                            {...register(ratePercentPath, { setValueAs: parseOptionalNumber })}
                          />
                        </Field>
                        <Field label="Calculated Amount">
                          <div className="flex h-12 items-center border border-border bg-muted px-4 text-[11px] font-bold uppercase tracking-widest text-foreground">
                            {formatINR(resolvedAmount)}
                          </div>
                        </Field>
                      </div>
                    ) : lineType === 'DISCOUNT' ? (
                      <div className="mt-4">
                        <Field label="Discount Amount (INR)" error={errors.agreementLines?.[index]?.amount?.message}>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={INPUT_CLS}
                            {...register(amountPath, { valueAsNumber: true })}
                          />
                        </Field>
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <Field label="Line Label" error={errors.agreementLines?.[index]?.label?.message}>
                        <input
                          className={INPUT_CLS}
                          placeholder="e.g. GST, Parking Charge, Festival Discount"
                          {...register(labelPath)}
                        />
                      </Field>
                      <Field label="Note (optional)" error={errors.agreementLines?.[index]?.note?.message}>
                        <input
                          className={INPUT_CLS}
                          placeholder="Optional note for this line"
                          {...register(notePath)}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            data-navbtn="true"
            onClick={() => appendAgreementLine(createDefaultBookingAgreementLine())}
            className="mt-4 h-12 w-full border border-border px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            Add Agreement Line
          </button>
        </div>

        <div className="border border-border divide-y divide-border">
          <div className="flex justify-between items-center px-4 py-3">
            <span className={LABEL_CLS}>Selected Floor</span>
            <span className="text-sm font-bold uppercase tracking-widest">
              {selectedFloor 
                ? (selectedFloor.floorName || (selectedFloor.floorNumber === 0 ? 'Ground Floor' : `Floor ${selectedFloor.floorNumber}`))
                : getFloorLabel(floorNumber)}
            </span>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className={LABEL_CLS}>Remaining</span>
            <span className="text-lg font-serif text-primary">{formatINR(remaining)}</span>
          </div>
        </div>
      </form>
    </FormShell>
  );
}
function ActionConfirmForm({
  title,
  message,
  errorMessage,
  onConfirm,
  onBack,
  isPending,
  submitLabel = 'Confirm',
  destructive = false
}: {
  title: string;
  message: string;
  errorMessage?: string;
  onConfirm: () => void;
  onBack: () => void;
  isPending: boolean;
  submitLabel?: string;
  destructive?: boolean;
}) {
  return (
    <FormShell title={title} onBack={onBack} isPending={isPending} submitLabel={submitLabel} formId="confirm-form" destructive={destructive}>
      <div className="flex flex-col gap-4 py-4">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
          {message}
        </p>
        {errorMessage && <FormError msg={errorMessage} />}
      </div>
      <form id="confirm-form" onSubmit={(e) => { e.preventDefault(); onConfirm(); }} />
    </FormShell>
  );
}

function AddEmployeeForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useCreateEmployee({
    onSuccess: () => {
      reset();
      toast.success('Employee added');
      onSuccess();
    },
  });

  const { register, handleSubmit, reset, setFocus, formState: { errors } } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      designation: '',
      department: '',
      dateOfJoining: getTodayDateInputValue(),
      salary: 0,
      status: 'active',
    },
  });

  useEffect(() => {
    setTimeout(() => setFocus('name'), 50);
  }, [setFocus]);

  return (
    <FormShell title="Add Employee" onBack={onBack} isPending={isPending} submitLabel="Create Employee" formId="add-employee-form">
      <form id="add-employee-form" onSubmit={handleSubmit((values) => mutate({ ...values, dateOfJoining: toIsoDate(values.dateOfJoining) }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to create employee')} />}

        <div className="border border-border bg-muted/20 p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Employee ID is auto-generated on create.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Name" error={errors.name?.message}>
            <input placeholder="Enter employee name" className={INPUT_CLS} {...register('name')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input placeholder="+91 XXXXX XXXXX" className={INPUT_CLS} {...register('phone')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" error={errors.email?.message}>
            <input placeholder="employee@email.com" className={INPUT_CLS} {...register('email')} />
          </Field>
          <Field label="Designation" error={errors.designation?.message}>
            <input placeholder="e.g. Technician" className={INPUT_CLS} {...register('designation')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department" error={errors.department?.message}>
            <input placeholder="e.g. Operations" className={INPUT_CLS} {...register('department')} />
          </Field>
          <Field label="Date Of Joining" error={errors.dateOfJoining?.message}>
            <input type="date" className={INPUT_CLS} {...register('dateOfJoining')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Salary (INR)" error={errors.salary?.message}>
            <input type="number" min={0} step={0.01} className={INPUT_CLS} {...register('salary', { valueAsNumber: true })} />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <select className={INPUT_CLS} {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </Field>
        </div>

        <Field label="Address" error={errors.address?.message}>
          <input placeholder="Employee address" className={INPUT_CLS} {...register('address')} />
        </Field>
      </form>
    </FormShell>
  );
}

function EditEmployeeForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useUpdateEmployee({
    onSuccess: () => {
      toast.success('Employee updated');
      onSuccess();
    },
  });

  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: entity?.name ?? '',
      email: entity?.email ?? '',
      phone: entity?.phone ?? '',
      address: entity?.address ?? '',
      designation: entity?.designation ?? '',
      department: entity?.department ?? '',
      dateOfJoining: toDateInputValue(entity?.dateOfJoining),
      salary: entity?.salary ?? 0,
      status: entity?.status ?? 'active',
    },
  });

  useEffect(() => {
    setTimeout(() => setFocus('name'), 50);
  }, [setFocus]);

  return (
    <FormShell title={`Edit Employee: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Save Employee" formId="edit-employee-form">
      <form
        id="edit-employee-form"
        onSubmit={handleSubmit((values) => mutate({ id: entity.id, data: values as UpdateEmployeeInput }))}
        className="flex flex-col gap-6"
      >
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to update employee')} />}

        <div className="border border-border bg-muted/20 p-3">
          <p className={LABEL_CLS}>Employee ID</p>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest">{entity?.employeeId || '-'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Name" error={errors.name?.message}>
            <input className={INPUT_CLS} {...register('name')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input className={INPUT_CLS} {...register('phone')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" error={errors.email?.message}>
            <input className={INPUT_CLS} {...register('email')} />
          </Field>
          <Field label="Designation" error={errors.designation?.message}>
            <input className={INPUT_CLS} {...register('designation')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department" error={errors.department?.message}>
            <input className={INPUT_CLS} {...register('department')} />
          </Field>
          <Field label="Date Of Joining" error={errors.dateOfJoining?.message}>
            <input type="date" className={INPUT_CLS} {...register('dateOfJoining')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Salary (INR)" error={errors.salary?.message}>
            <input type="number" min={0} step={0.01} className={INPUT_CLS} {...register('salary', { valueAsNumber: true })} />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <select className={INPUT_CLS} {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </Field>
        </div>

        <Field label="Address" error={errors.address?.message}>
          <input className={INPUT_CLS} {...register('address')} />
        </Field>
      </form>
    </FormShell>
  );
}

function EmployeeDetailsForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const details = [
    { label: 'System ID', value: entity?.id || '-' },
    { label: 'Employee ID', value: entity?.employeeId || '-' },
    { label: 'Name', value: entity?.name || '-' },
    { label: 'Email', value: entity?.email || '-' },
    { label: 'Phone', value: entity?.phone || '-' },
    { label: 'Address', value: entity?.address || '-' },
    { label: 'Designation', value: entity?.designation || '-' },
    { label: 'Department', value: entity?.department || '-' },
    { label: 'Date Of Joining', value: formatShortDate(entity?.dateOfJoining) },
    { label: 'Salary', value: typeof entity?.salary === 'number' ? formatINR(entity.salary) : '-' },
    { label: 'Status', value: employeeStatusLabel(entity?.status) },
    { label: 'Photo URL', value: entity?.photo || '-' },
    { label: 'Created At', value: formatShortDate(entity?.createdAt) },
    { label: 'Updated At', value: formatShortDate(entity?.updatedAt) },
  ];

  return (
    <FormShell title={`Employee Details: ${entity?.name}`} onBack={onBack} isPending={false} submitLabel="Done" formId="view-employee-details-form">
      <form
        id="view-employee-details-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSuccess();
        }}
        className="flex flex-col gap-3"
      >
        <div className="border border-border bg-muted/20 divide-y divide-border/70">
          {details.map((item) => (
            <div key={item.label} className="grid grid-cols-[10rem_minmax(0,1fr)] gap-3 px-4 py-3">
              <p className={LABEL_CLS}>{item.label}</p>
              <p className="text-[11px] font-bold tracking-wide break-all">{item.value}</p>
            </div>
          ))}
        </div>
      </form>
    </FormShell>
  );
}

const markEmployeeAttendanceSchema = z.object({
  date: z.string().trim().min(1, 'Date is required'),
  status: z.enum(['present', 'absent', 'half_day']),
  checkInTime: z.string().trim().optional(),
  checkOutTime: z.string().trim().optional(),
  reasonOfAbsenteeism: z.string().trim().optional(),
});

type MarkEmployeeAttendanceInput = z.infer<typeof markEmployeeAttendanceSchema>;



function MarkEmployeeAttendanceForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useMarkAttendance({
    onSuccess: () => {
      toast.success('Attendance recorded');
      onSuccess();
    },
  });

  const { register, handleSubmit, watch, setFocus, setValue, formState: { errors } } = useForm<MarkEmployeeAttendanceInput>({
    resolver: zodResolver(markEmployeeAttendanceSchema),
    defaultValues: {
      date: getTodayDateInputValue(),
      status: 'present',
      checkInTime: '',
      checkOutTime: '',
      reasonOfAbsenteeism: '',
    },
  });

  const status = watch('status') as AttendanceStatus;

  useEffect(() => {
    setTimeout(() => setFocus('date'), 50);
  }, [setFocus]);

  return (
    <FormShell title={`Take Attendance: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Mark Attendance" formId="mark-attendance-form">
      <form
        id="mark-attendance-form"
        onSubmit={handleSubmit((data) => {
          mutate({
            employeeId: entity.id,
            date: toIsoDate(data.date),
            status: data.status,
            checkInTime: toIsoDateTime(data.date, data.checkInTime),
            checkOutTime: toIsoDateTime(data.date, data.checkOutTime),
            reasonOfAbsenteeism: data.reasonOfAbsenteeism || undefined,
          });
        })}
        className="flex flex-col gap-6"
      >
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to mark attendance')} />}

        <div className="border border-border bg-muted/20 p-3">
          <p className={LABEL_CLS}>Employee</p>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest">{entity?.name}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{entity?.employeeId}</p>
        </div>

        <Field label="Attendance Date" error={errors.date?.message}>
          <input type="date" className={INPUT_CLS} {...register('date')} />
        </Field>

        <input type="hidden" {...register('status')} />
        <Field label="Status" error={errors.status?.message}>
          <KeyToggle
            options={['present', 'absent', 'half_day']}
            value={status}
            onChange={(value) => {
              setValue('status', value as AttendanceStatus, { shouldValidate: true });
            }}
            renderOption={(option, selected) => (
              <div className={cn(
                'border px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all text-center',
                selected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/30',
              )}>
                {option === 'present' ? 'Present' : option === 'absent' ? 'Absent' : 'Half Day'}
              </div>
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Check-In Time">
            <input type="time" className={INPUT_CLS} {...register('checkInTime')} />
          </Field>
          <Field label="Check-Out Time">
            <input type="time" className={INPUT_CLS} {...register('checkOutTime')} />
          </Field>
        </div>

        <Field label="Reason (optional)">
          <input
            placeholder="Reason for absence / remark"
            className={INPUT_CLS}
            {...register('reasonOfAbsenteeism')}
          />
        </Field>
      </form>
    </FormShell>
  );
}

function PaySalaryForm({ entity, onSuccess, onBack }: { entity: any; onSuccess: () => void; onBack: () => void }) {
  const { data: companyData } = useCompany();
  const availableFund: number = (companyData?.data as { available_fund?: number } | undefined)?.available_fund ?? 0;

  const now = new Date();
  const { mutate, isPending, error } = usePaySalary({
    onSuccess: () => {
      toast.success(`Salary paid to ${entity?.name}`);
      onSuccess();
    },
  });

  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<PaySalaryInput>({
    resolver: zodResolver(paySalarySchema),
    defaultValues: {
      amount: entity?.salary ?? 0,
      paymentMethod: 'cash',
      note: '',
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  });

  useEffect(() => {
    setTimeout(() => setFocus('amount'), 50);
  }, [setFocus]);

  return (
    <FormShell title={`Pay Salary: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Pay Salary" formId="pay-salary-form">
      <form
        id="pay-salary-form"
        onSubmit={handleSubmit((values) => mutate({ id: entity.id, data: values }))}
        className="flex flex-col gap-6"
      >
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to process salary payment')} />}

        <div className="border border-border bg-muted/20 p-3 space-y-1">
          <p className={LABEL_CLS}>Employee</p>
          <p className="text-sm font-bold uppercase tracking-widest">{entity?.name}</p>
          <p className="text-[10px] text-muted-foreground">{entity?.employeeId} - Monthly Salary: {formatINR(entity?.salary ?? 0)}</p>
        </div>

        <div className="border border-border bg-amber-500/5 p-3">
          <p className={LABEL_CLS}>Company Available Fund</p>
          <p className={`mt-1 text-base font-bold tracking-widest ${availableFund > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatINR(availableFund)}
          </p>
        </div>

        <Field label="Amount (INR)" error={errors.amount?.message}>
          <input
            type="number"
            min={0}
            step={0.01}
            className={INPUT_CLS}
            {...register('amount', { valueAsNumber: true })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Month" error={errors.month?.message}>
            <select className={INPUT_CLS} {...register('month', { valueAsNumber: true })}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
          </Field>
          <Field label="Year" error={errors.year?.message}>
            <input
              type="number"
              min={2000}
              max={2100}
              className={INPUT_CLS}
              {...register('year', { valueAsNumber: true })}
            />
          </Field>
        </div>

        <Field label="Payment Method">
          <select className={INPUT_CLS} {...register('paymentMethod')}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </Field>

        <Field label="Note (optional)">
          <input
            placeholder="Optional note"
            className={INPUT_CLS}
            {...register('note')}
          />
        </Field>
      </form>
    </FormShell>
  );
}

export default function CommandCenter() {
  const [phase, setPhase] = useState<Phase>('categories');
  const [catIdx, setCatIdx] = useState(0);
  const [actIdx, setActIdx] = useState(0);
  const [selIdx, setSelIdx] = useState(0);
  const [subSelIdx, setSubSelIdx] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedSubEntity, setSelectedSubEntity] = useState<any | null>(null);
  const [focusedFloorNumber, setFocusedFloorNumber] = useState<number | null>(null);
  const [focusedWingId, setFocusedWingId] = useState<string | null>(null);
  const [focusedVendorId, setFocusedVendorId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = CATEGORIES[catIdx];
  const actions = selectedCategory?.actions ?? [];

  // Data fetching
  const { data: ssData, isLoading: ssLoading } = useSites({
    showArchived: selectedAction === 'archive-site' ? 'true' : undefined,
    enabled: phase === 'selector' && (selectedCategory?.id === 'sites' || selectedAction === 'record-payment')
  });
  const { data: coData, isLoading: coLoading } = useCompany();
  const { data: inData, isLoading: inLoading } = useInvestors(undefined, undefined);
  const { data: veData, isLoading: veLoading } = useVendors();
  const { data: cuData, isLoading: cuLoading } = useAllCustomers();
  const { data: emData, isLoading: emLoading } = useEmployees();
  const { data: siteCustomersData, isLoading: siteCustomersLoading } = useSiteCustomers(
    phase === 'sub-selector' && selectedAction === 'record-payment' && selectedEntity?.id ? selectedEntity.id : ''
  );

  const { mutate: toggleSiteMutate, isPending: isToggleSitePending } = useToggleSite();
  const { mutate: deleteSiteMutate, isPending: isDeleteSitePending, error: deleteSiteError } = useDeleteSite();
  const { mutate: deletePartnerMutate, isPending: isDeletePartnerPending } = useDeletePartner();
  const { mutate: deleteInvestorMutate, isPending: isDeleteInvestorPending } = useDeleteInvestor();
  const { mutate: deleteVendorMutate, isPending: isDeleteVendorPending } = useDeleteVendor();
  const { mutate: deleteEmployeeMutate, isPending: isDeleteEmployeePending } = useDeleteEmployee();

  const selectorItems = useMemo((): any[] => {
    if (!selectedCategory) return [];
    if (selectedAction === 'record-payment') return ssData?.data?.sites ?? [];
    if (selectedCategory.id === 'sites') return ssData?.data?.sites ?? [];
    if (selectedCategory.id === 'company') return coData?.data?.partners ?? [];
    if (selectedCategory.id === 'investors') return inData?.data?.investors ?? [];
    if (selectedCategory.id === 'vendors') return veData?.data?.vendors ?? [];
    if (selectedCategory.id === 'customers') return cuData?.data?.customers ?? [];
    if (selectedCategory.id === 'employees') return emData?.data?.employees ?? [];
    return [];
  }, [
    coData?.data?.partners,
    cuData?.data?.customers,
    emData?.data?.employees,
    inData?.data?.investors,
    selectedAction,
    selectedCategory,
    ssData?.data?.sites,
    veData?.data?.vendors,
  ]);

  const subSelectorItems = useMemo((): any[] => {
    if (selectedAction === 'record-payment') return siteCustomersData?.data?.customers ?? [];
    return [];
  }, [selectedAction, siteCustomersData?.data?.customers]);

  const selectorLoading = useMemo(() => {
    if (phase !== 'selector' && phase !== 'sub-selector') return false;
    
    // Site selectors for specific actions
    if (selectedAction && ACTIONS_USING_SITE_SELECTOR.includes(selectedAction)) {
      return ssLoading;
    }
    
    // Category-based selectors
    if (selectedCategory?.id === 'sites') return ssLoading;
    if (selectedCategory?.id === 'customers') return cuLoading;
    if (selectedCategory?.id === 'employees') return emLoading;
    if (selectedCategory?.id === 'investors') return inLoading;
    if (selectedCategory?.id === 'vendors') return veLoading;
    if (selectedCategory?.id === 'company') return coLoading;

    return ssLoading || cuLoading || emLoading || inLoading || veLoading || coLoading;
  }, [phase, selectedCategory?.id, selectedAction, ssLoading, cuLoading, emLoading, inLoading, veLoading, coLoading]);

  const isSiteSelectorPhase = phase === 'selector' && !!selectedAction && ACTIONS_USING_SITE_SELECTOR.includes(selectedAction);
  const contextSite = isSiteSelectorPhase || phase === 'sub-selector' || phase === 'form' ? selectedEntity : null;

  // ──── Keyboard Navigation ────────────────────────────────────────────────

  const handleEscape = useCallback(() => {
    if (phase === 'form') {
      handleFormBack();
    } else if (phase === 'sub-selector') {
      setPhase('selector');
    } else if (phase === 'selector') {
      setPhase('actions');
    } else if (phase === 'actions') {
      setPhase('categories');
      setSelectedAction(null);
    }
  }, [phase, selectedAction]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Global Escape handling - always try to go back if possible
    if (e.key === 'Escape') {
      if (phase === 'form') {
        e.preventDefault();
        handleFormBack();
        return;
      }
      if (phase === 'sub-selector') {
        e.preventDefault();
        setPhase('selector');
        return;
      }
      if (phase === 'selector') {
        e.preventDefault();
        setPhase('actions');
        return;
      }
      if (phase === 'actions') {
        e.preventDefault();
        setPhase('categories');
        setSelectedAction(null);
        return;
      }
      if (phase === 'categories') {
        // Maybe close command center if it was a modal, but here it's the page
        return;
      }
    }

    if (phase === 'categories' && !isInput) {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setCatIdx((i) => Math.min(i + 1, CATEGORIES.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setCatIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setPhase('actions');
        setActIdx(0);
      } else {
        const shortcutNumber = getShortcutNumber(e);
        const idx = shortcutNumber !== null ? shortcutNumber - 1 : -1;
        if (idx >= 0 && idx < CATEGORIES.length) {
          setCatIdx(idx);
          setPhase('actions');
          setActIdx(0);
        }
      }
    } else if (phase === 'actions' && !isInput) {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setActIdx((i) => Math.min(i + 1, actions.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setActIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const actionId = actions[actIdx].id;
        setSelectedAction(actionId);
        setSelectedEntity(null);
        setSelectedSubEntity(null);
        if (ACTIONS_NEEDING_SELECTOR.includes(actionId)) {
          setPhase('selector');
          setSelIdx(0);
        } else {
          setPhase('form');
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setPhase('categories');
      } else {
        const shortcutNumber = getShortcutNumber(e);
        if (shortcutNumber !== null && shortcutNumber >= 1 && shortcutNumber <= actions.length) {
          const actionId = actions[shortcutNumber - 1].id;
          setActIdx(shortcutNumber - 1);
          setSelectedAction(actionId);
          setSelectedEntity(null);
          setSelectedSubEntity(null);
          if (ACTIONS_NEEDING_SELECTOR.includes(actionId)) {
            setPhase('selector');
            setSelIdx(0);
          } else {
            setPhase('form');
          }
        }
      }
    } else if (phase === 'selector' && !isInput) {
      // Entity selector list nav
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelIdx((i) => Math.min(i + 1, selectorItems.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const entity = selectorItems[selIdx];
        if (entity) {
          setSelectedEntity(entity);
          if (selectedAction && ACTIONS_NEEDING_SUB_SELECTOR.includes(selectedAction)) {
            setPhase('sub-selector');
            setSubSelIdx(0);
          } else {
            setPhase('form');
          }
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setPhase('actions');
      }
    } else if (phase === 'sub-selector' && !isInput) {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSubSelIdx((i) => Math.min(i + 1, subSelectorItems.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSubSelIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const entity = subSelectorItems[subSelIdx];
        if (entity) {
          setSelectedSubEntity(entity);
          setPhase('form');
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setPhase('selector');
      }
    } else if (phase === 'form') {
      if (e.key === 'Escape') {
        // If we're in an input, just blur it first
        if (isInput) {
          (e.target as HTMLElement).blur();
        } else {
          if (selectedAction && ACTIONS_NEEDING_SUB_SELECTOR.includes(selectedAction)) {
            setPhase('sub-selector');
            setSelectedSubEntity(null);
          } else if (selectedAction && ACTIONS_NEEDING_SELECTOR.includes(selectedAction)) {
            setPhase('selector');
            setSelectedEntity(null);
            setSelectedSubEntity(null);
          } else {
            setPhase('actions');
            setSelectedAction(null);
            setSelectedEntity(null);
            setSelectedSubEntity(null);
          }
        }
      }
    }
  }, [phase, catIdx, actions, actIdx, selIdx, subSelIdx, selectedAction, selectorItems, subSelectorItems]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (selectedAction !== 'book-flat') {
      setFocusedFloorNumber(null);
    }
  }, [selectedAction]);

  // Focus container on phase change so keyboard works
  useEffect(() => {
    const isSiteSelector = phase === 'selector' && selectedAction && ACTIONS_USING_SITE_SELECTOR.includes(selectedAction);
    const isDropdownEntitySelector = phase === 'selector' && (selectedCategory?.id === 'investors' || selectedCategory?.id === 'vendors' || selectedCategory?.id === 'customers');
    if (phase !== 'form' && !isSiteSelector && !isDropdownEntitySelector) {
      containerRef.current?.focus();
    }
  }, [phase, selectedAction, selectedCategory?.id]);

  const handleFormSuccess = () => {
    setPhase('categories');
    setSelectedAction(null);
    setSelectedEntity(null);
    setSelectedSubEntity(null);
    setFocusedFloorNumber(null);
    setFocusedVendorId(null);
    setCatIdx(0);
  };

  const handleFormBack = () => {
    if (selectedAction && ACTIONS_NEEDING_SUB_SELECTOR.includes(selectedAction)) {
      setPhase('sub-selector');
      setSelectedSubEntity(null);
    } else if (selectedAction && ACTIONS_NEEDING_SELECTOR.includes(selectedAction)) {
      setPhase('selector');
      setSelectedEntity(null);
      setSelectedSubEntity(null);
      setFocusedFloorNumber(null);
      setFocusedVendorId(null);
    } else {
      setPhase('actions');
      setSelectedAction(null);
      setSelectedEntity(null);
      setSelectedSubEntity(null);
      setFocusedFloorNumber(null);
      setFocusedVendorId(null);
    }
  };

  // â”€â”€ Render Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function renderForm() {
    const props = { onSuccess: handleFormSuccess, onBack: handleFormBack };

    // Actions
    if (selectedAction === 'book-flat') {
      return (
        <BookFlatForm 
          {...props} 
          site={selectedEntity} 
          onFloorChange={setFocusedFloorNumber} 
          onWingChange={setFocusedWingId}
        />
      );
    }

    if (selectedAction === 'add-site-expense') {
      return <AddSiteExpenseForm {...props} site={selectedEntity} onVendorChange={setFocusedVendorId} />;
    }

    if (selectedAction === 'manage-funds') {
      return <ManageFundsForm {...props} site={selectedEntity} />;
    }

    // Site Actions Confirmations
    if (selectedAction === 'archive-site') {
      const isRestoringSite = selectedEntity?.isActive === false;
      const actionLabel = isRestoringSite ? 'Restore Site' : 'Archive Site';
      return (
        <ActionConfirmForm
          {...props}
          title={actionLabel}
          message={
            isRestoringSite
              ? `Restore "${selectedEntity?.name}"? It will appear again in the active site list and normal site selectors.`
              : `Archive "${selectedEntity?.name}"? It will be hidden from normal site lists, but its records and history will remain available.`
          }
          submitLabel={actionLabel}
          isPending={isToggleSitePending}
          onConfirm={() => toggleSiteMutate(selectedEntity.id, { onSuccess: () => { toast.success(isRestoringSite ? 'Site restored' : 'Site archived'); handleFormSuccess(); } })}
        />
      );
    }

    if (selectedAction === 'delete-site') {
      return (
        <ActionConfirmForm
          {...props}
          title="Delete Site"
          message={`Delete "${selectedEntity?.name}" only if it has no financial or operational history. Once any real activity exists, archive it instead.`}
          errorMessage={deleteSiteError ? getApiErrorMessage(deleteSiteError, 'Unable to delete this site.') : undefined}
          submitLabel="Delete Site"
          destructive
          isPending={isDeleteSitePending}
          onConfirm={() => deleteSiteMutate({ id: selectedEntity.id }, { onSuccess: () => { toast.success('Site deleted'); handleFormSuccess(); } })}
        />
      );
    }

    // Partner/Investor/Vendor Deletions
    if (selectedAction === 'delete-partner') {
      return (
        <ActionConfirmForm
          {...props}
          title="Delete Partner"
          message={`Remove "${selectedEntity?.name}" from company partners?`}
          submitLabel="Delete Partner"
          destructive
          isPending={isDeletePartnerPending}
          onConfirm={() => deletePartnerMutate(selectedEntity.id, { onSuccess: () => { toast.success('Partner removed'); handleFormSuccess(); } })}
        />
      );
    }

    if (selectedAction === 'delete-investor') {
      return (
        <ActionConfirmForm
          {...props}
          title="Delete Investor"
          message={`Remove "${selectedEntity?.name}" from investors list?`}
          submitLabel="Delete Investor"
          destructive
          isPending={isDeleteInvestorPending}
          onConfirm={() => deleteInvestorMutate(selectedEntity.id, { onSuccess: () => { toast.success('Investor deleted'); handleFormSuccess(); } })}
        />
      );
    }

    if (selectedAction === 'delete-vendor') {
      return (
        <ActionConfirmForm
          {...props}
          title="Delete Vendor"
          message={`Remove "${selectedEntity?.name}" from vendors list?`}
          submitLabel="Delete Vendor"
          destructive
          isPending={isDeleteVendorPending}
          onConfirm={() => deleteVendorMutate(selectedEntity.id, { onSuccess: () => { toast.success('Vendor deleted'); handleFormSuccess(); } })}
        />
      );
    }

    if (selectedAction === 'delete-employee') {
      return (
        <ActionConfirmForm
          {...props}
          title="Delete Employee"
          message={`Remove "${selectedEntity?.name}" from employee records?`}
          submitLabel="Delete Employee"
          destructive
          isPending={isDeleteEmployeePending}
          onConfirm={() => deleteEmployeeMutate(selectedEntity.id, { onSuccess: () => { toast.success('Employee deleted'); handleFormSuccess(); } })}
        />
      );
    }

    switch (selectedAction) {
      case 'create-site': return <CreateSiteForm {...props} />;
      case 'edit-partner': return <EditPartnerForm {...props} entity={selectedEntity} />;
      case 'add-partner': return <AddPartnerForm {...props} />;
      case 'edit-company': return <EditCompanyForm {...props} />;
      case 'withdraw-fund': return <WithdrawFundForm {...props} />;
      case 'add-investor': return <AddInvestorForm {...props} />;
      case 'edit-investor': return <EditInvestorForm {...props} entity={selectedEntity} />;
      case 'add-vendor': return <AddVendorForm {...props} />;
      case 'edit-vendor': return <EditVendorForm {...props} entity={selectedEntity} />;
      case 'edit-customer': return <EditCustomerForm {...props} entity={selectedEntity} />;
      case 'record-payment': return <RecordPaymentForm {...props} entity={selectedSubEntity} />;
      case 'cancel-deal': return <CancelDealForm {...props} entity={selectedEntity} />;
      case 'add-employee': return <AddEmployeeForm {...props} />;
      case 'view-employee-details': return <EmployeeDetailsForm {...props} entity={selectedEntity} />;
      case 'edit-employee': return <EditEmployeeForm {...props} entity={selectedEntity} />;
      case 'mark-employee-attendance': return <MarkEmployeeAttendanceForm {...props} entity={selectedEntity} />;
      case 'pay-salary': return <PaySalaryForm {...props} entity={selectedEntity} />;
      default: return null;
    }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <DashboardShell>
      <div
        ref={containerRef}
        tabIndex={-1}
        className="flex w-full flex-col items-start outline-none animate-in fade-in duration-500"
      >
        {/* Title bar */}
        <div className="mb-6 flex flex-col items-start gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
            {phase === 'categories' && 'Select a category'}
            {phase === 'actions' && `${selectedCategory.label} - select an action`}
            {phase === 'selector' && (selectedAction === 'record-payment' ? 'Select Site' : `Select ${selectedCategory.label.slice(0, -1)}`)}
            {phase === 'sub-selector' && 'Select Customer'}
            {phase === 'form' && 'Fill in the details below'}
          </p>
        </div>

        {/* Content area */}
        <div className="grid w-full gap-8 xl:grid-cols-[minmax(0,44rem)_minmax(0,1fr)]">
          <div className="w-full max-w-2xl">

          {/* â”€â”€ Phase: Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {phase === 'categories' && (
            <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
              <KeyList
                items={CATEGORIES}
                focusIndex={catIdx}
                onSelect={(i) => { setCatIdx(i); setPhase('actions'); setActIdx(0); }}
                renderItem={(cat, i, focused) => (
                  <div className={cn(
                    'flex items-center gap-4 border px-5 py-4 transition-all',
                    focused
                      ? `${cat.border} ${cat.bg} shadow-sm`
                      : 'border-border hover:bg-muted/30',
                  )}>
                    <span className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center text-[11px] font-bold transition-colors',
                      focused ? `${cat.bg} ${cat.color}` : 'bg-muted text-muted-foreground',
                    )}>
                      {cat.shortcut}
                    </span>
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center transition-colors',
                      focused ? cat.color : 'text-muted-foreground/50',
                    )}>
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-sm font-bold uppercase tracking-widest transition-colors',
                        focused ? 'text-foreground' : 'text-muted-foreground',
                      )}>
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {cat.actions.length} action{cat.actions.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    {focused && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary animate-in fade-in duration-200">
                        Enter
                      </span>
                    )}
                  </div>
                )}
              />

              {/* Footer hints */}
              <div className="mt-4 flex items-center justify-center gap-6 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
                <span>Up/Down Navigate</span>
                <span>Enter Select</span>
                <span>1-{CATEGORIES.length} Jump</span>
              </div>
            </div>
          )}

          {/* â”€â”€ Phase: Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {phase === 'actions' && (
            <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-right-2 duration-300">
              {/* Back to categories */}
              <button
                onClick={() => setPhase('categories')}
                className="flex items-center gap-2 self-start mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group"
              >
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span className={cn('flex h-6 w-6 items-center justify-center', selectedCategory.bg, selectedCategory.color)}>
                  <selectedCategory.icon className="h-3 w-3" />
                </span>
                {selectedCategory.label}
              </button>

              <KeyList
                items={actions}
                focusIndex={actIdx}
                onSelect={(i) => {
                  const actionId = actions[i].id;
                  setActIdx(i);
                  setSelectedAction(actionId);
                  setSelectedEntity(null);
                  setSelectedSubEntity(null);
                  if (ACTIONS_NEEDING_SELECTOR.includes(actionId)) {
                    setPhase('selector');
                    setSelIdx(0);
                  } else {
                    setPhase('form');
                  }
                }}
                renderItem={(act, i, focused) => (
                  <div className={cn(
                    'flex items-center gap-4 border px-5 py-4 transition-all',
                    focused
                      ? `${selectedCategory.border} ${selectedCategory.bg} shadow-sm`
                      : 'border-border hover:bg-muted/30',
                  )}>
                    <span className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center text-[11px] font-bold transition-colors',
                      focused ? `${selectedCategory.bg} ${selectedCategory.color}` : 'bg-muted text-muted-foreground',
                    )}>
                      {act.shortcut}
                    </span>
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center transition-colors',
                      focused ? selectedCategory.color : 'text-muted-foreground/50',
                    )}>
                      <act.icon className="h-5 w-5" />
                    </div>
                    <p className={cn(
                      'flex-1 text-sm font-bold uppercase tracking-widest transition-colors',
                      focused ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {act.label}
                    </p>
                    {focused && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary animate-in fade-in duration-200">
                        Enter
                      </span>
                    )}
                  </div>
                )}
              />

              <div className="mt-4 flex items-center justify-center gap-6 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
                <span>Up/Down Navigate</span>
                <span>Enter Select</span>
                <span>Esc Back</span>
              </div>
            </div>
          )}

          {/* â”€â”€ Phase: Selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {phase === 'selector' && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              {isSiteSelectorPhase ? (
                <SiteQuickPickerSelector
                  sites={selectorItems}
                  loading={selectorLoading}
                  title={selectedAction === 'record-payment' ? 'Select Site for Customer Payment' : 'Select Site'}
                  onBack={() => setPhase('actions')}
                  onSelect={(entity) => {
                    setSelectedEntity(entity);
                    if (selectedAction && ACTIONS_NEEDING_SUB_SELECTOR.includes(selectedAction)) {
                      setPhase('sub-selector');
                      setSubSelIdx(0);
                    } else {
                      setPhase('form');
                    }
                  }}
                />
              ) : (
                <EntitySelector
                  category={selectedCategory}
                  action={selectedAction!}
                  focusIndex={selIdx}
                  items={selectorItems}
                  loading={selectorLoading}
                  title={
                    selectedAction === 'record-payment'
                      ? 'Select Site for Customer Payment'
                      : selectedCategory.id === 'investors'
                        ? 'Select Investor'
                        : selectedCategory.id === 'vendors'
                          ? 'Select Vendor'
                          : selectedCategory.id === 'customers'
                            ? 'Select Customer'
                          : undefined
                  }
                  onBack={() => setPhase('actions')}
                  onSelect={(entity) => {
                    setSelectedEntity(entity);
                    if (selectedCategory.id === 'vendors') {
                      setFocusedVendorId(entity.id ?? null);
                    }
                    if (selectedAction && ACTIONS_NEEDING_SUB_SELECTOR.includes(selectedAction)) {
                      setPhase('sub-selector');
                      setSubSelIdx(0);
                    } else {
                      setPhase('form');
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Phase: Sub-Selector Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {phase === 'sub-selector' && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <EntitySelector
                category={selectedCategory}
                action={selectedAction!}
                focusIndex={subSelIdx}
                items={subSelectorItems}
                loading={siteCustomersLoading}
                title={`Select Customer in ${selectedEntity?.name}`}
                onBack={() => setPhase('selector')}
                onSelect={(entity) => {
                  setSelectedSubEntity(entity);
                  setPhase('form');
                }}
              />
            </div>
          )}

          {/* â”€â”€ Phase: Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {phase === 'form' && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              {renderForm()}
            </div>
          )}
          </div>

          <ContextInsightPanel
            action={selectedAction}
            site={contextSite}
            customer={selectedSubEntity}
            focusedFloorNumber={focusedFloorNumber}
            focusedWingId={focusedWingId}
            focusedVendorId={focusedVendorId}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
















