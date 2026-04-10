'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { KeyboardShortcutsHelp } from '@/components/transactions/keyboard-shortcuts-help';
import { CustomerPaymentFormKeyboard } from '@/components/transactions/customer-payment-form-keyboard';
import { TRANSACTION_TYPES, TransactionType, TRANSACTION_GROUPS, TRANSACTION_GROUP_MAPPING, TRANSACTION_DISPLAY_INFO, TRANSACTION_GROUP_DISPLAY_NAMES } from '@/types/transactions.types';
import { useKeyboardManager, TRANSACTION_SHORTCUTS, GLOBAL_SHORTCUTS } from '@/hooks/use-keyboard-manager';
import { useTransactionNavigation } from '@/hooks/use-transaction-navigation';
import { useRecordCustomerPayment } from '@/hooks/api/customer.hooks';
import { CustomerPaymentInput } from '@/schemas/transactions.schema';

export default function TransactionsPage() {
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus management
  const transactionTypeSelectorRef = useRef<HTMLDivElement>(null);

  // Use transaction navigation hook
  const {
    selectedGroup,
    setSelectedGroup,
    focusedCardIndex,
    setFocusedCardIndex,
    currentGroupTypes,
    handleKeyDown,
    selectFocusedTransaction,
    navigateWithinGroup,
    navigateBetweenGroups,
  } = useTransactionNavigation();

  // Customer payment mutation
  const recordCustomerPayment = useRecordCustomerPayment({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      // Return focus to transaction type selector for next entry
      transactionTypeSelectorRef.current?.focus();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  // Handle transaction type selection
  const handleTransactionTypeSelect = (type: TransactionType) => {
    setSelectedTransactionType(type);
    setSuccess(false);
    setError(null);
  };

  // Handle group change
  const handleGroupChange = (group: keyof typeof TRANSACTION_GROUP_MAPPING) => {
    setSelectedGroup(group);
    setSelectedTransactionType(null);
    setSuccess(false);
    setError(null);
    setFocusedCardIndex(0);
  };

  // Handle form submission
  const handleFormSubmit = (data: CustomerPaymentInput) => {
    recordCustomerPayment.mutate({
      customerId: data.customerId,
      data: {
        amount: data.amount,
        note: data.note,
      },
    });
  };

  // Handle form reset
  const handleFormReset = () => {
    setSuccess(false);
    setError(null);
  };

  // Keyboard shortcuts for transaction type selection
  const { focusElement } = useKeyboardManager({
    shortcuts: [
      // Transaction type shortcuts (1-9 based on current group sequence)
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => ({
        key: num.toString(),
        description: `Select transaction type #${num}`,
        action: () => {
          const type = currentGroupTypes[num - 1];
          if (type) {
            handleTransactionTypeSelect(type);
          }
        },
      })),
      // Global shortcuts
      {
        ...GLOBAL_SHORTCUTS.NEW_TRANSACTION,
        action: () => {
          setSelectedTransactionType(null);
          transactionTypeSelectorRef.current?.focus();
        },
      },
      {
        ...GLOBAL_SHORTCUTS.HELP,
        action: () => setShowHelp(!showHelp),
      },
      {
        ...GLOBAL_SHORTCUTS.BACK_TO_TYPES,
        action: () => {
          setSelectedTransactionType(null);
          transactionTypeSelectorRef.current?.focus();
        },
      },
      {
        ...GLOBAL_SHORTCUTS.FORCE_BACK,
        action: () => {
          setSelectedTransactionType(null);
          transactionTypeSelectorRef.current?.focus();
        },
      },
    ],
  });

  // Handle keyboard navigation for transaction type selection
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!selectedTransactionType) {
        handleKeyDown(e);
        
        // Handle Enter key to select focused transaction
        if (e.key === 'Enter') {
          e.preventDefault();
          const selectedType = selectFocusedTransaction();
          if (selectedType) {
            handleTransactionTypeSelect(selectedType);
          }
        }
      }
    };

    document.addEventListener('keydown', handleNavigation);
    return () => document.removeEventListener('keydown', handleNavigation);
  }, [selectedTransactionType, handleKeyDown, selectFocusedTransaction]);

  // Auto-focus amount field when customer payment is selected
  useEffect(() => {
    if (selectedTransactionType === TRANSACTION_TYPES.CUSTOMER_PAYMENT) {
      const amountField = document.getElementById('amount');
      amountField?.focus();
    }
  }, [selectedTransactionType]);

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif text-gray-900 dark:text-zinc-50 tracking-tight">
            New Transaction
          </h1>
        </div>

        {/* Transaction Type Selection */}
        {!selectedTransactionType && (
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="text-lg font-serif tracking-tight">Select Transaction Type</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Section Tabs */}
              <div className="flex space-x-1 p-1 bg-muted rounded-lg">
                {Object.entries(TRANSACTION_GROUP_MAPPING).map(([group, types]) => (
                  <Button
                    key={group}
                    variant={selectedGroup === group ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleGroupChange(group as keyof typeof TRANSACTION_GROUP_MAPPING)}
                    className="flex-1 rounded-md text-sm font-medium"
                  >
                    {TRANSACTION_GROUP_DISPLAY_NAMES[group as keyof typeof TRANSACTION_GROUP_DISPLAY_NAMES]}
                    <span className="ml-2 text-xs opacity-60">({types.length})</span>
                  </Button>
                ))}
              </div>

              {/* Transaction Type Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TRANSACTION_GROUP_MAPPING[selectedGroup].map((transactionType, index) => {
                  const info = TRANSACTION_DISPLAY_INFO[transactionType];
                  const isFocused = index === focusedCardIndex;
                  
                  return (
                    <Button
                      key={transactionType}
                      variant={isFocused ? "default" : "outline"}
                      onClick={() => handleTransactionTypeSelect(transactionType)}
                      className={`h-auto p-4 flex flex-col items-start space-y-2 text-left transition-colors group ${
                        isFocused 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "hover:border-primary/50"
                      }`}
                      id={`transaction-type-${transactionType}`}
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${info.color}`}>
                          <div className="w-4 h-4 bg-current rounded" />
                        </div>
                        <span className="font-medium">{info.label}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] scale-90 opacity-40">
                          {index + 1}
                        </Badge>
                        {isFocused && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            Focused
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-left line-clamp-2">
                        {info.description}
                      </p>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Form */}
        {selectedTransactionType === TRANSACTION_TYPES.CUSTOMER_PAYMENT && (
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif tracking-tight flex items-center gap-2">
                  {TRANSACTION_DISPLAY_INFO[selectedTransactionType].label}
                  <Badge variant="secondary" className="text-xs">
                    Press {TRANSACTION_GROUP_MAPPING[selectedGroup].indexOf(selectedTransactionType) + 1}
                  </Badge>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTransactionType(null);
                  }}
                >
                  Back to Types
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CustomerPaymentFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={recordCustomerPayment.isPending}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Placeholder for other transaction types */}
        {selectedTransactionType && selectedTransactionType !== TRANSACTION_TYPES.CUSTOMER_PAYMENT && (
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif tracking-tight">
                  {TRANSACTION_DISPLAY_INFO[selectedTransactionType].label}
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTransactionType(null);
                  }}
                >
                  Back to Types
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground">
                <p>Transaction form for {TRANSACTION_DISPLAY_INFO[selectedTransactionType].label}</p>
                <p className="text-sm mt-2">This form will be implemented in the next phase...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp 
          open={showHelp} 
          onClose={() => setShowHelp(false)} 
        />
      </div>
    </DashboardShell>
  );
}
