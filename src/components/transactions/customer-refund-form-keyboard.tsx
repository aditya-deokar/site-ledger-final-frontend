'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowLeft, ChevronDown } from 'lucide-react';
import { TransactionFormFooter } from './transaction-form-footer';
import { useTransactionForm } from '@/hooks/use-transaction-form';

// Types
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  flatNumber?: string;
  totalPaid?: number;
  totalRefunded?: number;
}

interface Site {
  id: string;
  name: string;
  flatNumber: string;
  remaining: number;
}

// Form schema
const customerRefundSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  siteId: z.string().min(1, 'Site is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

type CustomerRefundInput = z.infer<typeof customerRefundSchema>;

interface CustomerRefundFormKeyboardProps {
  onSubmit: (data: CustomerRefundInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
  customers?: Customer[];
  sites?: Site[];
  sitesLoading?: boolean;
}

export function CustomerRefundFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onReset,
  onCancel,
  customers = [],
  sites = [],
  sitesLoading = false
}: CustomerRefundFormKeyboardProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [highlightedSiteIndex, setHighlightedSiteIndex] = useState(0);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const [siteSearch, setSiteSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const siteContainerRef = useRef<HTMLDivElement>(null);
  const customerContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<CustomerRefundInput>({
    resolver: zodResolver(customerRefundSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
      siteId: '',
      customerId: '',
    },
    mode: 'onChange',
  });

  // Refs for focus management
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const siteInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Customer -> Site -> Amount -> Date -> Note -> Submit
   * 2. Form Navigation:
   *    - Next: ArrowRight, ArrowDown (non-input), Enter (non-textarea)
   *    - Prev: ArrowLeft, ArrowUp (non-input)
   * 3. Dropdown Behavior (when open):
   *    - Arrows: Navigate items
   *    - Enter: Select item & move to next field
   *    - Choice: Select first and move to next
   * 4. Multi-item fields (Number/Date):
   *    - Arrows: Increment/Decrement value
   *    - Navigation skip: Use ArrowLeft/Right instead
   */
  const formFields = [
    { ref: customerInputRef, name: 'customer' },
    { ref: siteInputRef, name: 'site' },
    { ref: amountInputRef, name: 'amount' },
    { ref: dateInputRef, name: 'date' },
    { ref: noteInputRef, name: 'note' },
  ];

  // Enhanced form navigation with proper field detection and dropdown priority
  useEffect(() => {
    const handleFormNavigation = (e: KeyboardEvent) => {
      // 1. If a dropdown is open, let the dropdown's own keydown handler take priority for Arrows/Enter/Escape
      if (siteDropdownOpen || customerDropdownOpen) {
        if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
          return;
        }
      }

      const currentFocusedElement = document.activeElement as HTMLElement;
      let currentFieldIndex = formFields.findIndex(field => 
        field.ref.current === currentFocusedElement || field.ref.current?.contains(currentFocusedElement)
      );

      if (currentFieldIndex === -1) return;

      const isNumericInput = currentFocusedElement.tagName === 'INPUT' && (currentFocusedElement as HTMLInputElement).type === 'number';
      const isDateInput = currentFocusedElement.tagName === 'INPUT' && (currentFocusedElement as HTMLInputElement).type === 'date';
      const isTextArea = currentFocusedElement.tagName === 'TEXTAREA';

      // Rules for "Next" (ArrowRight, ArrowDown, Enter)
      if (e.key === 'ArrowRight' || e.key === 'Tab' || (e.key === 'Enter' && !isTextArea)) {
        // Tab should follow default browser behavior unless we want to override it
        if (e.key === 'Tab') return; 
        
        // Don't use ArrowDown for navigation in number/date inputs or textareas
        if (e.key === 'ArrowDown' && (isNumericInput || isDateInput || isTextArea)) return;

        e.preventDefault();
        const nextIndex = (currentFieldIndex + 1) % formFields.length;
        formFields[nextIndex].ref.current?.focus();
      } 
      // Rules for "Previous" (ArrowLeft, ArrowUp)
      else if (e.key === 'ArrowLeft' || (e.key === 'Shift' && e.shiftKey)) {
        // Shift+Tab is handled by browser
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = (currentFieldIndex - 1 + formFields.length) % formFields.length;
          formFields[prevIndex].ref.current?.focus();
        }
      }
      else if (e.key === 'ArrowUp') {
        // Don't use ArrowUp for navigation in number/date inputs or textareas
        if (isNumericInput || isDateInput || isTextArea) return;
        
        e.preventDefault();
        const prevIndex = (currentFieldIndex - 1 + formFields.length) % formFields.length;
        formFields[prevIndex].ref.current?.focus();
      }
      else if (e.key === 'ArrowDown') {
        // Handled in "Next" section above, but explicit check here for clarity
        // If we reached here, it's a non-numeric/non-date/non-textarea input
        e.preventDefault();
        const nextIndex = (currentFieldIndex + 1) % formFields.length;
        formFields[nextIndex].ref.current?.focus();
      }
    };

    document.addEventListener('keydown', handleFormNavigation);
    return () => document.removeEventListener('keydown', handleFormNavigation);
  }, [siteDropdownOpen, customerDropdownOpen, formFields]);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Filter sites based on input
  const filteredSites = sites.filter(site => 
    site.name.toLowerCase().includes(siteSearch.toLowerCase())
  ).slice(0, 3);

  // Filter customers based on input
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 3);

  // Watch for site changes
  const watchedSiteId = form.watch('siteId');
  const selectedSite = sites.find(s => s.id === watchedSiteId);
  
  // Update selected site ID when form value changes
  useEffect(() => {
    if (watchedSiteId !== selectedSiteId) {
      setSelectedSiteId(watchedSiteId);
      form.setValue('customerId', '');
      setCustomerSearch('');
    }
  }, [watchedSiteId, selectedSiteId, form]);

  // Handle keyboard navigation block/intercept
  useEffect(() => {
    const interceptNavigationKeys = (e: KeyboardEvent) => {
      const isAltBackspace = e.key === 'Backspace' && e.altKey;
      const isEscape = e.key === 'Escape';
      const isAltArrow = e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight');

      // Block browser history navigation with Alt + Arrows
      if (isAltArrow) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Strictly handle our navigation keys even if in inputs
      if (isAltBackspace || (isEscape && !siteDropdownOpen && !customerDropdownOpen)) {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      }
    };

    // Use capture phase to get the event before inputs do
    document.addEventListener('keydown', interceptNavigationKeys, true);
    return () => document.removeEventListener('keydown', interceptNavigationKeys, true);
  }, [onCancel, siteDropdownOpen, customerDropdownOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (siteContainerRef.current && !siteContainerRef.current.contains(event.target as Node)) {
        setSiteDropdownOpen(false);
      }
      if (customerContainerRef.current && !customerContainerRef.current.contains(event.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // KeyMaster integration
  const { focusElement } = useTransactionForm({
    onSave: () => {
      if (form.formState.isValid) {
        form.handleSubmit(onSubmit)();
      }
    },
    onBack: () => onCancel?.(),
    isValid: form.formState.isValid,
    siteDropdownOpen,
    customerDropdownOpen,
  });

  const handleSubmit = (data: CustomerRefundInput) => {
    onSubmit(data);
  };

  // Site dropdown handlers
  const handleSiteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!siteDropdownOpen) {
        setSiteDropdownOpen(true);
      } else {
        setHighlightedSiteIndex(prev => 
          prev < filteredSites.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (siteDropdownOpen) {
        setHighlightedSiteIndex(prev => 
          prev > 0 ? prev - 1 : filteredSites.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (siteDropdownOpen) {
        e.preventDefault();
        const selectedSite = filteredSites[highlightedSiteIndex];
        if (selectedSite) {
          handleSiteSelect(selectedSite);
        }
      } else {
        // If dropdown is closed, Enter moves to next field
        // This is handled by handleFormNavigation
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSiteDropdownOpen(false);
    }
  };

  const handleSiteSelect = (site: Site) => {
    form.setValue('siteId', site.id);
    setSiteSearch(site.name);
    setSiteDropdownOpen(false);
    // Use setTimeout to ensure the field is re-enabled before focusing
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 0);
  };

  // Customer dropdown handlers
  const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!customerDropdownOpen) {
        setCustomerDropdownOpen(true);
        setHighlightedCustomerIndex(0);
      } else {
        setHighlightedCustomerIndex(prev => 
          prev < filteredCustomers.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp' && customerDropdownOpen) {
      e.preventDefault();
      setHighlightedCustomerIndex(prev => prev > 0 ? prev - 1 : filteredCustomers.length - 1);
    } else if (e.key === 'Enter') {
      if (customerDropdownOpen) {
        e.preventDefault();
        const selectedCustomer = filteredCustomers[highlightedCustomerIndex];
        if (selectedCustomer) {
          handleCustomerSelect(selectedCustomer);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCustomerDropdownOpen(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    form.setValue('customerId', customer.id);
    setCustomerSearch(customer.name);
    setCustomerDropdownOpen(false);
    // Next field in sequence
    setTimeout(() => {
      siteInputRef.current?.focus();
    }, 0);
  };

  const selectedCustomer = customers.find(c => c.id === form.watch('customerId'));

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Customer refund processed successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <AlertDescription className="text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Selector */}
        <div className="space-y-2" ref={customerContainerRef}>
          <Label htmlFor="customer">Customer *</Label>
          <div className="relative">
            <Input
              id="customer"
              placeholder="Select a customer"
              value={customerSearch}
              ref={customerInputRef}
              autoComplete="off"
              onFocus={() => {
                if (filteredCustomers.length > 0) {
                  setCustomerDropdownOpen(true);
                }
              }}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setHighlightedCustomerIndex(0);
                setCustomerDropdownOpen(true);
              }}
              onKeyDown={handleCustomerKeyDown}
              className="focus:ring-2 focus:ring-primary pr-10"
            />
            <ChevronDown 
              className={`absolute right-3 top-3 h-4 w-4 transition-transform ${
                customerDropdownOpen ? 'rotate-180' : ''
              }`}
            />
            
            {/* Customer Dropdown */}
            {customerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, index) => (
                    <div
                      key={customer.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                        index === highlightedCustomerIndex ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleCustomerSelect(customer)}
                      onMouseEnter={() => setHighlightedCustomerIndex(index)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {customer.flatNumber && `Flat ${customer.flatNumber} `}
                        {customer.totalPaid && `Paid: Rs. ${customer.totalPaid.toLocaleString('en-IN')}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">No customers found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Site Selector */}
        <div className="space-y-2" ref={siteContainerRef}>
          <Label htmlFor="site">Site *</Label>
          <div className="relative">
            <Input
              id="site"
              placeholder="Select a site"
              value={siteSearch}
              ref={siteInputRef}
              autoComplete="off"
              onFocus={() => {
                if (filteredSites.length > 0) {
                  setSiteDropdownOpen(true);
                }
              }}
              onChange={(e) => {
                setSiteSearch(e.target.value);
                setHighlightedSiteIndex(0);
                setSiteDropdownOpen(true);
              }}
              onKeyDown={handleSiteKeyDown}
              disabled={!watchedSiteId}
              className="focus:ring-2 focus:ring-primary pr-10"
            />
            <ChevronDown 
              className={`absolute right-3 top-3 h-4 w-4 transition-transform ${
                siteDropdownOpen ? 'rotate-180' : ''
              }`}
            />
            
            {/* Site Dropdown */}
            {siteDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {sitesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredSites.length > 0 ? (
                  filteredSites.map((site, index) => (
                    <div
                      key={site.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                        index === highlightedSiteIndex ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleSiteSelect(site)}
                      onMouseEnter={() => setHighlightedSiteIndex(index)}
                    >
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Flat {site.flatNumber} 
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">No sites found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Refund Amount *</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            {...form.register('amount', { valueAsNumber: true })}
            ref={amountInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        {/* Date Input */}
        <div className="space-y-2">
          <Label htmlFor="date">Refund Date *</Label>
          <Input
            id="date"
            type="date"
            {...form.register('date')}
            ref={dateInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.date && (
            <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
          )}
        </div>
      </div>

      {/* Note Field */}
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <textarea
          id="note"
          placeholder="Add any additional notes..."
          {...form.register('note')}
          ref={noteInputRef}
          rows={3}
          className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
      </div>

      {/* Selected Customer/Site Summary */}
      {(selectedCustomer || selectedSite) && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedCustomer && (
                <div>
                  <span className="font-medium">Customer:</span> {selectedCustomer.name}
                  {selectedCustomer.flatNumber && ` (Flat ${selectedCustomer.flatNumber})`}
                </div>
              )}
              {selectedSite && (
                <div>
                  <span className="font-medium">Site:</span> {selectedSite.name}
                  {selectedSite.flatNumber && ` (Flat ${selectedSite.flatNumber})`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Footer */}
      <TransactionFormFooter
        onBack={() => onCancel?.()}
        isSubmitting={isPending || false}
        isValid={form.formState.isValid}
        backLabel="Back [Ctrl+BK]"
        saveLabel="Refund [Ctrl+Enter]"
      />
    </form>
  );
}
