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
interface Site {
  id: string;
  name: string;
  flatNumber: string;
  remaining: number;
}

// Form schema
const generalExpenseSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  note: z.string().optional(),
});

type GeneralExpenseInput = z.infer<typeof generalExpenseSchema>;

interface GeneralExpenseFormKeyboardProps {
  onSubmit: (data: GeneralExpenseInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
  sites?: Site[];
  sitesLoading?: boolean;
}

export function GeneralExpenseFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onReset,
  onCancel,
  sites = [],
  sitesLoading = false
}: GeneralExpenseFormKeyboardProps) {
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [highlightedSiteIndex, setHighlightedSiteIndex] = useState(0);
  const [siteSearch, setSiteSearch] = useState('');
  
  const siteContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<GeneralExpenseInput>({
    resolver: zodResolver(generalExpenseSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      note: '',
      siteId: '',
    },
    mode: 'onChange',
  });

  // Refs for focus management
  const siteInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Site -> Description -> Amount -> Date -> Note -> Submit
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
    { ref: siteInputRef, name: 'site' },
    { ref: descriptionInputRef, name: 'description' },
    { ref: amountInputRef, name: 'amount' },
    { ref: dateInputRef, name: 'date' },
    { ref: noteInputRef, name: 'note' },
  ];

  // Enhanced form navigation with proper field detection and dropdown priority
  useEffect(() => {
    const handleFormNavigation = (e: KeyboardEvent) => {
      // 1. If a dropdown is open, let the dropdown's own keydown handler take priority for Arrows/Enter/Escape
      if (siteDropdownOpen) {
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
  }, [siteDropdownOpen, formFields]);

  // Filter sites based on input
  const filteredSites = sites.filter(site => 
    site.name.toLowerCase().includes(siteSearch.toLowerCase())
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
      if (isAltBackspace || (isEscape && !siteDropdownOpen)) {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      }
    };

    // Use capture phase to get the event before inputs do
    document.addEventListener('keydown', interceptNavigationKeys, true);
    return () => document.removeEventListener('keydown', interceptNavigationKeys, true);
  }, [onCancel, siteDropdownOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (siteContainerRef.current && !siteContainerRef.current.contains(event.target as Node)) {
        setSiteDropdownOpen(false);
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
    customerDropdownOpen: false,
  });

  const handleSubmit = (data: GeneralExpenseInput) => {
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
      descriptionInputRef.current?.focus();
    }, 0);
  };

  const selectedSite = sites.find(s => s.id === form.watch('siteId'));

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            General expense recorded successfully!
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

        {/* Description Input */}
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            placeholder="What was this expense for?"
            {...form.register('description')}
            ref={descriptionInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.description && (
            <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
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
          <Label htmlFor="date">Date *</Label>
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
          placeholder="Add any additional details..."
          {...form.register('note')}
          ref={noteInputRef}
          rows={3}
          className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
      </div>

      {/* Selected Site Summary */}
      {selectedSite && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-sm">
              <span className="font-medium">Site:</span> {selectedSite.name}
              {selectedSite.flatNumber && ` (Flat ${selectedSite.flatNumber})`}
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
        saveLabel="Record [Ctrl+Enter]"
      />
    </form>
  );
}
