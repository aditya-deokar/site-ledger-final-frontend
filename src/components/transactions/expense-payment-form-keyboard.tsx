'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowLeft, ChevronDown } from 'lucide-react';
import { TransactionFormFooter } from './transaction-form-footer';
import { useTransactionForm } from '@/hooks/use-transaction-form';

// Types
interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  service?: string;
  totalOwed?: number;
  pendingBills?: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
  }>;
}

// Form schema
const expensePaymentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  billId: z.string().optional(),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

type ExpensePaymentInput = z.infer<typeof expensePaymentSchema>;

interface ExpensePaymentFormKeyboardProps {
  onSubmit: (data: ExpensePaymentInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
  vendors?: Vendor[];
  vendorsLoading?: boolean;
}

export function ExpensePaymentFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onReset,
  onCancel,
  vendors = [],
  vendorsLoading = false
}: ExpensePaymentFormKeyboardProps) {
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [billDropdownOpen, setBillDropdownOpen] = useState(false);
  const [highlightedVendorIndex, setHighlightedVendorIndex] = useState(0);
  const [highlightedBillIndex, setHighlightedBillIndex] = useState(0);
  const [vendorSearch, setVendorSearch] = useState('');
  
  const vendorContainerRef = useRef<HTMLDivElement>(null);
  const billContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<ExpensePaymentInput>({
    resolver: zodResolver(expensePaymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
      vendorId: '',
      billId: '',
    },
    mode: 'onChange',
  });

  // Refs for focus management
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const billInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Vendor -> Bill -> Amount -> Date -> Note -> Submit
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
    { ref: vendorInputRef, name: 'vendor' },
    { ref: billInputRef, name: 'bill' },
    { ref: amountInputRef, name: 'amount' },
    { ref: dateInputRef, name: 'date' },
    { ref: noteInputRef, name: 'note' },
  ];

  // Enhanced form navigation with proper field detection and dropdown priority
  useEffect(() => {
    const handleFormNavigation = (e: KeyboardEvent) => {
      // 1. If a dropdown is open, let the dropdown's own keydown handler take priority for Arrows/Enter/Escape
      if (vendorDropdownOpen || billDropdownOpen) {
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
  }, [vendorDropdownOpen, billDropdownOpen, formFields]);

  // Filter vendors based on input
  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(vendorSearch.toLowerCase())
  ).slice(0, 3);

  // Get pending bills for selected vendor
  const selectedVendor = vendors.find(v => v.id === form.watch('vendorId'));
  const pendingBills = selectedVendor?.pendingBills || [];

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
      if (isAltBackspace || (isEscape && !vendorDropdownOpen && !billDropdownOpen)) {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      }
    };

    // Use capture phase to get the event before inputs do
    document.addEventListener('keydown', interceptNavigationKeys, true);
    return () => document.removeEventListener('keydown', interceptNavigationKeys, true);
  }, [onCancel, vendorDropdownOpen, billDropdownOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorContainerRef.current && !vendorContainerRef.current.contains(event.target as Node)) {
        setVendorDropdownOpen(false);
      }
      if (billContainerRef.current && !billContainerRef.current.contains(event.target as Node)) {
        setBillDropdownOpen(false);
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
    siteDropdownOpen: vendorDropdownOpen,
    customerDropdownOpen: billDropdownOpen,
  });

  const handleSubmit = (data: ExpensePaymentInput) => {
    onSubmit(data);
  };

  // Vendor dropdown handlers
  const handleVendorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!vendorDropdownOpen) {
        setVendorDropdownOpen(true);
      } else {
        setHighlightedVendorIndex(prev => 
          prev < filteredVendors.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (vendorDropdownOpen) {
        setHighlightedVendorIndex(prev => 
          prev > 0 ? prev - 1 : filteredVendors.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (vendorDropdownOpen) {
        e.preventDefault();
        const selectedVendor = filteredVendors[highlightedVendorIndex];
        if (selectedVendor) {
          handleVendorSelect(selectedVendor);
        }
      } else {
        // If dropdown is closed, Enter moves to next field
        // This is handled by handleFormNavigation
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setVendorDropdownOpen(false);
    }
  };

  const handleVendorSelect = (vendor: Vendor) => {
    form.setValue('vendorId', vendor.id);
    setVendorSearch(vendor.name);
    setVendorDropdownOpen(false);
    // Reset bill selection when vendor changes
    form.setValue('billId', '');
    // Use setTimeout to ensure the field is re-enabled before focusing
    setTimeout(() => {
      billInputRef.current?.focus();
    }, 0);
  };

  // Bill dropdown handlers
  const handleBillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!billDropdownOpen) {
        setBillDropdownOpen(true);
      } else {
        setHighlightedBillIndex(prev => 
          prev < pendingBills.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (billDropdownOpen) {
        setHighlightedBillIndex(prev => 
          prev > 0 ? prev - 1 : pendingBills.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (billDropdownOpen) {
        e.preventDefault();
        const selectedBill = pendingBills[highlightedBillIndex];
        if (selectedBill) {
          handleBillSelect(selectedBill);
        }
      } else {
        // If dropdown is closed, Enter moves to next field
        // This is handled by handleFormNavigation
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setBillDropdownOpen(false);
    }
  };

  const handleBillSelect = (bill: any) => {
    form.setValue('billId', bill.id);
    form.setValue('amount', bill.amount);
    setBillDropdownOpen(false);
    // Use setTimeout to ensure the field is re-enabled before focusing
    setTimeout(() => {
      dateInputRef.current?.focus();
    }, 0);
  };

  const selectedBill = pendingBills.find(b => b.id === form.watch('billId'));

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Vendor payment recorded successfully!
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
        {/* Vendor Selector */}
        <div className="space-y-2" ref={vendorContainerRef}>
          <Label htmlFor="vendor">Vendor *</Label>
          <div className="relative">
            <Input
              id="vendor"
              placeholder="Select a vendor"
              value={vendorSearch}
              ref={vendorInputRef}
              autoComplete="off"
              onFocus={() => {
                if (filteredVendors.length > 0) {
                  setVendorDropdownOpen(true);
                }
              }}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setHighlightedVendorIndex(0);
                setVendorDropdownOpen(true);
              }}
              onKeyDown={handleVendorKeyDown}
              className="focus:ring-2 focus:ring-primary pr-10"
            />
            <ChevronDown 
              className={`absolute right-3 top-3 h-4 w-4 transition-transform ${
                vendorDropdownOpen ? 'rotate-180' : ''
              }`}
            />
            
            {/* Vendor Dropdown */}
            {vendorDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {vendorsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor, index) => (
                    <div
                      key={vendor.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                        index === highlightedVendorIndex ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleVendorSelect(vendor)}
                      onMouseEnter={() => setHighlightedVendorIndex(index)}
                    >
                      <div className="font-medium">{vendor.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {vendor.service && `Service: ${vendor.service}`}
                        {vendor.totalOwed && ` Owed: Rs. ${vendor.totalOwed.toLocaleString('en-IN')}`}
                        {vendor.pendingBills && ` Bills: ${vendor.pendingBills.length}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">No vendors found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bill Selector */}
        <div className="space-y-2" ref={billContainerRef}>
          <Label htmlFor="bill">Select Bill (Optional)</Label>
          <div className="relative">
            <Input
              id="bill"
              placeholder="Select a pending bill"
              {...form.register('billId')}
              ref={billInputRef}
              disabled={!selectedVendor}
              onFocus={() => {
                if (pendingBills.length > 0) {
                  setBillDropdownOpen(true);
                }
              }}
              onKeyDown={handleBillKeyDown}
              className="focus:ring-2 focus:ring-primary pr-10"
            />
            <ChevronDown 
              className={`absolute right-3 top-3 h-4 w-4 transition-transform ${
                billDropdownOpen ? 'rotate-180' : ''
              }`}
            />
            
            {/* Bill Dropdown */}
            {billDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {pendingBills.length > 0 ? (
                  pendingBills.map((bill, index) => (
                    <div
                      key={bill.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                        index === highlightedBillIndex ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleBillSelect(bill)}
                      onMouseEnter={() => setHighlightedBillIndex(index)}
                    >
                      <div className="font-medium">{bill.description}</div>
                      <div className="text-sm text-muted-foreground">
                        Amount: Rs. {bill.amount.toLocaleString('en-IN')} | Date: {bill.date}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">
                    {selectedVendor ? 'No pending bills' : 'Select a vendor first'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Payment Amount *</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            {...form.register('amount', { valueAsNumber: true })}
            ref={amountInputRef}
            disabled={!!selectedBill}
            className="focus:ring-2 focus:ring-primary"
          />
          {selectedBill && (
            <p className="text-sm text-muted-foreground">
              Auto-filled from selected bill
            </p>
          )}
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        {/* Date Input */}
        <div className="space-y-2">
          <Label htmlFor="date">Payment Date *</Label>
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
          placeholder="Add any additional details about this payment..."
          {...form.register('note')}
          ref={noteInputRef}
          rows={3}
          className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
      </div>

      {/* Selected Vendor/Bill Summary */}
      {(selectedVendor || selectedBill) && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {selectedVendor && (
                <div>
                  <span className="font-medium">Vendor:</span> {selectedVendor.name}
                  {selectedVendor.service && ` (${selectedVendor.service})`}
                </div>
              )}
              {selectedBill && (
                <div>
                  <span className="font-medium">Bill:</span> {selectedBill.description}
                  <br />
                  <span className="text-muted-foreground">
                    Amount: Rs. {selectedBill.amount.toLocaleString('en-IN')}
                  </span>
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
        saveLabel="Pay [Ctrl+Enter]"
      />
    </form>
  );
}
