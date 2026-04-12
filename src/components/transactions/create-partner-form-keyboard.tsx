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
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { TransactionFormFooter } from './transaction-form-footer';
import { useTransactionForm } from '@/hooks/use-transaction-form';

// Form schema
const createPartnerSchema = z.object({
  name: z.string().min(1, 'Partner name is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  partnershipType: z.string().min(1, 'Partnership type is required'),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CreatePartnerInput = z.infer<typeof createPartnerSchema>;

interface CreatePartnerFormKeyboardProps {
  onSubmit: (data: CreatePartnerInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
}

export function CreatePartnerFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onReset,
  onCancel
}: CreatePartnerFormKeyboardProps) {
  const form = useForm<CreatePartnerInput>({
    resolver: zodResolver(createPartnerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      partnershipType: '',
      address: '',
      notes: '',
    },
    mode: 'onChange',
  });

  // Refs for focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  const partnershipTypeInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Name -> Partnership Type -> Email -> Phone -> Address -> Notes -> Submit
   * 2. Form Navigation:
   *    - Next: ArrowRight, ArrowDown (non-input), Enter (non-textarea)
   *    - Prev: ArrowLeft, ArrowUp (non-input)
   */
  const formFields = [
    { ref: nameInputRef, name: 'name' },
    { ref: partnershipTypeInputRef, name: 'partnershipType' },
    { ref: emailInputRef, name: 'email' },
    { ref: phoneInputRef, name: 'phone' },
    { ref: addressInputRef, name: 'address' },
    { ref: notesInputRef, name: 'notes' },
  ];

  // Enhanced form navigation with proper field detection and dropdown priority
  useEffect(() => {
    const handleFormNavigation = (e: KeyboardEvent) => {
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
  }, [formFields]);

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
      if (isAltBackspace || isEscape) {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      }
    };

    // Use capture phase to get the event before inputs do
    document.addEventListener('keydown', interceptNavigationKeys, true);
    return () => document.removeEventListener('keydown', interceptNavigationKeys, true);
  }, [onCancel]);

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
    customerDropdownOpen: false,
  });

  const handleSubmit = (data: CreatePartnerInput) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Partner created successfully!
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
        {/* Partner Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Partner Name *</Label>
          <Input
            id="name"
            placeholder="Enter partner name"
            {...form.register('name')}
            ref={nameInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Partnership Type */}
        <div className="space-y-2">
          <Label htmlFor="partnershipType">Partnership Type *</Label>
          <Input
            id="partnershipType"
            placeholder="e.g., Equity Partner, Managing Partner, Silent Partner"
            {...form.register('partnershipType')}
            ref={partnershipTypeInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {form.formState.errors.partnershipType && (
            <p className="text-sm text-red-600">{form.formState.errors.partnershipType.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="partner@example.com"
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

        {/* Address */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="Partner address"
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
          placeholder="Add any additional notes about this partner..."
          {...form.register('notes')}
          ref={notesInputRef}
          rows={3}
          className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
      </div>

      {/* Partner Summary */}
      {form.watch('name') && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-sm">
              <span className="font-medium">New Partner:</span> {form.watch('name')}
              {form.watch('partnershipType') && ` | ${form.watch('partnershipType')}`}
              {form.watch('email') && ` | ${form.watch('email')}`}
              {form.watch('phone') && ` | ${form.watch('phone')}`}
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
        saveLabel="Create Partner [Ctrl+Enter]"
      />
    </form>
  );
}
