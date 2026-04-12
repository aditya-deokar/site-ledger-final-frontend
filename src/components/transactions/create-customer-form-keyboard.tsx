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
}

// Form schema
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  flatNumber: z.string().min(1, 'Flat number is required'),
  siteId: z.string().min(1, 'Site is required'),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

interface CreateCustomerFormKeyboardProps {
  onSubmit: (data: CreateCustomerInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
  sites?: Site[];
  sitesLoading?: boolean;
}

export function CreateCustomerFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onReset,
  onCancel,
  sites = [],
  sitesLoading = false
}: CreateCustomerFormKeyboardProps) {
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [highlightedSiteIndex, setHighlightedSiteIndex] = useState(0);
  const [siteSearch, setSiteSearch] = useState('');
  
  const siteContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      flatNumber: '',
      siteId: '',
      address: '',
      notes: '',
    },
    mode: 'onChange',
  });

  // Refs for focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const siteInputRef = useRef<HTMLInputElement>(null);
  const flatNumberInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Name -> Email -> Phone -> Site -> Flat Number -> Address -> Notes -> Submit
   * 2. Form Navigation:
   *    - Next: ArrowRight, ArrowDown (non-input), Enter (non-textarea)
   *    - Prev: ArrowLeft, ArrowUp (non-input)
   * 3. Dropdown Behavior (when open):
   *    - Arrows: Navigate items
   *    - Enter: Select item & move to next field
   *    - Choice: Select first and move to next
   */
  const formFields = [
    { ref: nameInputRef, name: 'name' },
    { ref: emailInputRef, name: 'email' },
    { ref: phoneInputRef, name: 'phone' },
    { ref: siteInputRef, name: 'site' },
    { ref: flatNumberInputRef, name: 'flatNumber' },
    { ref: addressInputRef, name: 'address' },
    { ref: notesInputRef, name: 'notes' },
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

      const isTextArea = currentFocusedElement.tagName === 'TEXTAREA';

      // Rules for "Next" (ArrowRight, ArrowDown, Enter)
      if (e.key === 'ArrowRight' || e.key === 'Tab' || (e.key === 'Enter' && !isTextArea)) {
        // Tab should follow default browser behavior unless we want to override it
        if (e.key === 'Tab') return; 
        
        // Don't use ArrowDown for navigation in textareas
        if (e.key === 'ArrowDown' && isTextArea) return;

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
        // Don't use ArrowUp for navigation in textareas
        if (isTextArea) return;
        
        e.preventDefault();
        const prevIndex = (currentFieldIndex - 1 + formFields.length) % formFields.length;
        formFields[prevIndex].ref.current?.focus();
      }
      else if (e.key === 'ArrowDown') {
        // Handled in "Next" section above, but explicit check here for clarity
        // If we reached here, it's a non-textarea input
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

  const handleSubmit = (data: CreateCustomerInput) => {
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
    // Auto-fill flat number if available
    if (site.flatNumber && !form.watch('flatNumber')) {
      form.setValue('flatNumber', site.flatNumber);
    }
    // Use setTimeout to ensure the field is re-enabled before focusing
    setTimeout(() => {
      flatNumberInputRef.current?.focus();
    }, 0);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Customer created successfully!
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
        {/* Customer Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Customer Name *</Label>
          <Input
            id="name"
            placeholder="Enter customer name"
            {...form.register('name')}
            ref={nameInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="customer@example.com"
            {...form.register('email')}
            ref={emailInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="9876543210"
            {...form.register('phone')}
            ref={phoneInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
          )}
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

        {/* Flat Number */}
        <div className="space-y-2">
          <Label htmlFor="flatNumber">Flat Number *</Label>
          <Input
            id="flatNumber"
            placeholder="A-101"
            {...form.register('flatNumber')}
            ref={flatNumberInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.flatNumber && (
            <p className="text-sm text-red-600">{form.formState.errors.flatNumber.message}</p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="Customer address"
            {...form.register('address')}
            ref={addressInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Notes Field */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <textarea
          id="notes"
          placeholder="Add any additional notes about this customer..."
          {...form.register('notes')}
          ref={notesInputRef}
          rows={3}
          className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
      </div>

      {/* Customer Summary */}
      {form.watch('name') && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-sm">
              <span className="font-medium">New Customer:</span> {form.watch('name')}
              {form.watch('email') && ` | ${form.watch('email')}`}
              {form.watch('phone') && ` | ${form.watch('phone')}`}
              {form.watch('flatNumber') && ` | Flat ${form.watch('flatNumber')}`}
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
        saveLabel="Create Customer [Ctrl+Enter]"
      />
    </form>
  );
}
