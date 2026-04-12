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
const companyWithdrawalSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  note: z.string().optional(),
});

type CompanyWithdrawalInput = z.infer<typeof companyWithdrawalSchema>;

interface CompanyWithdrawalFormKeyboardProps {
  onSubmit: (data: CompanyWithdrawalInput) => void;
  isPending?: boolean;
  error?: string | null;
  success?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
  companyBalance?: number;
}

export function CompanyWithdrawalFormKeyboard({ 
  onSubmit, 
  isPending, 
  error, 
  success, 
  onReset,
  onCancel,
  companyBalance = 0
}: CompanyWithdrawalFormKeyboardProps) {
  const form = useForm<CompanyWithdrawalInput>({
    resolver: zodResolver(companyWithdrawalSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      note: '',
    },
    mode: 'onChange',
  });

  // Refs for focus management
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard Navigation Rules:
   * 1. Sequence: Description -> Amount -> Date -> Note -> Submit
   * 2. Form Navigation:
   *    - Next: ArrowRight, ArrowDown (non-input), Enter (non-textarea)
   *    - Prev: ArrowLeft, ArrowUp (non-input)
   * 3. Multi-item fields (Number/Date):
   *    - Arrows: Increment/Decrement value
   *    - Navigation skip: Use ArrowLeft/Right instead
   */
  const formFields = [
    { ref: descriptionInputRef, name: 'description' },
    { ref: amountInputRef, name: 'amount' },
    { ref: dateInputRef, name: 'date' },
    { ref: noteInputRef, name: 'note' },
  ];

  // Enhanced form navigation with proper field detection and dropdown priority
  useEffect(() => {
    const handleFormNavigation = (e: KeyboardEvent) => {
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

  const handleSubmit = (data: CompanyWithdrawalInput) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Company withdrawal recorded successfully!
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

      {/* Company Balance Display */}
      {companyBalance > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-sm">
              <span className="font-medium">Available Balance:</span> Rs. {companyBalance.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Description Input */}
        <div className="space-y-2">
          <Label htmlFor="description">Purpose *</Label>
          <Input
            id="description"
            placeholder="What is this withdrawal for?"
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
          <Label htmlFor="amount">Withdrawal Amount *</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            {...form.register('amount', { valueAsNumber: true })}
            ref={amountInputRef}
            className="focus:ring-2 focus:ring-primary"
          />
          {companyBalance > 0 && (
            <p className="text-sm text-muted-foreground">
              Available: Rs. {companyBalance.toLocaleString('en-IN')}
            </p>
          )}
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        {/* Date Input */}
        <div className="space-y-2">
          <Label htmlFor="date">Withdrawal Date *</Label>
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
          placeholder="Add any additional details about this withdrawal..."
          {...form.register('note')}
          ref={noteInputRef}
          rows={3}
          className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
      </div>

      {/* Withdrawal Summary */}
      {form.watch('amount') > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-sm">
              <span className="font-medium">Withdrawal:</span> Rs. {form.watch('amount').toLocaleString('en-IN')}
              {form.watch('description') && ` for "${form.watch('description')}"`}
              {companyBalance > 0 && (
                <div className="text-muted-foreground mt-1">
                  Remaining Balance: Rs. {(companyBalance - form.watch('amount')).toLocaleString('en-IN')}
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
        saveLabel="Withdraw [Ctrl+Enter]"
      />
    </form>
  );
}
