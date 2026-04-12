'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyboardShortcutsHelp } from '@/components/transactions/keyboard-shortcuts-help';
import { CustomerPaymentFormKeyboard } from '@/components/transactions/customer-payment-form-keyboard';
import { CustomerRefundFormKeyboard } from '@/components/transactions/customer-refund-form-keyboard';
import { GeneralExpenseFormKeyboard } from '@/components/transactions/general-expense-form-keyboard';
import { VendorExpenseFormKeyboard } from '@/components/transactions/vendor-expense-form-keyboard';
import { ExpensePaymentFormKeyboard } from '@/components/transactions/expense-payment-form-keyboard';
import { InvestorPrincipalInFormKeyboard } from '@/components/transactions/investor-principal-in-form-keyboard';
import { InvestorPrincipalOutFormKeyboard } from '@/components/transactions/investor-principal-out-form-keyboard';
import { InvestorInterestFormKeyboard } from '@/components/transactions/investor-interest-form-keyboard';
import { CompanyWithdrawalFormKeyboard } from '@/components/transactions/company-withdrawal-form-keyboard';
import { PartnerCapitalInFormKeyboard } from '@/components/transactions/partner-capital-in-form-keyboard';
import { CompanyToSiteTransferFormKeyboard } from '@/components/transactions/company-to-site-transfer-form-keyboard';
import { SiteToCompanyTransferFormKeyboard } from '@/components/transactions/site-to-company-transfer-form-keyboard';
import { CreateCustomerFormKeyboard } from '@/components/transactions/create-customer-form-keyboard';
import { CreateVendorFormKeyboard } from '@/components/transactions/create-vendor-form-keyboard';
import { CreateInvestorFormKeyboard } from '@/components/transactions/create-investor-form-keyboard';
import { CreatePartnerFormKeyboard } from '@/components/transactions/create-partner-form-keyboard';
import { EntityManagementDashboard } from '@/components/transactions/entity-management-dashboard';
import { TRANSACTION_TYPES, TransactionType, TRANSACTION_GROUPS, TRANSACTION_GROUP_MAPPING, TRANSACTION_DISPLAY_INFO, TRANSACTION_GROUP_DISPLAY_NAMES } from '@/types/transactions.types';
import { useKeyboardManager, TRANSACTION_SHORTCUTS, GLOBAL_SHORTCUTS } from '@/hooks/use-keyboard-manager';
import { useTransactionNavigation } from '@/hooks/use-transaction-navigation';
import { useRecordCustomerPayment } from '@/hooks/api/customer.hooks';
import { CustomerPaymentInput } from '@/schemas/transactions.schema';
import { ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const IconRenderer = ({ iconName, className }: { iconName: string, className?: string }) => {
  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) return null;
  return <Icon className={className} />;
};

export default function TransactionsPage() {
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [highlightedActionIndex, setHighlightedActionIndex] = useState(0);
  const [actionSearch, setActionSearch] = useState('');
  
  // Separate state for each entity type to prevent cross-contamination
  const [customerActionSearch, setCustomerActionSearch] = useState('');
  const [vendorActionSearch, setVendorActionSearch] = useState('');
  const [investorActionSearch, setInvestorActionSearch] = useState('');
  const [partnerActionSearch, setPartnerActionSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus management
  const transactionTypeSelectorRef = useRef<HTMLDivElement>(null);
  const actionDropdownRef = useRef<HTMLDivElement>(null);
  const actionInputRef = useRef<HTMLInputElement>(null);

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
    setSelectedTransactionType(null);
    setSuccess(false);
    setError(null);
    setFocusedCardIndex(0);
  };

  // Handle form submission
  const handleFormSubmit = (data: any) => {
    // For now, just show success and reset the form
    // TODO: Implement actual API calls for each transaction type
    console.log('Form submitted:', selectedTransactionType, data);
    setSuccess(true);
    setError(null);
    // Return focus to transaction type selector for next entry
    transactionTypeSelectorRef.current?.focus();
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(false), 3000);
  };

  // Reset form state
  const handleFormReset = () => {
    setSuccess(false);
    setError(null);
  };

  // Handle entity actions
  const handleEntityAction = (action: string) => {
    // Determine entity type from current transaction type
    let entityType = '';
    if (selectedTransactionType === TRANSACTION_TYPES.CUSTOMER_MANAGE) entityType = 'customer';
    else if (selectedTransactionType === TRANSACTION_TYPES.VENDOR_MANAGE) entityType = 'vendor';
    else if (selectedTransactionType === TRANSACTION_TYPES.INVESTOR_MANAGE) entityType = 'investor';
    else if (selectedTransactionType === TRANSACTION_TYPES.PARTNER_MANAGE) entityType = 'partner';
    
    switch (entityType) {
      case 'customer':
        if (action === 'create') setSelectedTransactionType(TRANSACTION_TYPES.CREATE_CUSTOMER);
        else if (action === 'edit') console.log('Edit customers');
        else if (action === 'view') {
          // Show entity management dashboard for viewing
          console.log('View customers');
        } else if (action === 'delete') console.log('Delete customers');
        break;
      case 'vendor':
        if (action === 'create') setSelectedTransactionType(TRANSACTION_TYPES.CREATE_VENDOR);
        else if (action === 'edit') console.log('Edit vendors');
        else if (action === 'view') {
          console.log('View vendors');
        } else if (action === 'delete') console.log('Delete vendors');
        break;
      case 'investor':
        if (action === 'create') setSelectedTransactionType(TRANSACTION_TYPES.CREATE_INVESTOR);
        else if (action === 'edit') console.log('Edit investors');
        else if (action === 'view') {
          console.log('View investors');
        } else if (action === 'delete') console.log('Delete investors');
        break;
      case 'partner':
        if (action === 'create') setSelectedTransactionType(TRANSACTION_TYPES.CREATE_PARTNER);
        else if (action === 'edit') console.log('Edit partners');
        else if (action === 'view') {
          console.log('View partners');
        } else if (action === 'delete') console.log('Delete partners');
        break;
    }
  };

  // Handle entity action selection
  const handleEntitySubmit = () => {
    if (selectedAction) {
      handleEntityAction(selectedAction);
    }
  };

  // Handle action selection
  const handleActionSelect = (action: string, label: string) => {
    setSelectedAction(action);
    
    // Update the specific search string for the currently active entity management type
    if (selectedTransactionType === TRANSACTION_TYPES.CUSTOMER_MANAGE) setCustomerActionSearch(label);
    else if (selectedTransactionType === TRANSACTION_TYPES.VENDOR_MANAGE) setVendorActionSearch(label);
    else if (selectedTransactionType === TRANSACTION_TYPES.INVESTOR_MANAGE) setInvestorActionSearch(label);
    else if (selectedTransactionType === TRANSACTION_TYPES.PARTNER_MANAGE) setPartnerActionSearch(label);
    
    setActionDropdownOpen(false);
    // Auto-execute the action to load the form immediately
    handleEntityAction(action);
  };

  // Auto-focus dropdown when entity management opens
  useEffect(() => {
    const entityManagementTypes = [
      TRANSACTION_TYPES.CUSTOMER_MANAGE,
      TRANSACTION_TYPES.VENDOR_MANAGE,
      TRANSACTION_TYPES.INVESTOR_MANAGE,
      TRANSACTION_TYPES.PARTNER_MANAGE
    ] as const;
    
    if (selectedTransactionType && entityManagementTypes.includes(selectedTransactionType)) {
      // Focus the input field using ref
      setTimeout(() => {
        if (actionInputRef.current) {
          actionInputRef.current.focus();
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [selectedTransactionType]);

  // Handle action dropdown keyboard navigation
  const handleActionKeyDown = (e: React.KeyboardEvent) => {
    const actions = [
      { key: 'create', label: 'Create New' },
      { key: 'edit', label: 'Edit Existing' },
      { key: 'view', label: 'View All' },
      { key: 'delete', label: 'Delete' }
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedActionIndex(prev => Math.min(actions.length - 1, prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedActionIndex(prev => Math.max(0, prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (actionDropdownOpen && highlightedActionIndex < actions.length) {
          const action = actions[highlightedActionIndex];
          handleActionSelect(action.key, action.label);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setActionDropdownOpen(false);
        break;
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        actionDropdownRef.current && 
        !actionDropdownRef.current.contains(target) &&
        actionInputRef.current &&
        !actionInputRef.current.contains(target)
      ) {
        setActionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            My Transactions
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
                    onClick={(e) => {
                        console.log('Mouse click on group:', group);
                        e.stopPropagation();
                        handleGroupChange(group as keyof typeof TRANSACTION_GROUP_MAPPING);
                      }}
                    className="flex-1 rounded-md text-sm font-medium"
                  >
                    {TRANSACTION_GROUP_DISPLAY_NAMES[group as keyof typeof TRANSACTION_GROUP_DISPLAY_NAMES]}
                    <span className="ml-2 text-xs opacity-60">({types.length})</span>
                  </Button>
                ))}
              </div>

              {/* Transaction Type Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {TRANSACTION_GROUP_MAPPING[selectedGroup].map((transactionType, index) => {
                  const info = TRANSACTION_DISPLAY_INFO[transactionType];
                  const isFocused = index === focusedCardIndex;
                  
                  return (
                    <Button
                      key={transactionType}
                      variant={isFocused ? "default" : "outline"}
                      onClick={(e) => {
                        console.log('Mouse click on transaction type:', transactionType);
                        e.stopPropagation();
                        handleTransactionTypeSelect(transactionType);
                      }}
                      onMouseEnter={() => setFocusedCardIndex(index)}
                      className={`h-auto p-4 flex flex-col items-start space-y-2 text-left transition-colors group ${
                        isFocused 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "hover:border-primary/50"
                      }`}
                      id={`transaction-type-${transactionType}`}
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${info.color}`}>
                          <IconRenderer iconName={info.icon} className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{info.label}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] scale-90 opacity-40">
                          {index + 1}
                        </Badge>

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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
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
                sites={[]}
                customers={[]}
                sitesLoading={false}
                customersLoading={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Customer Refund Form */}
        {selectedTransactionType === TRANSACTION_TYPES.CUSTOMER_REFUND && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CustomerRefundFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
                sites={[]}
                customers={[]}
                sitesLoading={false}
              />
            </CardContent>
          </Card>
        )}

        {/* General Expense Form */}
        {selectedTransactionType === TRANSACTION_TYPES.GENERAL_EXPENSE && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <GeneralExpenseFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Vendor Expense Form */}
        {selectedTransactionType === TRANSACTION_TYPES.VENDOR_EXPENSE && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <VendorExpenseFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Expense Payment Form */}
        {selectedTransactionType === TRANSACTION_TYPES.EXPENSE_PAYMENT && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ExpensePaymentFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Investor Principal In Form */}
        {selectedTransactionType === TRANSACTION_TYPES.INVESTOR_PRINCIPAL_IN && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InvestorPrincipalInFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Investor Principal Out Form */}
        {selectedTransactionType === TRANSACTION_TYPES.INVESTOR_PRINCIPAL_OUT && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InvestorPrincipalOutFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Investor Interest Form */}
        {selectedTransactionType === TRANSACTION_TYPES.INVESTOR_INTEREST && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InvestorInterestFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Company Withdrawal Form */}
        {selectedTransactionType === TRANSACTION_TYPES.COMPANY_WITHDRAWAL && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CompanyWithdrawalFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Partner Capital In Form */}
        {selectedTransactionType === TRANSACTION_TYPES.PARTNER_CAPITAL_IN && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PartnerCapitalInFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Company to Site Transfer Form */}
        {selectedTransactionType === TRANSACTION_TYPES.COMPANY_TO_SITE_TRANSFER && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CompanyToSiteTransferFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Site to Company Transfer Form */}
        {selectedTransactionType === TRANSACTION_TYPES.SITE_TO_COMPANY_TRANSFER && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SiteToCompanyTransferFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Create Customer Form */}
        {selectedTransactionType === TRANSACTION_TYPES.CREATE_CUSTOMER && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CreateCustomerFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Create Vendor Form */}
        {selectedTransactionType === TRANSACTION_TYPES.CREATE_VENDOR && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CreateVendorFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Create Investor Form */}
        {selectedTransactionType === TRANSACTION_TYPES.CREATE_INVESTOR && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CreateInvestorFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Customer Management */}
        {selectedTransactionType === TRANSACTION_TYPES.CUSTOMER_MANAGE && (
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif tracking-tight flex items-center gap-2">
                  Customer Management
                  <Badge variant="secondary" className="text-xs">
                    Select Action
                  </Badge>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTransactionType(null);
                    setSelectedAction('');
                    setActionSearch('');
                    setActionDropdownOpen(false);
                  }}
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-visible">
              <div className="space-y-6">
                {/* Action Dropdown */}
                <div>
                  <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Select Action for Customer</Label>
                  <div className="relative z-[99999]">
                    <Input
                      ref={actionInputRef}
                      placeholder="Search or select action..."
                      value={customerActionSearch}
                      autoComplete="off"
                      onFocus={() => {
                        console.log('Customer input focused, setting dropdown to open');
                        setActionDropdownOpen(true);
                      }}
                      onBlur={(e) => {
                        // Check if the blur is caused by clicking on the dropdown
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        if (relatedTarget && actionDropdownRef.current?.contains(relatedTarget)) {
                          // Clicked on dropdown item, don't close yet
                          return;
                        }
                        
                        const actions = [
                          { key: 'create', label: 'Create New Customer' },
                          { key: 'edit', label: 'Edit Existing Customer' },
                          { key: 'view', label: 'View All Customers' },
                          { key: 'delete', label: 'Delete Customer' }
                        ];
                        const exactMatch = actions.find(a => a.label.toLowerCase().includes(customerActionSearch.toLowerCase()));
                        if (exactMatch) handleActionSelect(exactMatch.key, exactMatch.label);
                        setTimeout(() => setActionDropdownOpen(false), 150); // Delay to allow click
                      }}
                      onChange={(e) => {
                        setCustomerActionSearch(e.target.value);
                        setHighlightedActionIndex(0);
                        setActionDropdownOpen(true);
                      }}
                      onKeyDown={handleActionKeyDown}
                      className="h-12 focus:ring-2 focus:ring-primary pr-10 bg-muted/30 border-none rounded-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                    <ChevronDown 
                      className={`absolute right-3 top-4 h-4 w-4 transition-transform cursor-pointer ${
                        actionDropdownOpen ? 'rotate-180' : ''
                      }`}
                      onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                    />
                    
                    {/* Action Dropdown */}
                    {actionDropdownOpen && (
                      <div ref={actionDropdownRef} className="absolute top-full left-0 right-0 z-[99999] mt-1 bg-white dark:bg-zinc-900 border-2 border-primary shadow-2xl max-h-68 overflow-auto animate-in fade-in zoom-in-95 duration-100 py-1">
                        {[
                          { key: 'create', label: 'Create New Customer', icon: 'Plus', color: 'text-emerald-500', desc: 'Add a new customer to the system' },
                          { key: 'edit', label: 'Edit Existing Customer', icon: 'Edit', color: 'text-blue-500', desc: 'Update customer information' },
                          { key: 'view', label: 'View All Customers', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all customers' },
                          { key: 'delete', label: 'Delete Customer', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove customer from system' }
                        ].filter(a => a.label.toLowerCase().includes(customerActionSearch.toLowerCase()))
                        .map((action, index) => (
                          <div
                            key={action.key}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              index === highlightedActionIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-zinc-700 dark:text-zinc-300'
                            }`}
                            onClick={() => handleActionSelect(action.key, action.label)}
                            onMouseEnter={() => setHighlightedActionIndex(index)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", action.color.replace('text-', 'bg-').replace('-500', '-500/10'))}>
                                <IconRenderer iconName={action.icon} className={cn("w-4 h-4", action.color)} />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-bold text-[11px] uppercase tracking-wider">{action.label}</span>
                                <span className="text-[10px] opacity-50 font-medium">
                                  {action.desc}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* No Results Fallback */}
                        {[
                          { key: 'create', label: 'Create New Customer', icon: 'Plus', color: 'text-emerald-500', desc: 'Add a new customer to the system' },
                          { key: 'edit', label: 'Edit Existing Customer', icon: 'Edit', color: 'text-blue-500', desc: 'Update customer information' },
                          { key: 'view', label: 'View All Customers', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all customers' },
                          { key: 'delete', label: 'Delete Customer', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove customer from system' }
                        ].filter(a => a.label.toLowerCase().includes(customerActionSearch.toLowerCase())).length === 0 && (
                          <div className="px-6 py-8 text-center text-muted-foreground">
                            <LucideIcons.SearchX className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No matching actions found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Management */}
        {selectedTransactionType === TRANSACTION_TYPES.VENDOR_MANAGE && (
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif tracking-tight flex items-center gap-2">
                  Vendor Management
                  <Badge variant="secondary" className="text-xs">
                    Select Action
                  </Badge>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTransactionType(null);
                    setSelectedAction('');
                  }}
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-visible">
              <div className="space-y-6">
                {/* Action Dropdown */}
                <div>
                  <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Select Action for Vendor</Label>
                  <div className="relative z-[99999]">
                    <Input
                      ref={actionInputRef}
                      placeholder="Search or select action..."
                      value={vendorActionSearch}
                      autoComplete="off"
                      onFocus={() => {
                        setActionDropdownOpen(true);
                      }}
                      onBlur={() => {
                        const actions = [
                          { key: 'create', label: 'Create New Vendor' },
                          { key: 'edit', label: 'Edit Existing Vendor' },
                          { key: 'view', label: 'View All Vendors' },
                          { key: 'delete', label: 'Delete Vendor' }
                        ];
                        const exactMatch = actions.find(a => a.label.toLowerCase().includes(vendorActionSearch.toLowerCase()));
                        if (exactMatch) handleActionSelect(exactMatch.key, exactMatch.label);
                        setTimeout(() => setActionDropdownOpen(false), 150); // Delay to allow click
                      }}
                      onChange={(e) => {
                        setVendorActionSearch(e.target.value);
                        setHighlightedActionIndex(0);
                        setActionDropdownOpen(true);
                      }}
                      onKeyDown={handleActionKeyDown}
                      className="h-12 focus:ring-2 focus:ring-primary pr-10 bg-muted/30 border-none rounded-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                    <ChevronDown 
                      className={`absolute right-3 top-4 h-4 w-4 transition-transform cursor-pointer ${
                        actionDropdownOpen ? 'rotate-180' : ''
                      }`}
                      onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                    />
                    
                    {/* Action Dropdown */}
                    {actionDropdownOpen && (
                      <div ref={actionDropdownRef} className="absolute top-full left-0 right-0 z-[99999] mt-1 bg-white dark:bg-zinc-900 border-2 border-primary shadow-2xl max-h-68 overflow-auto animate-in fade-in zoom-in-95 duration-100 py-1">
                        {[
                          { key: 'create', label: 'Create New Vendor', icon: 'Plus', color: 'text-purple-500', desc: 'Add a new supplier to the system' },
                          { key: 'edit', label: 'Edit Existing Vendor', icon: 'Edit', color: 'text-blue-500', desc: 'Update vendor information' },
                          { key: 'view', label: 'View All Vendors', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all vendors' },
                          { key: 'delete', label: 'Delete Vendor', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove vendor from system' }
                        ].filter(a => a.label.toLowerCase().includes(vendorActionSearch.toLowerCase()))
                        .map((action, index) => (
                          <div
                            key={action.key}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              index === highlightedActionIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-zinc-700 dark:text-zinc-300'
                            }`}
                            onClick={() => handleActionSelect(action.key, action.label)}
                            onMouseEnter={() => setHighlightedActionIndex(index)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", action.color.replace('text-', 'bg-').replace('-500', '-500/10'))}>
                                <IconRenderer iconName={action.icon} className={cn("w-4 h-4", action.color)} />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-bold text-[11px] uppercase tracking-wider">{action.label}</span>
                                <span className="text-[10px] opacity-50 font-medium">
                                  {action.desc}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* No Results Fallback */}
                        {[
                          { key: 'create', label: 'Create New Vendor', icon: 'Plus', color: 'text-purple-500', desc: 'Add a new supplier to the system' },
                          { key: 'edit', label: 'Edit Existing Vendor', icon: 'Edit', color: 'text-blue-500', desc: 'Update vendor information' },
                          { key: 'view', label: 'View All Vendors', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all vendors' },
                          { key: 'delete', label: 'Delete Vendor', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove vendor from system' }
                        ].filter(a => a.label.toLowerCase().includes(vendorActionSearch.toLowerCase())).length === 0 && (
                          <div className="px-6 py-8 text-center text-muted-foreground">
                            <LucideIcons.SearchX className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No matching actions found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                              </div>
            </CardContent>
          </Card>
        )}

        {/* Investor Management */}
        {selectedTransactionType === TRANSACTION_TYPES.INVESTOR_MANAGE && (
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif tracking-tight flex items-center gap-2">
                  Investor Management
                  <Badge variant="secondary" className="text-xs">
                    Select Action
                  </Badge>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTransactionType(null);
                    setSelectedAction('');
                  }}
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-visible">
              <div className="space-y-6">
                {/* Action Dropdown */}
                <div>
                  <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Select Action for Investor</Label>
                  <div className="relative z-[99999]">
                    <Input
                      ref={actionInputRef}
                      placeholder="Search or select action..."
                      value={investorActionSearch}
                      autoComplete="off"
                      onFocus={() => {
                        setActionDropdownOpen(true);
                      }}
                      onBlur={() => {
                        const actions = [
                          { key: 'create', label: 'Create New Investor' },
                          { key: 'edit', label: 'Edit Existing Investor' },
                          { key: 'view', label: 'View All Investors' },
                          { key: 'delete', label: 'Delete Investor' }
                        ];
                        const exactMatch = actions.find(a => a.label.toLowerCase().includes(investorActionSearch.toLowerCase()));
                        if (exactMatch) handleActionSelect(exactMatch.key, exactMatch.label);
                        setTimeout(() => setActionDropdownOpen(false), 150); // Delay to allow click
                      }}
                      onChange={(e) => {
                        setInvestorActionSearch(e.target.value);
                        setHighlightedActionIndex(0);
                        setActionDropdownOpen(true);
                      }}
                      onKeyDown={handleActionKeyDown}
                      className="h-12 focus:ring-2 focus:ring-primary pr-10 bg-muted/30 border-none rounded-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                    <ChevronDown 
                      className={`absolute right-3 top-4 h-4 w-4 transition-transform cursor-pointer ${
                        actionDropdownOpen ? 'rotate-180' : ''
                      }`}
                      onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                    />
                    
                    {/* Action Dropdown */}
                    {actionDropdownOpen && (
                      <div ref={actionDropdownRef} className="absolute top-full left-0 right-0 z-[99999] mt-1 bg-white dark:bg-zinc-900 border-2 border-primary shadow-2xl max-h-68 overflow-auto animate-in fade-in zoom-in-95 duration-100 py-1">
                        {[
                          { key: 'create', label: 'Create New Investor', icon: 'Plus', color: 'text-blue-500', desc: 'Add a new investor to the system' },
                          { key: 'edit', label: 'Edit Existing Investor', icon: 'Edit', color: 'text-blue-500', desc: 'Update investor information' },
                          { key: 'view', label: 'View All Investors', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all investors' },
                          { key: 'delete', label: 'Delete Investor', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove investor from system' }
                        ].filter(a => a.label.toLowerCase().includes(investorActionSearch.toLowerCase()))
                        .map((action, index) => (
                          <div
                            key={action.key}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              index === highlightedActionIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-zinc-700 dark:text-zinc-300'
                            }`}
                            onClick={() => handleActionSelect(action.key, action.label)}
                            onMouseEnter={() => setHighlightedActionIndex(index)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", action.color.replace('text-', 'bg-').replace('-500', '-500/10'))}>
                                <IconRenderer iconName={action.icon} className={cn("w-4 h-4", action.color)} />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-bold text-[11px] uppercase tracking-wider">{action.label}</span>
                                <span className="text-[10px] opacity-50 font-medium">
                                  {action.desc}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* No Results Fallback */}
                        {[
                          { key: 'create', label: 'Create New Investor', icon: 'Plus', color: 'text-blue-500', desc: 'Add a new investor to the system' },
                          { key: 'edit', label: 'Edit Existing Investor', icon: 'Edit', color: 'text-blue-500', desc: 'Update investor information' },
                          { key: 'view', label: 'View All Investors', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all investors' },
                          { key: 'delete', label: 'Delete Investor', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove investor from system' }
                        ].filter(a => a.label.toLowerCase().includes(investorActionSearch.toLowerCase())).length === 0 && (
                          <div className="px-6 py-8 text-center text-muted-foreground">
                            <LucideIcons.SearchX className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No matching actions found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                              </div>
            </CardContent>
          </Card>
        )}

        {/* Partner Management */}
        {selectedTransactionType === TRANSACTION_TYPES.PARTNER_MANAGE && (
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif tracking-tight flex items-center gap-2">
                  Partner Management
                  <Badge variant="secondary" className="text-xs">
                    Select Action
                  </Badge>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTransactionType(null);
                    setSelectedAction('');
                  }}
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-visible">
              <div className="space-y-6">
                {/* Action Dropdown */}
                <div>
                  <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Select Action for Partner</Label>
                  <div className="relative z-[99999]">
                    <Input
                      ref={actionInputRef}
                      placeholder="Search or select action..."
                      value={partnerActionSearch}
                      autoComplete="off"
                      onFocus={() => {
                        setActionDropdownOpen(true);
                      }}
                      onBlur={() => {
                        const actions = [
                          { key: 'create', label: 'Create New Partner' },
                          { key: 'edit', label: 'Edit Existing Partner' },
                          { key: 'view', label: 'View All Partners' },
                          { key: 'delete', label: 'Delete Partner' }
                        ];
                        const exactMatch = actions.find(a => a.label.toLowerCase().includes(partnerActionSearch.toLowerCase()));
                        if (exactMatch) handleActionSelect(exactMatch.key, exactMatch.label);
                        setTimeout(() => setActionDropdownOpen(false), 150); // Delay to allow click
                      }}
                      onChange={(e) => {
                        setPartnerActionSearch(e.target.value);
                        setHighlightedActionIndex(0);
                        setActionDropdownOpen(true);
                      }}
                      onKeyDown={handleActionKeyDown}
                      className="h-12 focus:ring-2 focus:ring-primary pr-10 bg-muted/30 border-none rounded-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                    <ChevronDown 
                      className={`absolute right-3 top-4 h-4 w-4 transition-transform cursor-pointer ${
                        actionDropdownOpen ? 'rotate-180' : ''
                      }`}
                      onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                    />
                    
                    {/* Action Dropdown */}
                    {actionDropdownOpen && (
                      <div ref={actionDropdownRef} className="absolute top-full left-0 right-0 z-[99999] mt-1 bg-white dark:bg-zinc-900 border-2 border-primary shadow-2xl max-h-68 overflow-auto animate-in fade-in zoom-in-95 duration-100 py-1">
                        {[
                          { key: 'create', label: 'Create New Partner', icon: 'Plus', color: 'text-indigo-500', desc: 'Add a new partner to the system' },
                          { key: 'edit', label: 'Edit Existing Partner', icon: 'Edit', color: 'text-blue-500', desc: 'Update partner information' },
                          { key: 'view', label: 'View All Partners', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all partners' },
                          { key: 'delete', label: 'Delete Partner', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove partner from system' }
                        ].filter(a => a.label.toLowerCase().includes(partnerActionSearch.toLowerCase()))
                        .map((action, index) => (
                          <div
                            key={action.key}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              index === highlightedActionIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-zinc-700 dark:text-zinc-300'
                            }`}
                            onClick={() => handleActionSelect(action.key, action.label)}
                            onMouseEnter={() => setHighlightedActionIndex(index)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", action.color.replace('text-', 'bg-').replace('-500', '-500/10'))}>
                                <IconRenderer iconName={action.icon} className={cn("w-4 h-4", action.color)} />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-bold text-[11px] uppercase tracking-wider">{action.label}</span>
                                <span className="text-[10px] opacity-50 font-medium">
                                  {action.desc}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* No Results Fallback */}
                        {[
                          { key: 'create', label: 'Create New Partner', icon: 'Plus', color: 'text-indigo-500', desc: 'Add a new partner to the system' },
                          { key: 'edit', label: 'Edit Existing Partner', icon: 'Edit', color: 'text-blue-500', desc: 'Update partner information' },
                          { key: 'view', label: 'View All Partners', icon: 'Eye', color: 'text-zinc-500', desc: 'Browse all partners' },
                          { key: 'delete', label: 'Delete Partner', icon: 'Trash2', color: 'text-rose-500', desc: 'Remove partner from system' }
                        ].filter(a => a.label.toLowerCase().includes(partnerActionSearch.toLowerCase())).length === 0 && (
                          <div className="px-6 py-8 text-center text-muted-foreground">
                            <LucideIcons.SearchX className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No matching actions found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Partner Form */}
        {selectedTransactionType === TRANSACTION_TYPES.CREATE_PARTNER && (
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
                  className="rounded-none border-primary/20 text-xs font-bold uppercase tracking-widest"
                >
                  Back [Ctrl+BK]
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CreatePartnerFormKeyboard
                onSubmit={handleFormSubmit}
                isPending={false}
                error={error}
                success={success}
                onReset={handleFormReset}
                onCancel={() => setSelectedTransactionType(null)}
              />
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
