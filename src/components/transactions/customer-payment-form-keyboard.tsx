'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { customerPaymentSchema, CustomerPaymentInput } from '@/schemas/transactions.schema';
import { useSites } from '@/hooks/api/site.hooks';
import { useSiteCustomers } from '@/hooks/api/customer.hooks';
import { Site } from '@/schemas/site.schema';
import { Customer } from '@/schemas/customer.schema';

// New Modular imports
import { useTransactionForm } from '@/hooks/use-transaction-form';
import { TransactionFormFooter } from '@/components/transactions/transaction-form-footer';

interface CustomerPaymentFormKeyboardProps {
  onSubmit: (data: CustomerPaymentInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
  sites?: any[];
  customers?: any[];
  sitesLoading?: boolean;
  customersLoading?: boolean;
}

export function CustomerPaymentFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onCancel, 
  sites = [], 
  customers = [], 
  sitesLoading = false, 
  customersLoading = false 
}: CustomerPaymentFormKeyboardProps) {
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [highlightedSiteIndex, setHighlightedSiteIndex] = useState(0);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const [siteSearch, setSiteSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const form = useForm<CustomerPaymentInput>({
    resolver: zodResolver(customerPaymentSchema),
    mode: 'onChange',
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
      siteId: '',
      customerId: '',
    },
  });

  // Refs for focus management
  const siteInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const siteContainerRef = useRef<HTMLDivElement>(null);
  const customerContainerRef = useRef<HTMLDivElement>(null);

  // Watch for siteId to load customers
  const watchedSiteId = form.watch('siteId');

  // Filter logic using props
  const filteredSites = (sites || []).filter((site: any) => 
    site.name.toLowerCase().includes(siteSearch.toLowerCase())
  ).slice(0, 3);

  const filteredCustomers = (customers || []).filter((customer: any) => 
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 3);

  // 1. Transaction Form Hook (Handles shared shortcuts, auto-scroll, and exit logic)
  const { focusElement } = useTransactionForm({
    onSave: () => {
      // Direct form submission triggered by Ctrl+Enter
      if (form.formState.isValid) {
        form.handleSubmit(handleSubmit)();
      }
    },
    onBack: () => onCancel?.(),
    isValid: form.formState.isValid,
    siteDropdownOpen,
    customerDropdownOpen,
  });

  // Initial focus on Site
  useEffect(() => {
    const timer = setTimeout(() => {
      siteInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (data: CustomerPaymentInput) => {
    onSubmit(data);
  };

  // Site dropdown handlers
  const handleSiteKeyDown = (e: React.KeyboardEvent) => {
    if (!siteDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setSiteDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSiteIndex((prev) => (prev + 1) % filteredSites.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSiteIndex((prev) => (prev - 1 + filteredSites.length) % filteredSites.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const site = filteredSites[highlightedSiteIndex] || filteredSites[0];
      if (site) {
        handleSiteSelect(site);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setSiteDropdownOpen(false);
    }
  };

  const handleSiteSelect = (site: Site) => {
    form.setValue('siteId', site.id, { shouldValidate: true, shouldDirty: true });
    setSiteSearch(site.name);
    setSiteDropdownOpen(false);
    setTimeout(() => {
      customerInputRef.current?.focus();
    }, 0);
  };

  // Customer dropdown handlers
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (!customerDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setCustomerDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCustomerIndex((prev) => (prev + 1) % filteredCustomers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCustomerIndex((prev) => (prev - 1 + filteredCustomers.length) % filteredCustomers.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const customer = filteredCustomers[highlightedCustomerIndex] || filteredCustomers[0];
      if (customer) {
        handleCustomerSelect(customer);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setCustomerDropdownOpen(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    form.setValue('customerId', customer.id, { shouldValidate: true, shouldDirty: true });
    setCustomerSearch(customer.name);
    setCustomerDropdownOpen(false);
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Customer payment recorded successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form 
        onSubmit={form.handleSubmit(handleSubmit)} 
        className="space-y-6"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (form.formState.isValid) {
              form.handleSubmit(handleSubmit)();
            }
          }
        }}
      >
        {/* 1. Site Selector */}
        <div className="space-y-2" ref={siteContainerRef}>
          <Label htmlFor="siteId" className="text-xs font-bold tracking-widest uppercase opacity-60">1. Site *</Label>
          <div className="relative">
            <Input
              id="siteId"
              placeholder="Search or select site..."
              value={siteSearch}
              ref={siteInputRef}
              autoComplete="off"
              onFocus={() => {
                if (filteredSites.length > 0) {
                  setSiteDropdownOpen(true);
                }
              }}
              onBlur={() => {
                const exactMatch = filteredSites.find(s => s.name.toLowerCase() === siteSearch.toLowerCase());
                if (exactMatch) handleSiteSelect(exactMatch);
              }}
              onChange={(e) => {
                setSiteSearch(e.target.value);
                setHighlightedSiteIndex(0);
                setSiteDropdownOpen(true);
              }}
              onKeyDown={handleSiteKeyDown}
              className="h-12 focus:ring-2 focus:ring-primary pr-10 bg-muted/30 border-none rounded-none"
            />
            <ChevronDown 
              className={`absolute right-3 top-4 h-4 w-4 transition-transform ${
                siteDropdownOpen ? 'rotate-180' : ''
              }`}
            />
            
            {/* Site Dropdown */}
            {siteDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-none shadow-xl max-h-60 overflow-auto">
                {sitesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredSites.length > 0 ? (
                  filteredSites.map((site, index) => (
                    <div
                      key={site.id}
                      className={`px-4 py-3 cursor-pointer border-b border-border/50 last:border-0 ${
                        index === highlightedSiteIndex ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => handleSiteSelect(site)}
                      onMouseEnter={() => setHighlightedSiteIndex(index)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-xs">{site.name}</span>
                        <span className="text-[9px] opacity-40 font-mono tracking-tighter">REF: {site.id.substring(0, 8)}...</span>
                      </div>
                      <div className="text-[10px] uppercase tracking-wider opacity-50 font-medium">{site.address}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm italic opacity-50">No sites found matching &quot;{siteSearch}&quot;</div>
                )}
              </div>
            )}
          </div>
          {form.formState.errors.siteId && (
            <p className="text-sm text-red-600 font-medium">{form.formState.errors.siteId.message}</p>
          )}
        </div>

        {/* 2. Customer Selector */}
        <div className="space-y-2" ref={customerContainerRef}>
          <Label htmlFor="customerId" className="text-xs font-bold tracking-widest uppercase opacity-60">2. Customer *</Label>
          <div className="relative">
            <Input
              id="customerId"
              placeholder={watchedSiteId ? "Search customer..." : "First, select a site above"}
              value={customerSearch}
              ref={customerInputRef}
              disabled={!watchedSiteId}
              autoComplete="off"
              onFocus={() => {
                if (watchedSiteId && filteredCustomers.length > 0) {
                  setCustomerDropdownOpen(true);
                }
              }}
              onBlur={() => {
                const exactMatch = filteredCustomers.find(c => c.name.toLowerCase() === customerSearch.toLowerCase());
                if (exactMatch) handleCustomerSelect(exactMatch);
              }}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setHighlightedCustomerIndex(0);
                setCustomerDropdownOpen(true);
              }}
              onKeyDown={handleCustomerKeyDown}
              className="h-12 focus:ring-2 focus:ring-primary pr-10 bg-muted/30 border-none rounded-none disabled:opacity-30"
            />
            <ChevronDown 
              className={`absolute right-3 top-4 h-4 w-4 transition-transform ${
                customerDropdownOpen ? 'rotate-180' : ''
              }`}
            />
            
            {/* Customer Dropdown */}
            {customerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-none shadow-xl max-h-60 overflow-auto">
                {customersLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, index) => (
                    <div
                      key={customer.id}
                      className={`px-4 py-3 cursor-pointer border-b border-border/50 last:border-0 ${
                        index === highlightedCustomerIndex ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => handleCustomerSelect(customer)}
                      onMouseEnter={() => setHighlightedCustomerIndex(index)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-xs">{customer.name}</span>
                        <span className="text-[9px] opacity-40 font-mono tracking-tighter">MID: {customer.id.substring(0, 8)}...</span>
                      </div>
                      <div className="text-[10px] uppercase tracking-wider opacity-60 font-medium">Flat {customer.flatNumber} | Pending: ₹{customer.remaining.toLocaleString('en-IN')}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm italic opacity-50">{watchedSiteId ? "No customers found" : "Select a site first"}</div>
                )}
              </div>
            )}
          </div>
          {form.formState.errors.customerId && (
            <p className="text-sm text-red-600 font-medium">{form.formState.errors.customerId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* 3. Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-bold tracking-widest uppercase opacity-60">3. Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('amount', { valueAsNumber: true })}
              ref={(e) => {
                form.register('amount', { valueAsNumber: true }).ref(e);
                amountInputRef.current = e;
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const current = form.getValues('amount');
                  form.setValue('amount', current + 100, { shouldValidate: true, shouldDirty: true });
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const current = form.getValues('amount');
                  form.setValue('amount', Math.max(0, current - 100), { shouldValidate: true, shouldDirty: true });
                }
              }}
              className="h-12 focus:ring-2 focus:ring-primary bg-muted/30 border-none rounded-none text-lg font-bold"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-600 font-medium">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* 4. Date Field */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-xs font-bold tracking-widest uppercase opacity-60">4. Date</Label>
            <Input
              id="date"
              type="date"
              {...form.register('date')}
              ref={(e) => {
                form.register('date').ref(e);
                dateInputRef.current = e;
              }}
              className="h-12 focus:ring-2 focus:ring-primary bg-muted/30 border-none rounded-none"
            />
            {form.formState.errors.date && (
              <p className="text-sm text-red-600 font-medium">{form.formState.errors.date.message}</p>
            )}
          </div>
        </div>

        {/* 5. Note/Reference */}
        <div className="space-y-2">
          <Label htmlFor="note" className="text-xs font-bold tracking-widest uppercase opacity-60">5. Note / Reference</Label>
          <Textarea
            id="note"
            {...form.register('note')}
            ref={(e) => {
              form.register('note').ref(e);
              noteInputRef.current = e;
            }}
            placeholder="Add any additional notes (Optional)... [Press Tab/Arrows to focus buttons]"
            className="min-h-[80px] focus:ring-2 focus:ring-primary bg-muted/30 border-none rounded-none resize-none pt-4"
          />
          {form.formState.errors.note && (
            <p className="text-sm text-red-600 font-medium">{form.formState.errors.note.message}</p>
          )}
        </div>

        {/* Modular Footer */}
        <TransactionFormFooter 
          onBack={onCancel || (() => {})}
          isSubmitting={isPending}
          isValid={form.formState.isValid}
        />
      </form>
    </div>
  );
}
