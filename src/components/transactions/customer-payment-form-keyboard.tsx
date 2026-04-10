'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2, ChevronDown, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { customerPaymentSchema, CustomerPaymentInput } from '@/schemas/transactions.schema';
import { useSites } from '@/hooks/api/site.hooks';
import { useSiteCustomers } from '@/hooks/api/customer.hooks';
import { Site } from '@/schemas/site.schema';
import { Customer } from '@/schemas/customer.schema';
import { useKeyboardManager, TRANSACTION_SHORTCUTS, GLOBAL_SHORTCUTS } from '@/hooks/use-keyboard-manager';

interface CustomerPaymentFormProps {
  onSubmit: (data: CustomerPaymentInput) => void;
  isPending: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
}

export function CustomerPaymentFormKeyboard({ onSubmit, isPending, error, success, onReset, onCancel }: CustomerPaymentFormProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [highlightedSiteIndex, setHighlightedSiteIndex] = useState(0);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const [siteSearch, setSiteSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const form = useForm<CustomerPaymentInput>({
    resolver: zodResolver(customerPaymentSchema),
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

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Site -> Customer -> Amount -> Date -> Note -> Submit
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
    { ref: amountInputRef, name: 'amount' },
    { ref: dateInputRef, name: 'date' },
    { ref: siteInputRef, name: 'site' },
    { ref: customerInputRef, name: 'customer' },
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

  // Fetch sites for dropdown
  const { data: sitesData, isLoading: sitesLoading } = useSites();
  const sites = sitesData?.data?.sites || [];

  // Fetch customers for selected site
  const { data: customersData, isLoading: customersLoading } = useSiteCustomers(selectedSiteId);
  const customers = customersData?.data?.customers || [];

  // Find selected customer details
  const selectedCustomer = customers.find(c => c.id === form.watch('customerId'));

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
  useEffect(() => {
    if (watchedSiteId !== selectedSiteId) {
      setSelectedSiteId(watchedSiteId);
      // Reset customer when site changes
      form.setValue('customerId', '');
      setHighlightedCustomerIndex(0);
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
  // Keyboard shortcuts
  const { focusElement } = useKeyboardManager({
    shortcuts: [
      {
        ...GLOBAL_SHORTCUTS.SUBMIT_FORM,
        action: () => {
          if (form.formState.isValid) {
            handleSubmit(form.getValues());
          }
        },
      },
      {
        ...GLOBAL_SHORTCUTS.RESET_FORM,
        action: () => {
          if (siteDropdownOpen) {
            setSiteDropdownOpen(false);
            return;
          }
          if (customerDropdownOpen) {
            setCustomerDropdownOpen(false);
            return;
          }
          
          // If no dropdown is open, go back
          onCancel?.();
        },
      },
      {
        ...GLOBAL_SHORTCUTS.FORCE_BACK,
        action: () => {
          onCancel?.();
        },
      },
    ],
  });

  const handleSubmit = (data: CustomerPaymentInput) => {
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
      customerInputRef.current?.focus();
    }, 0);
  };

  // Customer dropdown handlers
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
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
      amountInputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header removed to avoid duplication with parent Card */}

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

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('amount', { valueAsNumber: true })}
              ref={amountInputRef}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const current = form.getValues('amount');
                  form.setValue('amount', current + 100);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const current = form.getValues('amount');
                  form.setValue('amount', Math.max(0, current - 100));
                }
              }}
              className="focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Date Field */}
          <div className="space-y-2">
            <Label htmlFor="date">Payment Date</Label>
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
                      <div className="text-sm text-muted-foreground">{site.address}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">No sites found</div>
                )}
              </div>
            )}
          </div>
          {form.formState.errors.siteId && (
            <p className="text-sm text-red-600">{form.formState.errors.siteId.message}</p>
          )}
        </div>

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
              disabled={!watchedSiteId}
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
                {customersLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredCustomers.length > 0 ? (
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
                        Flat {customer.flatNumber} • Rs. {customer.remaining.toLocaleString('en-IN')} remaining
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">No customers found</div>
                )}
              </div>
            )}
          </div>
          {form.formState.errors.customerId && (
            <p className="text-sm text-red-600">{form.formState.errors.customerId.message}</p>
          )}
        </div>

        {/* Customer Details Card */}
        {selectedCustomer && (
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Flat:</span>
                  <p className="font-medium">Flat {selectedCustomer.flatNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Selling Price:</span>
                  <p className="font-medium">Rs. {selectedCustomer.sellingPrice.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining:</span>
                  <p className="font-medium text-red-600">Rs. {selectedCustomer.remaining.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Note Field */}
        <div className="space-y-2">
          <Label htmlFor="note">Note / Reference</Label>
          <Textarea
            id="note"
            placeholder="e.g. Cheque #123, NEFT reference, etc."
            {...form.register('note')}
            ref={noteInputRef}
            className="focus:ring-2 focus:ring-primary"
            rows={3}
          />
          {form.formState.errors.note && (
            <p className="text-sm text-red-600">{form.formState.errors.note.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (form.formState.isDirty) {
                // Simple confirmation without using confirm() to avoid script tag issues
                const shouldReset = window.confirm('Are you sure you want to reset the form?');
                if (shouldReset) {
                  form.reset();
                  onReset?.();
                }
              }
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isPending || !form.formState.isValid}
            ref={submitButtonRef}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording Payment...
              </>
            ) : (
              'Record Payment'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
