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
interface Investor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalInvested?: number;
  currentBalance?: number;
}

// Form schema
const investorPrincipalInSchema = z.object({
  investorId: z.string().min(1, 'Investor is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

type InvestorPrincipalInInput = z.infer<typeof investorPrincipalInSchema>;

interface InvestorPrincipalInFormKeyboardProps {
  onSubmit: (data: InvestorPrincipalInInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
  investors?: Investor[];
  investorsLoading?: boolean;
}

export function InvestorPrincipalInFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onReset,
  onCancel,
  investors = [],
  investorsLoading = false
}: InvestorPrincipalInFormKeyboardProps) {
  const [investorDropdownOpen, setInvestorDropdownOpen] = useState(false);
  const [highlightedInvestorIndex, setHighlightedInvestorIndex] = useState(0);
  const [investorSearch, setInvestorSearch] = useState('');
  
  const investorContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<InvestorPrincipalInInput>({
    resolver: zodResolver(investorPrincipalInSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
      investorId: '',
    },
    mode: 'onChange',
  });

  // Refs for focus management
  const investorInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Investor -> Amount -> Date -> Note -> Submit
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
    { ref: investorInputRef, name: 'investor' },
    { ref: amountInputRef, name: 'amount' },
    { ref: dateInputRef, name: 'date' },
    { ref: noteInputRef, name: 'note' },
  ];

  // Enhanced form navigation with proper field detection and dropdown priority
  useEffect(() => {
    const handleFormNavigation = (e: KeyboardEvent) => {
      // 1. If a dropdown is open, let the dropdown's own keydown handler take priority for Arrows/Enter/Escape
      if (investorDropdownOpen) {
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
  }, [investorDropdownOpen, formFields]);

  // Filter investors based on input
  const filteredInvestors = investors.filter(investor => 
    investor.name.toLowerCase().includes(investorSearch.toLowerCase())
  ).slice(0, 3);

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
      if (isAltBackspace || (isEscape && !investorDropdownOpen)) {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      }
    };

    // Use capture phase to get the event before inputs do
    document.addEventListener('keydown', interceptNavigationKeys, true);
    return () => document.removeEventListener('keydown', interceptNavigationKeys, true);
  }, [onCancel, investorDropdownOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (investorContainerRef.current && !investorContainerRef.current.contains(event.target as Node)) {
        setInvestorDropdownOpen(false);
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
    siteDropdownOpen: false,
    customerDropdownOpen: investorDropdownOpen,
  });

  const handleSubmit = (data: InvestorPrincipalInInput) => {
    onSubmit(data);
  };

  // Investor dropdown handlers
  const handleInvestorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!investorDropdownOpen) {
        setInvestorDropdownOpen(true);
      } else {
        setHighlightedInvestorIndex(prev => 
          prev < filteredInvestors.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (investorDropdownOpen) {
        setHighlightedInvestorIndex(prev => 
          prev > 0 ? prev - 1 : filteredInvestors.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (investorDropdownOpen) {
        e.preventDefault();
        const selectedInvestor = filteredInvestors[highlightedInvestorIndex];
        if (selectedInvestor) {
          handleInvestorSelect(selectedInvestor);
        }
      } else {
        // If dropdown is closed, Enter moves to next field
        // This is handled by handleFormNavigation
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInvestorDropdownOpen(false);
    }
  };

  const handleInvestorSelect = (investor: Investor) => {
    form.setValue('investorId', investor.id);
    setInvestorSearch(investor.name);
    setInvestorDropdownOpen(false);
    // Use setTimeout to ensure the field is re-enabled before focusing
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 0);
  };

  const selectedInvestor = investors.find(i => i.id === form.watch('investorId'));

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Investor deposit recorded successfully!
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
        {/* Investor Selector */}
        <div className="space-y-2" ref={investorContainerRef}>
          <Label htmlFor="investor">Investor *</Label>
          <div className="relative">
            <Input
              id="investor"
              placeholder="Select an investor"
              value={investorSearch}
              ref={investorInputRef}
              autoComplete="off"
              onFocus={() => {
                if (filteredInvestors.length > 0) {
                  setInvestorDropdownOpen(true);
                }
              }}
              onChange={(e) => {
                setInvestorSearch(e.target.value);
                setHighlightedInvestorIndex(0);
                setInvestorDropdownOpen(true);
              }}
              onKeyDown={handleInvestorKeyDown}
              className="focus:ring-2 focus:ring-primary pr-10"
            />
            <ChevronDown 
              className={`absolute right-3 top-3 h-4 w-4 transition-transform ${
                investorDropdownOpen ? 'rotate-180' : ''
              }`}
            />
            
            {/* Investor Dropdown */}
            {investorDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {investorsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredInvestors.length > 0 ? (
                  filteredInvestors.map((investor, index) => (
                    <div
                      key={investor.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                        index === highlightedInvestorIndex ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleInvestorSelect(investor)}
                      onMouseEnter={() => setHighlightedInvestorIndex(index)}
                    >
                      <div className="font-medium">{investor.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {investor.totalInvested && `Invested: Rs. ${investor.totalInvested.toLocaleString('en-IN')}`}
                        {investor.currentBalance && ` Balance: Rs. ${investor.currentBalance.toLocaleString('en-IN')}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">No investors found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Investment Amount *</Label>
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
          <Label htmlFor="date">Investment Date *</Label>
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

        {/* Note Field (spans full width) */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">Note</Label>
          <textarea
            id="note"
            placeholder="Add any additional details about this investment..."
            {...form.register('note')}
            ref={noteInputRef}
            rows={3}
            className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Selected Investor Summary */}
      {selectedInvestor && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-sm">
              <span className="font-medium">Investor:</span> {selectedInvestor.name}
              {selectedInvestor.totalInvested && ` | Total Invested: Rs. ${selectedInvestor.totalInvested.toLocaleString('en-IN')}`}
              {selectedInvestor.currentBalance && ` | Current Balance: Rs. ${selectedInvestor.currentBalance.toLocaleString('en-IN')}`}
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
        saveLabel="Deposit [Ctrl+Enter]"
      />
    </form>
  );
}
