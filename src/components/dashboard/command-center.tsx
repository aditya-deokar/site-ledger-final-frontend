'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, Users, TrendingUp, Wrench, Pencil, Hammer,
  ChevronLeft, ArrowUpRight, UserPlus, Building, Loader2, Contact2, IndianRupee, BriefcaseBusiness, CalendarDays, Eye, Trash2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useCreateSite, useToggleSite, useDeleteSite, useBookFlat, useFloors, useCreateFloor, useCreateFlat, useUpdateFlatDetails, useAddExpense, useSites } from '@/hooks/api/site.hooks';
import { useAddPartner, useUpdatePartner, useDeletePartner, useUpdateCompany, useWithdrawFund, useCompany } from '@/hooks/api/company.hooks';
import { useCreateInvestor, useUpdateInvestor, useDeleteInvestor, useInvestors } from '@/hooks/api/investor.hooks';
import { useCreateVendor, useUpdateVendor, useDeleteVendor, useVendors } from '@/hooks/api/vendor.hooks';
import { useAllCustomers, useSiteCustomers, useUpdateCustomer, useRecordCustomerPayment, useCancelDeal } from '@/hooks/api/customer.hooks';
import { useCreateEmployee, useDeleteEmployee, useEmployees, useUpdateEmployee } from '@/hooks/api/employee.hooks';
import { useMarkAttendance } from '@/hooks/api/attendance.hooks';
import { createSiteSchema, CreateSiteInput, bookFlatSchema, Floor, Flat, createExpenseSchema, CreateExpenseInput } from '@/schemas/site.schema';
import { partnerInputSchema, PartnerInput } from '@/schemas/company.schema';
import { createInvestorSchema, CreateInvestorInput, updateInvestorSchema, UpdateInvestorInput } from '@/schemas/investor.schema';
import { createVendorSchema, CreateVendorInput, updateVendorSchema, UpdateVendorInput } from '@/schemas/vendor.schema';
import { updateCustomerSchema, UpdateCustomerInput, recordPaymentSchema, cancelDealSchema } from '@/schemas/customer.schema';
import { createEmployeeSchema, CreateEmployeeInput, UpdateEmployeeInput } from '@/schemas/employee.schema';
import type { AttendanceStatus } from '@/schemas/attendance.schema';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

// â”€â”€â”€ Data Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ActionDef {
  id: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

interface CategoryDef {
  id: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  actions: ActionDef[];
}

interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'sites', label: 'Sites', shortcut: '1', icon: Building2,
    color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
    actions: [
      { id: 'create-site', label: 'Create New Site', shortcut: '1', icon: Building2 },
      { id: 'book-flat', label: 'Book Flat', shortcut: '2', icon: UserPlus },
      { id: 'add-site-expense', label: 'Add Site Expense', shortcut: '3', icon: IndianRupee },
      { id: 'archive-site', label: 'Archive/Restore Site', shortcut: '4', icon: Pencil },
      { id: 'delete-site', label: 'Delete Site', shortcut: '5', icon: Hammer },
    ],
  },
  {
    id: 'company', label: 'Company', shortcut: '2', icon: Users,
    color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30',
    actions: [
      { id: 'add-partner', label: 'Add Partner', shortcut: '1', icon: UserPlus },
      { id: 'edit-partner', label: 'Edit Partner', shortcut: '2', icon: Pencil },
      { id: 'delete-partner', label: 'Delete Partner', shortcut: '3', icon: Hammer },
      { id: 'edit-company', label: 'Edit Company Details', shortcut: '4', icon: Building },
      { id: 'withdraw-fund', label: 'Withdraw Fund', shortcut: '5', icon: ArrowUpRight },
    ],
  },
  {
    id: 'investors', label: 'Investors', shortcut: '3', icon: TrendingUp,
    color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
    actions: [
      { id: 'add-investor', label: 'Add Investor', shortcut: '1', icon: TrendingUp },
      { id: 'edit-investor', label: 'Edit Investor', shortcut: '2', icon: Pencil },
      { id: 'delete-investor', label: 'Delete Investor', shortcut: '3', icon: Hammer },
    ],
  },
  {
    id: 'vendors', label: 'Vendors', shortcut: '4', icon: Wrench,
    color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
    actions: [
      { id: 'add-vendor', label: 'Add Vendor', shortcut: '1', icon: Wrench },
      { id: 'edit-vendor', label: 'Edit Vendor', shortcut: '2', icon: Pencil },
      { id: 'delete-vendor', label: 'Delete Vendor', shortcut: '3', icon: Hammer },
    ],
  },
  {
    id: 'customers', label: 'Customers', shortcut: '5', icon: Contact2,
    color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30',
    actions: [
      { id: 'edit-customer', label: 'Edit Customer', shortcut: '1', icon: Pencil },
      { id: 'record-payment', label: 'Record Payment', shortcut: '2', icon: IndianRupee },
      { id: 'cancel-deal', label: 'Cancel Deal', shortcut: '3', icon: Hammer },
    ],
  },
  {
    id: 'employees', label: 'Employees', shortcut: '6', icon: BriefcaseBusiness,
    color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30',
    actions: [
      { id: 'add-employee', label: 'Add Employee', shortcut: '1', icon: UserPlus },
      { id: 'view-employee-details', label: 'View Employee Details', shortcut: '2', icon: Eye },
      { id: 'edit-employee', label: 'Edit Employee', shortcut: '3', icon: Pencil },
      { id: 'delete-employee', label: 'Delete Employee', shortcut: '4', icon: Trash2 },
      { id: 'mark-employee-attendance', label: 'Take Attendance', shortcut: '5', icon: CalendarDays },
    ],
  },
];

const ACTIONS_NEEDING_SELECTOR = [
  'book-flat', 'add-site-expense', 'archive-site', 'delete-site',
  'edit-partner', 'delete-partner',
  'edit-investor', 'delete-investor',
  'edit-vendor', 'delete-vendor',
  'edit-customer', 'record-payment', 'cancel-deal',
  'view-employee-details', 'edit-employee', 'delete-employee',
  'mark-employee-attendance'
];

const ACTIONS_NEEDING_SUB_SELECTOR = ['record-payment'];
const ACTIONS_USING_SITE_SELECTOR = ['book-flat', 'add-site-expense', 'archive-site', 'delete-site', 'record-payment'];
const COMMON_UNIT_TYPES = ['1RK', '1BHK', '2BHK', '2.5BHK', '3BHK', '4BHK', 'DUPLEX', 'PENTHOUSE'] as const;
const UNIT_TYPE_PICK_OPTIONS = [...COMMON_UNIT_TYPES, 'CUSTOM'] as const;
const COMMON_VENDOR_CATEGORIES = ['MATERIALS', 'LABOR', 'CONTRACTOR', 'TRANSPORT', 'ELECTRICAL', 'PLUMBING', 'MASONRY', 'CARPENTRY'] as const;


// â”€â”€â”€ Shared Styling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const INPUT_CLS = 'h-12 w-full bg-muted border-2 border-transparent rounded-none px-4 text-sm font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';
const LABEL_CLS = 'text-[10px] font-bold uppercase tracking-widest text-foreground/40';
const ERROR_CLS = 'text-[10px] text-destructive mt-1';

function formatINR(n: number) { return 'INR ' + n.toLocaleString('en-IN'); }

function getTodayDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseOptionalPositiveInteger(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const nextValue = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(nextValue) ? undefined : nextValue;
}

function scoreSearchOption(option: SearchableSelectOption, normalizedQuery: string) {
  if (!normalizedQuery) return 1;

  const label = option.label.toLowerCase();
  const value = option.value.toLowerCase();
  const words = label.split(/[\s()-]+/).filter(Boolean);

  if (label === normalizedQuery || value === normalizedQuery) return 100;
  if (label.startsWith(normalizedQuery)) return 90;
  if (words.some((word) => word.startsWith(normalizedQuery))) return 80;
  if (label.includes(normalizedQuery)) return 70;
  if (option.keywords?.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))) return 60;
  if (value.includes(normalizedQuery)) return 50;
  return 0;
}

function rankSearchOptions(options: SearchableSelectOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return [...options]
    .map((option) => ({ option, score: scoreSearchOption(option, normalizedQuery) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.option.label.localeCompare(b.option.label))
    .map((row) => row.option);
}

function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  onEnter,
  onQueryChange,
  renderNoResults,
}: {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (nextValue: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onEnter?: () => void;
  onQueryChange?: (query: string) => void;
  renderNoResults?: (query: string) => React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedOption = options.find((option) => option.value === value) || null;
  const hasQuery = query.trim().length > 0;

  const visibleOptions = useMemo(() => {
    if (!hasQuery) return options;
    return rankSearchOptions(options, query);
  }, [options, query, hasQuery]);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label || '');
    }
  }, [isOpen, selectedOption]);

  useEffect(() => {
    if (!visibleOptions.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => Math.min(prev, visibleOptions.length - 1));
  }, [visibleOptions]);

  const handleEnter = () => {
    if (isOpen && visibleOptions.length > 0) {
      const next = visibleOptions[activeIndex] || visibleOptions[0];
      if (!next) return;
      onValueChange(next.value);
      setQuery(next.label);
      setIsOpen(false);
      onQueryChange?.(next.label);
      return;
    }

    onEnter?.();
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(0);
          onQueryChange?.(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            if (!visibleOptions.length) return;
            setActiveIndex((prev) => Math.min(prev + 1, visibleOptions.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIsOpen(true);
            if (!visibleOptions.length) return;
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            handleEnter();
            return;
          }
          if (e.key === 'Tab') {
            setIsOpen(false);
          }
        }}
        placeholder={searchPlaceholder || placeholder || 'Type to search...'}
        className={cn(INPUT_CLS, 'h-11 text-[11px] tracking-[0.12em]')}
        autoComplete="off"
      />

      {isOpen && visibleOptions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-border bg-background shadow-2xl">
          {visibleOptions.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onValueChange(option.value);
                setQuery(option.label);
                setIsOpen(false);
                onQueryChange?.(option.label);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest transition-colors',
                idx === activeIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/40'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {isOpen && hasQuery && visibleOptions.length === 0 && (
        <div className="absolute z-20 mt-1 w-full border border-border bg-background p-2 shadow-2xl">
          {renderNoResults ? (
            <div>{renderNoResults(query)}</div>
          ) : (
            <p className="text-[10px] text-muted-foreground/60">{emptyText || 'No matching results.'}</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatShortDate(value?: string | null) {
  if (!value) return '-';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '-';
  return dateValue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateInputValue(value?: string | null) {
  if (!value) return getTodayDateInputValue();
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return getTodayDateInputValue();
  return dateValue.toISOString().slice(0, 10);
}

function employeeStatusLabel(status?: 'active' | 'inactive' | 'terminated') {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  if (status === 'terminated') return 'Terminated';
  return '-';
}

function getFlatDisplayId(flat: Flat) {
  if (flat.customFlatId && flat.customFlatId.trim().length > 0) return flat.customFlatId.trim();
  if (flat.flatNumber !== null && flat.flatNumber !== undefined) return `Flat ${flat.flatNumber}`;
  return '-';
}

function getFlatWing(flat: Flat) {
  const flatId = flat.customFlatId?.trim();
  if (!flatId) return '-';

  const hyphenWing = flatId.match(/^([a-zA-Z]+)[-\s]/);
  if (hyphenWing?.[1]) return hyphenWing[1].toUpperCase();

  const prefixWing = flatId.match(/^([a-zA-Z]+)/);
  if (prefixWing?.[1] && prefixWing[1].length <= 3) return prefixWing[1].toUpperCase();

  return '-';
}

function BookedFlatsTable({
  flats,
  floorNumber,
  emptyMessage,
}: {
  flats: Flat[];
  floorNumber: number | null;
  emptyMessage: string;
}) {
  if (!flats.length) {
    return <p className="mt-2 text-[10px] text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="mt-2 border border-border/60">
      <table className="w-full table-fixed text-[10px]">
        <thead className="bg-muted/30">
          <tr className="border-b border-border/60 text-[9px] uppercase tracking-widest text-muted-foreground">
            <th className="px-3 py-2 text-left">Wing</th>
            <th className="px-3 py-2 text-left">Floor</th>
            <th className="px-3 py-2 text-left">Flat</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Booked On</th>
          </tr>
        </thead>
        <tbody>
          {flats.map((flat) => (
            <tr key={flat.id} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 font-bold uppercase tracking-widest">{getFlatWing(flat)}</td>
              <td className="px-3 py-2">{floorNumber ?? '—'}</td>
              <td className="px-3 py-2 font-bold uppercase tracking-widest">{getFlatDisplayId(flat)}</td>
              <td className="px-3 py-2 truncate" title={flat.unitType ?? undefined}>{flat.unitType || '—'}</td>
              <td className={cn(
                'px-3 py-2 font-bold uppercase tracking-widest',
                flat.status === 'SOLD' ? 'text-amber-500' : 'text-blue-500'
              )}>
                {flat.status}
              </td>
              <td className="px-3 py-2">{formatShortDate(flat.customer?.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Keyboard-navigable List
function KeyList<T extends { shortcut: string }>({
  items,
  focusIndex,
  onSelect,
  renderItem,
}: {
  items: T[];
  focusIndex: number;
  onSelect: (idx: number) => void;
  renderItem: (item: T, idx: number, focused: boolean) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="w-full text-left outline-none"
          tabIndex={-1}
        >
          {renderItem(item, i, i === focusIndex)}
        </button>
      ))}
    </div>
  );
}

// â”€â”€â”€ Keyboard Toggle Group â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function KeyToggle<T extends string>({
  options,
  value,
  onChange,
  renderOption,
}: {
  options: T[];
  value: T;
  onChange: (val: T) => void;
  renderOption: (opt: T, selected: boolean) => React.ReactNode;
}) {
  const idx = options.indexOf(value);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + options.length) % options.length;
      onChange(options[prev]);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % options.length;
      onChange(options[next]);
    } else if (e.key >= '1' && e.key <= String(options.length)) {
      e.preventDefault();
      onChange(options[parseInt(e.key) - 1]);
    }
  };

  return (
    <div
      tabIndex={0}
      role="radiogroup"
      onKeyDown={handleKeyDown}
      className="grid gap-3 outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          tabIndex={-1}
          onClick={() => onChange(opt)}
          className="outline-none"
        >
          {renderOption(opt, opt === value)}
        </button>
      ))}
    </div>
  );
}

// â”€â”€â”€ FORM: Create Site â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CreateSiteForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useCreateSite({ onSuccess: () => { reset(); toast.success('Site created'); onSuccess(); } });
  const { register, handleSubmit, watch, reset, setValue, setFocus, formState: { errors } } = useForm<CreateSiteInput>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: { name: '', address: '', projectType: 'NEW_CONSTRUCTION', totalFloors: undefined },
  });
  const projectType = watch('projectType') || 'NEW_CONSTRUCTION';
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  return (
    <FormShell title="Create New Site" onBack={onBack} isPending={isPending} submitLabel="Create Site" formId="create-site-form">
      <form id="create-site-form" onSubmit={handleSubmit((d) => mutate(d))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to create site')} />}
        <Field label="Project Name" error={errors.name?.message}>
          <input placeholder="e.g. Sai Residency Phase 2" className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Site Address" error={errors.address?.message}>
          <textarea placeholder="Plot 45, Sector 8, Tech-City" className={cn(INPUT_CLS, 'min-h-16 resize-none py-3')} {...register('address')} />
        </Field>
        <Field label="Total Floors" error={errors.totalFloors?.message}>
          <input
            type="number"
            min={1}
            placeholder="e.g. 5"
            className={INPUT_CLS}
            {...register('totalFloors', { setValueAs: parseOptionalPositiveInteger })}
          />
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Select floor + flat details directly while booking units.</p>
      </form>
    </FormShell>
  );
}

// â”€â”€â”€ FORM: Add Partner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AddSiteExpenseForm({ site, onSuccess, onBack }: { site: any; onSuccess: () => void; onBack: () => void }) {
  const { data: vendorsData } = useVendors();
  const vendors = vendorsData?.data?.vendors ?? [];
  const { mutateAsync: createVendorQuick, isPending: isCreatingVendorQuick } = useCreateVendor();
  const [showQuickVendorCreate, setShowQuickVendorCreate] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickVendorCategory, setQuickVendorCategory] = useState<(typeof COMMON_VENDOR_CATEGORIES)[number] | 'CUSTOM'>('MATERIALS');
  const [quickVendorCustomCategory, setQuickVendorCustomCategory] = useState('');
  const { mutate, isPending, error } = useAddExpense(site.id, {
    onSuccess: () => {
      reset();
      toast.success('Expense added');
      onSuccess();
    }
  });
  const { register, handleSubmit, watch, reset, setValue, setFocus, formState: { errors } } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { type: 'GENERAL', reason: '', vendorId: '', description: '', amount: 0, amountPaid: 0, paymentDate: getTodayDateInputValue() },
  });
  const expenseType = watch('type') || 'GENERAL';
  const selectedVendorId = watch('vendorId') || '';
  useEffect(() => { setTimeout(() => setFocus('amount'), 50); }, [setFocus]);

  const onSubmit = (d: CreateExpenseInput) => {
    const payload: CreateExpenseInput = {
      ...d,
      reason: d.reason || undefined,
      description: d.description || undefined,
      paymentDate: d.paymentDate || undefined,
      vendorId: d.type === 'VENDOR' ? d.vendorId || undefined : undefined,
      amountPaid: d.amountPaid === 0 ? undefined : d.amountPaid,
    };

    if (payload.type === 'VENDOR' && !payload.vendorId) {
      toast.error('Select a vendor for vendor expense');
      return;
    }

    mutate(payload);
  };

  const handleQuickVendorCreate = async () => {
    const name = quickVendorName.trim();
    const category = quickVendorCategory === 'CUSTOM' ? quickVendorCustomCategory.trim() : quickVendorCategory;

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
      setQuickVendorCustomCategory('');
      toast.success('Vendor created');
    } catch (createError) {
      toast.error(getApiErrorMessage(createError, 'Failed to create vendor'));
    }
  };

  return (
    <FormShell title={`Add Expense in ${site?.name}`} onBack={onBack} isPending={isPending || isCreatingVendorQuick} submitLabel="Save Expense" formId="add-site-expense-form">
      <form id="add-site-expense-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to add expense')} />}
        <div className="border border-border bg-muted/20 p-4">
          <p className={LABEL_CLS}>Site Snapshot</p>
          <div className="mt-2 grid grid-cols-3 gap-3 text-[10px] font-bold uppercase tracking-widest">
            <div>
              <p className="text-muted-foreground/60">Expenses</p>
              <p className="mt-1 text-foreground">{formatINR(Number(site?.totalExpenses ?? 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground/60">Collections</p>
              <p className="mt-1 text-foreground">{formatINR(Number(site?.customerPayments ?? 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground/60">Balance</p>
              <p className="mt-1 text-primary">{formatINR(Number(site?.remainingFund ?? 0))}</p>
            </div>
          </div>
        </div>
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Create Vendor</p>
                <input
                  value={quickVendorName}
                  onChange={(e) => setQuickVendorName(e.target.value)}
                  placeholder="Vendor name"
                  className={cn(INPUT_CLS, 'mt-2 h-10')}
                />
                <select
                  value={quickVendorCategory}
                  onChange={(e) => setQuickVendorCategory(e.target.value as (typeof COMMON_VENDOR_CATEGORIES)[number] | 'CUSTOM')}
                  className={cn(INPUT_CLS, 'mt-2 h-10 appearance-none cursor-pointer')}
                >
                  {COMMON_VENDOR_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  <option value="CUSTOM">CUSTOM</option>
                </select>
                {quickVendorCategory === 'CUSTOM' && (
                  <input
                    value={quickVendorCustomCategory}
                    onChange={(e) => setQuickVendorCustomCategory(e.target.value)}
                    placeholder="Custom category"
                    className={cn(INPUT_CLS, 'mt-2 h-10')}
                  />
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickVendorCreate(false)}
                    className="h-9 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickVendorCreate}
                    disabled={isCreatingVendorQuick}
                    className="h-9 bg-primary text-black text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isCreatingVendorQuick ? 'Creating...' : 'Create'}
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
        <Field label="Payment Date (optional)">
          <input type="date" className={INPUT_CLS} {...register('paymentDate')} />
        </Field>
        <Field label="Description (optional)">
          <textarea className={cn(INPUT_CLS, 'min-h-16 resize-none py-3')} {...register('description')} />
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
  const { mutate, isPending, error } = useWithdrawFund({ onSuccess: () => { reset(); toast.success('Withdrawal recorded'); onSuccess(); } });
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
  const sites = sitesData?.data?.sites ?? [];
  const { mutate, isPending, error } = useCreateInvestor({ onSuccess: () => { reset(); toast.success('Investor added'); onSuccess(); } });
  const { register, handleSubmit, watch, reset, resetField, setValue, setFocus, formState: { errors } } = useForm<CreateInvestorInput>({
    resolver: zodResolver(createInvestorSchema),
    defaultValues: { type: 'EQUITY', equityPercentage: 0, fixedRate: 0 },
  });
  const investorType = watch('type');
  const selectedEquitySiteId = watch('siteId') || '';
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  const onSubmit = (d: CreateInvestorInput) => {
    if (d.type === 'EQUITY' && !d.siteId) {
      toast.error('Select a site for equity investor');
      return;
    }

    mutate({
      ...d,
      siteId: d.type === 'EQUITY' ? d.siteId : undefined,
      equityPercentage: d.type === 'EQUITY' ? d.equityPercentage : undefined,
      fixedRate: d.type === 'FIXED_RATE' ? d.fixedRate : undefined,
    });
  };

  return (
    <FormShell title="Add Investor" onBack={onBack} isPending={isPending} submitLabel="Add Investor" formId="add-investor-form">
      <form id="add-investor-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to add investor')} />}

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
      </form>
    </FormShell>
  );
}

// â”€â”€â”€ FORM: Add Vendor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AddVendorForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { mutate, isPending, error } = useCreateVendor({ onSuccess: () => { reset(); toast.success('Vendor added'); onSuccess(); } });
  const { register, handleSubmit, reset, setFocus, formState: { errors } } = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: { name: '', type: '', phone: '', email: '' },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  return (
    <FormShell title="Add Vendor" onBack={onBack} isPending={isPending} submitLabel="Add Vendor" formId="add-vendor-form">
      <form id="add-vendor-form" onSubmit={handleSubmit((d) => mutate({ ...d, email: d.email || undefined }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to add vendor')} />}
        <Field label="Vendor Name" error={errors.name?.message}>
          <input placeholder="Enter vendor name" className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Vendor Type" error={errors.type?.message}>
          <input placeholder="e.g. Electrician, Carpenter, Mason" className={INPUT_CLS} {...register('type')} />
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
  const { mutate, isPending, error } = useUpdateVendor({ onSuccess: () => { toast.success('Vendor updated'); onSuccess(); } });
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<UpdateVendorInput>({
    resolver: zodResolver(updateVendorSchema),
    defaultValues: {
      name: entity?.name || '',
      type: entity?.type || '',
      phone: entity?.phone || '',
      email: entity?.email || '',
    },
  });
  useEffect(() => { setTimeout(() => setFocus('name'), 50); }, [setFocus]);

  return (
    <FormShell title={`Edit Vendor: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Save Vendor" formId="edit-vendor-form">
      <form id="edit-vendor-form" onSubmit={handleSubmit((d) => mutate({ id: entity.id, data: d }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to update vendor')} />}
        <Field label="Vendor Name" error={errors.name?.message}>
          <input className={INPUT_CLS} {...register('name')} />
        </Field>
        <Field label="Vendor Type" error={errors.type?.message}>
          <input className={INPUT_CLS} {...register('type')} />
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
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<{ amount: number; note?: string }>({
    defaultValues: { amount: 0, note: '' },
  });
  useEffect(() => { setTimeout(() => setFocus('amount'), 50); }, [setFocus]);

  return (
    <FormShell title={`Record Payment: ${entity?.name}`} onBack={onBack} isPending={isPending} submitLabel="Record Payment" formId="record-payment-form">
      <form id="record-payment-form" onSubmit={handleSubmit((d) => mutate({ customerId: entity.id, siteId: entity.siteId, data: d }))} className="flex flex-col gap-6">
        {error && <FormError msg={getApiErrorMessage(error, 'Failed to record payment')} />}
        <Field label="Amount Paid (INR)" error={errors.amount?.message}>
          <input type="number" className={INPUT_CLS} {...register('amount', { valueAsNumber: true })} />
        </Field>
        <Field label="Note / Reference">
          <input placeholder="Payment details..." className={INPUT_CLS} {...register('note')} />
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

const bookFlatFlowSchema = bookFlatSchema.extend({
  floorNumber: z.number().int().min(1, 'Select a floor number'),
  customFlatId: z.string().trim().min(1, 'Flat name/ID is required'),
  unitTypePreset: z.enum(UNIT_TYPE_PICK_OPTIONS),
  customUnitType: z.string().trim().optional(),
  flatType: z.enum(['CUSTOMER', 'EXISTING_OWNER']).default('CUSTOMER'),
  customerMode: z.enum(['NEW', 'EXISTING']).default('NEW'),
  existingCustomerId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.customerMode === 'EXISTING' && !data.existingCustomerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['existingCustomerId'],
      message: 'Select an existing customer',
    });
  }

  if (data.unitTypePreset === 'CUSTOM' && !data.customUnitType?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customUnitType'],
      message: 'Enter a custom unit type',
    });
  }
});

type BookFlatFlowInput = z.input<typeof bookFlatFlowSchema>;

function BookFlatForm({
  site,
  onSuccess,
  onBack,
  onFloorChange,
}: {
  site: any;
  onSuccess: () => void;
  onBack: () => void;
  onFloorChange?: (floorNumber: number | null) => void;
}) {
  const { data: floorsData, isLoading: floorsLoading, refetch: refetchFloors } = useFloors(site.id);
  const { data: allCustomersData } = useAllCustomers();
  const floors: Floor[] = floorsData?.data?.floors ?? [];
  const availableCustomers = (allCustomersData?.data?.customers ?? []).filter((customer: any) => customer.dealStatus === 'ACTIVE');

  const { mutateAsync: createFloor, isPending: isCreatingFloor, error: createFloorError } = useCreateFloor(site.id);
  const { mutateAsync: createFlat, isPending: isCreatingFlat, error: createFlatError } = useCreateFlat(site.id);
  const { mutateAsync: updateFlatDetails, isPending: isUpdatingFlatDetails, error: updateFlatDetailsError } = useUpdateFlatDetails(site.id);
  const { mutateAsync: bookFlat, isPending: isBooking, error: bookingError } = useBookFlat(site.id);

  const floorNumbers: number[] = (() => {
    const declaredTotal = Number(site?.totalFloors ?? 0);
    if (declaredTotal > 0) return Array.from({ length: declaredTotal }, (_, idx) => idx + 1);
    const fromFloors = Array.from(new Set(floors.map((floor) => floor.floorNumber).filter((n): n is number => Number.isFinite(n) && n > 0)));
    return fromFloors.length ? fromFloors.sort((a, b) => a - b) : [1];
  })();

  const fallbackFloorNumber = floorNumbers[0] ?? 1;

  const { register, handleSubmit, watch, setValue, setFocus, formState: { errors } } = useForm<BookFlatFlowInput>({
    resolver: zodResolver(bookFlatFlowSchema),
    defaultValues: {
      floorNumber: fallbackFloorNumber,
      customFlatId: '',
      unitTypePreset: '2BHK',
      customUnitType: '',
      flatType: 'CUSTOMER',
      customerMode: 'NEW',
      existingCustomerId: '',
      name: '',
      phone: '',
      email: '',
      sellingPrice: 0,
      bookingAmount: 0,
    },
  });

  const floorNumber = Number(watch('floorNumber') || 0);
  const customerMode = watch('customerMode') || 'NEW';
  const selectedExistingCustomerId = watch('existingCustomerId');
  const unitTypePreset = watch('unitTypePreset');
  const flatType = watch('flatType') || 'CUSTOMER';
  const sellingPrice = Number(watch('sellingPrice') || 0);
  const bookingAmount = Number(watch('bookingAmount') || 0);
  const remaining = Math.max(0, sellingPrice - bookingAmount);

  const selectedExistingCustomer = availableCustomers.find((customer: any) => customer.id === selectedExistingCustomerId);
  const selectedFloor = floors.find((floor: Floor) => floor.floorNumber === floorNumber);
  const bookedFlatsOnSelectedFloor = selectedFloor?.flats.filter((flat: Flat) => flat.status === 'BOOKED' || flat.status === 'SOLD') ?? [];

  useEffect(() => { setTimeout(() => setFocus('floorNumber'), 50); }, [setFocus]);

  useEffect(() => {
    if (!floorNumbers.includes(floorNumber)) {
      setValue('floorNumber', fallbackFloorNumber, { shouldValidate: true });
    }
  }, [floorNumber, floorNumbers, fallbackFloorNumber, setValue]);

  useEffect(() => {
    if (customerMode === 'EXISTING' && selectedExistingCustomer) {
      setValue('name', selectedExistingCustomer.name || '', { shouldValidate: true });
      setValue('phone', selectedExistingCustomer.phone || '', { shouldValidate: true });
      setValue('email', selectedExistingCustomer.email || '', { shouldValidate: true });
      return;
    }

    if (customerMode === 'NEW') {
      setValue('existingCustomerId', '', { shouldValidate: true });
    }
  }, [customerMode, selectedExistingCustomer, setValue]);

  useEffect(() => {
    onFloorChange?.(Number.isFinite(floorNumber) && floorNumber > 0 ? floorNumber : null);
    return () => onFloorChange?.(null);
  }, [floorNumber, onFloorChange]);

  const onSubmit = async (data: BookFlatFlowInput) => {
    const normalizedFlatId = data.customFlatId.trim().toLowerCase();
    const resolvedUnitType = (data.unitTypePreset === 'CUSTOM' ? data.customUnitType : data.unitTypePreset)?.trim();
    let workingFloors = floors;
    let workingFloor = workingFloors.find((floor: Floor) => floor.floorNumber === data.floorNumber);

    if (!workingFloor) {
      await createFloor({ floorName: `Floor ${data.floorNumber}` });
      const refreshed = await refetchFloors();
      workingFloors = (refreshed.data?.data?.floors ?? []) as Floor[];
      workingFloor = workingFloors.find((floor: Floor) => floor.floorNumber === data.floorNumber);
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

        <Field label="Floor Number" error={errors.floorNumber?.message}>
          <input type="hidden" {...register('floorNumber')} />
          <SearchableSelect
            options={floorNumbers.map((number) => ({ value: String(number), label: `Floor ${number}` }))}
            value={floorNumber > 0 ? String(floorNumber) : ''}
            onValueChange={(nextValue) => setValue('floorNumber', nextValue ? Number(nextValue) : fallbackFloorNumber, { shouldValidate: true })}
            placeholder="Select floor..."
            searchPlaceholder="Type floor number..."
            emptyText="No matching floor found."
          />
        </Field>

        <div className="border border-border bg-muted/20 p-4">
          <p className={LABEL_CLS}>Booked Flats On Selected Floor</p>
          <BookedFlatsTable
            flats={bookedFlatsOnSelectedFloor}
            floorNumber={selectedFloor?.floorNumber ?? floorNumber ?? null}
            emptyMessage="No booked/sold flats on this floor yet."
          />
        </div>

        <Field label="Flat Name / ID" error={errors.customFlatId?.message}>
          <input placeholder="e.g. A-101" className={INPUT_CLS} {...register('customFlatId')} />
          <p className="text-[10px] text-muted-foreground/60">
            If this flat already exists and is available on the selected floor, booking will use it. Otherwise a new flat is created and booked.
          </p>
        </Field>

        <Field label="Unit Type" error={errors.customUnitType?.message}>
          <input type="hidden" {...register('unitTypePreset')} />
          <SearchableSelect
            options={[...COMMON_UNIT_TYPES, 'CUSTOM'].map((type) => ({ value: type, label: type === 'CUSTOM' ? 'Custom' : type }))}
            value={unitTypePreset || ''}
            onValueChange={(nextValue) => setValue('unitTypePreset', nextValue as BookFlatFlowInput['unitTypePreset'], { shouldValidate: true })}
            placeholder="Select unit type..."
            searchPlaceholder="Type unit type..."
            emptyText="No unit type matches your search."
          />
          {unitTypePreset === 'CUSTOM' && (
            <input
              className={cn(INPUT_CLS, 'mt-3')}
              placeholder="e.g. Shop, Office, Studio, 3BHK + Terrace"
              {...register('customUnitType')}
            />
          )}
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
              options={availableCustomers.map((customer: any) => ({
                value: customer.id,
                label: `${customer.name}${customer.siteName ? ` (${customer.siteName})` : ''}`,
                keywords: [customer.phone, customer.email, customer.siteName].filter(Boolean),
              }))}
              value={selectedExistingCustomerId || ''}
              onValueChange={(nextValue) => setValue('existingCustomerId', nextValue, { shouldValidate: true })}
              placeholder="Select customer..."
              searchPlaceholder="Type customer name..."
              emptyText="No customers match your search."
            />
            {availableCustomers.length === 0 && (
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

        <div className="border border-border divide-y divide-border">
          <div className="flex justify-between items-center px-4 py-3">
            <span className={LABEL_CLS}>Selected Floor</span>
            <span className="text-sm font-bold uppercase tracking-widest">{selectedFloor ? `Floor ${selectedFloor.floorNumber}` : `Floor ${floorNumber}`}</span>
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
  onConfirm,
  onBack,
  isPending,
  submitLabel = 'Confirm',
  destructive = false
}: {
  title: string;
  message: string;
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
      </div>
      <form id="confirm-form" onSubmit={(e) => { e.preventDefault(); onConfirm(); }} />
    </FormShell>
  );
}

// â”€â”€â”€ Shared Form Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={LABEL_CLS}>{label}</label>
      {children}
      {error && <p className={ERROR_CLS}>{error}</p>}
    </div>
  );
}

function FormError({ msg }: { msg: string }) {
  return <div className="bg-destructive/10 border border-destructive/30 p-3 text-[11px] font-bold text-destructive">{msg}</div>;
}

function FormShell({ title, onBack, isPending, submitLabel, formId, destructive, children }: {
  title: string; onBack: () => void; isPending: boolean; submitLabel: string; formId: string; destructive?: boolean; children: React.ReactNode;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelChoice, setCancelChoice] = useState<'keep' | 'confirm'>('keep');
  const keepEditingBtnRef = useRef<HTMLButtonElement>(null);
  const confirmCancelBtnRef = useRef<HTMLButtonElement>(null);
  const FOCUSABLE = 'input:not([type="hidden"]), textarea, select, [role="radiogroup"], [data-navbtn]';

  const requestCancel = () => {
    setCancelChoice('keep');
    setShowCancelConfirm(true);
  };
  const dismissCancel = () => setShowCancelConfirm(false);
  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onBack();
  };

  useEffect(() => {
    if (!showCancelConfirm) return;
    const target = cancelChoice === 'keep' ? keepEditingBtnRef.current : confirmCancelBtnRef.current;
    requestAnimationFrame(() => target?.focus());
  }, [showCancelConfirm, cancelChoice]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const focusables: HTMLElement[] = Array.from(el.querySelectorAll(FOCUSABLE));
    const primaryFocusable =
      focusables.find((node) => !node.hasAttribute('data-navbtn')) ||
      focusables.find((node) => node.getAttribute('data-submitbtn') === 'true') ||
      focusables[0];

    if (!primaryFocusable) return;
    requestAnimationFrame(() => {
      primaryFocusable.focus();
      primaryFocusable.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
  }, [title]);

  // â”€â”€ Keyboard navigation: Enter=next, â†‘â†“=move, â†â†’ for buttons â”€â”€
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const getFocusables = (): HTMLElement[] =>
      Array.from(el.querySelectorAll(FOCUSABLE));

    const getIdx = (): number => {
      const active = document.activeElement as HTMLElement;
      const items = getFocusables();
      let idx = items.indexOf(active);
      if (idx === -1) {
        const rg = active?.closest('[role="radiogroup"]');
        if (rg) idx = items.indexOf(rg as HTMLElement);
      }
      return idx;
    };

    const focusItem = (items: HTMLElement[], idx: number) => {
      if (idx >= 0 && idx < items.length) {
        items[idx].focus();
        items[idx].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    };

    const handler = (e: KeyboardEvent) => {
      if (showCancelConfirm) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          dismissCancel();
          return;
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setCancelChoice('keep');
          return;
        }

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setCancelChoice('confirm');
          return;
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          setCancelChoice((prev) => (prev === 'keep' ? 'confirm' : 'keep'));
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (cancelChoice === 'keep') {
            dismissCancel();
          } else {
            confirmCancel();
          }
        }
        return;
      }

      const active = document.activeElement as HTMLElement;
      const items = getFocusables();
      const idx = getIdx();
      if (idx === -1) return;

      const tag = active?.tagName;
      const isBtn = !!active?.getAttribute('data-navbtn');
      const isRadioGroup = active?.getAttribute('role') === 'radiogroup' || !!active?.closest('[role="radiogroup"]');

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        requestCancel();
        return;
      }

      // â”€â”€ Enter: move to next item. On buttons, let them fire natively â”€â”€
      if (e.key === 'Enter') {
        if (isBtn) return; // native click/submit
        e.preventDefault();
        e.stopPropagation();
        focusItem(items, idx + 1);
        return;
      }

      // â”€â”€ ArrowDown / ArrowRight: next item â”€â”€
      if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && isBtn)) {
        if (!isBtn && (tag === 'SELECT' || isRadioGroup)) return;
        e.preventDefault();
        focusItem(items, idx + 1);
        return;
      }

      // â”€â”€ ArrowUp / ArrowLeft: previous item â”€â”€
      if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && isBtn)) {
        if (!isBtn && (tag === 'SELECT' || isRadioGroup)) return;
        e.preventDefault();
        focusItem(items, idx - 1);
        return;
      }
    };

    el.addEventListener('keydown', handler, true);
    return () => el.removeEventListener('keydown', handler, true);
  }, [showCancelConfirm]);

  const BTN_FOCUS = 'outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';

  return (
    <div ref={navRef} className="flex flex-col gap-6">
      {/* Header */}
      <button onClick={requestCancel} tabIndex={-1} className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group">
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>
      <h2 className="text-2xl font-serif tracking-tight text-foreground">{title}</h2>

      {/* Form content */}
      {children}

      {/* Action buttons â€” Cancel + Submit */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button
          data-navbtn="true"
          type="button"
          onClick={requestCancel}
          className={cn(
            'h-12 w-full font-bold text-[11px] uppercase tracking-[0.2em] border border-border text-muted-foreground transition-all flex items-center justify-center gap-2',
            'hover:bg-muted/30',
            BTN_FOCUS,
          )}
        >
          Cancel
        </button>
        <button
          data-navbtn="true"
          data-submitbtn="true"
          type="submit"
          form={formId}
          disabled={isPending}
          className={cn(
            'h-12 w-full font-bold text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2',
            destructive
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-primary text-black hover:bg-primary/90',
            isPending && 'opacity-60 cursor-not-allowed',
            BTN_FOCUS,
          )}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
        Enter next | Up/Down move | Left/Right buttons | Esc back
      </p>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-md border border-border bg-background p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-foreground">Cancel This Action?</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Any unsaved inputs in this form will be lost.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                ref={keepEditingBtnRef}
                type="button"
                onClick={dismissCancel}
                onFocus={() => setCancelChoice('keep')}
                className={cn(
                  'h-11 w-full font-bold text-[10px] uppercase tracking-[0.18em] border border-border text-muted-foreground transition-all',
                  'hover:bg-muted/30',
                  cancelChoice === 'keep' && 'border-primary text-foreground bg-muted/40',
                  BTN_FOCUS,
                )}
              >
                Keep Editing
              </button>
              <button
                ref={confirmCancelBtnRef}
                type="button"
                onClick={confirmCancel}
                onFocus={() => setCancelChoice('confirm')}
                className={cn(
                  'h-11 w-full font-bold text-[10px] uppercase tracking-[0.18em] transition-all',
                  'bg-primary text-black hover:bg-primary/90',
                  cancelChoice === 'confirm' && 'ring-2 ring-primary/50',
                  BTN_FOCUS,
                )}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Main Command Center Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Phase = 'categories' | 'actions' | 'selector' | 'sub-selector' | 'form';

function EntitySelector({
  category,
  action,
  onBack,
  onSelect,
  focusIndex,
  items,
  loading,
  title
}: {
  category: CategoryDef;
  action: string;
  onBack: () => void;
  onSelect: (entity: any) => void;
  focusIndex: number;
  items: any[];
  loading: boolean;
  title?: string;
}) {
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">No items found.</p>
      <button onClick={onBack} className="text-[10px] font-bold text-primary uppercase hover:underline">Go Back</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <button onClick={onBack} className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group">
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
        <h2 className="text-2xl font-serif tracking-tight text-foreground">{title || `Select ${category.label.slice(0, -1)} to ${action.split('-')[0]}`}</h2>
      </div>

      <KeyList
        items={items.map((it, i) => ({ ...it, shortcut: String(i + 1) }))}
        focusIndex={focusIndex}
        onSelect={(idx) => onSelect(items[idx])}
        renderItem={(item, i, focused) => (
          <div className={cn(
            'flex items-center gap-4 border px-5 py-4 transition-all',
            focused
              ? `${category.border} ${category.bg} shadow-sm`
              : 'border-border hover:bg-muted/30',
          )}>
            <div className="flex-1">
              <p className={cn('text-sm font-bold uppercase tracking-widest', focused ? 'text-foreground' : 'text-muted-foreground')}>
                {(item.customFlatId || item.flatNumber) ? `Flat ${item.customFlatId || item.flatNumber}` : item.name}
              </p>
              {(item.siteName || item.type || item.status) && (
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                  {item.siteName || item.type || item.status}
                </p>
              )}
            </div>
            {focused && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary animate-in fade-in duration-200">
                Confirm Enter
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
      <form id="add-employee-form" onSubmit={handleSubmit((values) => mutate(values))} className="flex flex-col gap-6">
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

function toIsoDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toISOString();
}

function toIsoDateTime(dateValue: string, timeValue?: string) {
  if (!timeValue) return undefined;
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

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

function SiteQuickPickerSelector({
  sites,
  loading,
  onBack,
  onSelect,
  title,
}: {
  sites: any[];
  loading: boolean;
  onBack: () => void;
  onSelect: (site: any) => void;
  title?: string;
}) {
  const [selectedSiteId, setSelectedSiteId] = useState('');

  useEffect(() => {
    if (!sites.length) return;
    setSelectedSiteId((prev) => prev || sites[0].id || '');
  }, [sites]);

  const activeSite = sites.find((site) => site.id === selectedSiteId) || sites[0] || null;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading Sites...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <button onClick={onBack} className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group">
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
        <h2 className="text-2xl font-serif tracking-tight text-foreground">{title || 'Select Site'}</h2>
      </div>

      <div className="border border-border bg-muted/20 p-4">
        <SearchableSelect
          options={sites.map((site) => ({
            value: site.id,
            label: site.name,
            keywords: [site.address].filter(Boolean),
          }))}
          value={activeSite?.id || ''}
          onValueChange={setSelectedSiteId}
          placeholder="Select site..."
          searchPlaceholder="Type site name..."
          emptyText="No sites match your search."
          onEnter={() => {
            if (activeSite) onSelect(activeSite);
          }}
        />

        {activeSite ? (
          <>
            <p className="mt-3 text-[10px] text-muted-foreground">{activeSite.address}</p>
            <button
              type="button"
              onClick={() => onSelect(activeSite)}
              className="mt-4 h-11 w-full bg-primary text-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary/90 transition-colors"
            >
              Continue
            </button>
          </>
        ) : (
          <p className="mt-3 text-[10px] text-muted-foreground">No site matches your search.</p>
        )}
      </div>
    </div>
  );
}

function ContextInsightPanel({
  action,
  site,
  customer,
  focusedFloorNumber,
}: {
  action: string | null;
  site: any | null;
  customer: any | null;
  focusedFloorNumber: number | null;
}) {
  const { data: floorsData, isLoading } = useFloors(site?.id || '');
  const floors = floorsData?.data?.floors ?? [];
  const selectedFloor = focusedFloorNumber
    ? floors.find((floor: Floor) => floor.floorNumber === focusedFloorNumber)
    : null;
  const bookedFlats = selectedFloor?.flats.filter((flat: Flat) => flat.status === 'BOOKED' || flat.status === 'SOLD') ?? [];

  const isSiteDrivenAction = !!action && ACTIONS_USING_SITE_SELECTOR.includes(action);

  return (
    <aside className="self-start border border-border bg-card p-5 min-h-[22rem] sticky top-6 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain">
      {!isSiteDrivenAction && (
        <p className="text-sm text-muted-foreground">Select an action to see relevant site insights here.</p>
      )}

      {isSiteDrivenAction && !site && (
        <p className="mt-4 text-sm text-muted-foreground">Pick a site to load contextual details for this action.</p>
      )}

      {site && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className={LABEL_CLS}>Site</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest">{site.name}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{site.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border bg-muted/20 p-3">
              <p className={LABEL_CLS}>Balance</p>
              <p className="mt-1 text-sm font-bold text-primary">{formatINR(Number(site.remainingFund ?? 0))}</p>
            </div>
            <div className="border border-border bg-muted/20 p-3">
              <p className={LABEL_CLS}>Expenses</p>
              <p className="mt-1 text-sm font-bold">{formatINR(Number(site.totalExpenses ?? 0))}</p>
            </div>
          </div>

          {action === 'book-flat' && (
            <div className="border border-border bg-muted/20 p-3">
              <p className={LABEL_CLS}>Floor Booking Status</p>
              {isLoading ? (
                <p className="mt-2 text-[10px] text-muted-foreground">Loading floor details...</p>
              ) : selectedFloor ? (
                <>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest">Floor {selectedFloor.floorNumber}</p>
                  <BookedFlatsTable
                    flats={bookedFlats}
                    floorNumber={selectedFloor.floorNumber}
                    emptyMessage="No booked/sold flats on this floor."
                  />
                </>
              ) : (
                <p className="mt-2 text-[10px] text-muted-foreground">Pick a floor in booking form to view booked flats here.</p>
              )}
            </div>
          )}

          {action === 'record-payment' && customer && (
            <div className="border border-border bg-muted/20 p-3">
              <p className={LABEL_CLS}>Selected Customer</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest">{customer.name}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Remaining: {formatINR(Number(customer.remaining ?? 0))}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
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
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = CATEGORIES[catIdx];
  const actions = selectedCategory?.actions ?? [];

  // Data fetching
  const { data: ssData, isLoading: ssLoading } = useSites({
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
  const { mutate: deleteSiteMutate, isPending: isDeleteSitePending } = useDeleteSite();
  const { mutate: deletePartnerMutate, isPending: isDeletePartnerPending } = useDeletePartner();
  const { mutate: deleteInvestorMutate, isPending: isDeleteInvestorPending } = useDeleteInvestor();
  const { mutate: deleteVendorMutate, isPending: isDeleteVendorPending } = useDeleteVendor();
  const { mutate: deleteEmployeeMutate, isPending: isDeleteEmployeePending } = useDeleteEmployee();

  const selectorItems = ((): any[] => {
    if (!selectedCategory) return [];
    if (selectedAction === 'record-payment') return ssData?.data?.sites ?? [];
    if (selectedCategory.id === 'sites') return ssData?.data?.sites ?? [];
    if (selectedCategory.id === 'company') return coData?.data?.partners ?? [];
    if (selectedCategory.id === 'investors') return inData?.data?.investors ?? [];
    if (selectedCategory.id === 'vendors') return veData?.data?.vendors ?? [];
    if (selectedCategory.id === 'customers') return cuData?.data?.customers ?? [];
    if (selectedCategory.id === 'employees') return emData?.data?.employees ?? [];
    return [];
  })();

  const subSelectorItems = ((): any[] => {
    if (selectedAction === 'record-payment') return siteCustomersData?.data?.customers ?? [];
    return [];
  })();

  const selectorLoading = ssLoading || coLoading || inLoading || veLoading || cuLoading || emLoading;
  const isSiteSelectorPhase = phase === 'selector' && !!selectedAction && ACTIONS_USING_SITE_SELECTOR.includes(selectedAction);
  const contextSite = isSiteSelectorPhase || phase === 'sub-selector' || phase === 'form' ? selectedEntity : null;

  // â”€â”€ Keyboard Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

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
        const idx = Number.parseInt(e.key, 10) - 1;
        if (!Number.isNaN(idx) && idx >= 0 && idx < CATEGORIES.length) {
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
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= actions.length) {
          const actionId = actions[num - 1].id;
          setActIdx(num - 1);
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
    if (phase !== 'form') {
      containerRef.current?.focus();
    }
  }, [phase]);

  const handleFormSuccess = () => {
    setPhase('categories');
    setSelectedAction(null);
    setSelectedEntity(null);
    setSelectedSubEntity(null);
    setFocusedFloorNumber(null);
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
    } else {
      setPhase('actions');
      setSelectedAction(null);
      setSelectedEntity(null);
      setSelectedSubEntity(null);
      setFocusedFloorNumber(null);
    }
  };

  // â”€â”€ Render Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function renderForm() {
    const props = { onSuccess: handleFormSuccess, onBack: handleFormBack };

    // Actions
    if (selectedAction === 'book-flat') {
      return <BookFlatForm {...props} site={selectedEntity} onFloorChange={setFocusedFloorNumber} />;
    }

    // Site Actions Confirmations
    if (selectedAction === 'archive-site') {
      return (
        <ActionConfirmForm
          {...props}
          title="Archive/Restore Site"
          message={`Are you sure you want to toggle the status of "${selectedEntity?.name}"?`}
          submitLabel="Toggle Status"
          isPending={isToggleSitePending}
          onConfirm={() => toggleSiteMutate(selectedEntity.id, { onSuccess: () => { toast.success('Site status toggled'); handleFormSuccess(); } })}
        />
      );
    }

    if (selectedAction === 'delete-site') {
      return (
        <ActionConfirmForm
          {...props}
          title="Delete Site"
          message={`CRITICAL: This will permanently delete "${selectedEntity?.name}" and all associated data. This action cannot be undone.`}
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
      case 'add-site-expense': return <AddSiteExpenseForm {...props} site={selectedEntity} />;
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
                  title={selectedAction === 'record-payment' ? 'Select Site for Customer Payment' : undefined}
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
          />
        </div>
      </div>
    </DashboardShell>
  );
}












