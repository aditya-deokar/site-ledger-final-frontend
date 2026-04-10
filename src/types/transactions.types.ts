// Transaction Types for Unified Transaction Page

export const TRANSACTION_TYPES = {
  CUSTOMER_PAYMENT: 'CUSTOMER_PAYMENT',
  CUSTOMER_REFUND: 'CUSTOMER_REFUND',
  GENERAL_EXPENSE: 'GENERAL_EXPENSE',
  VENDOR_EXPENSE: 'VENDOR_EXPENSE',
  EXPENSE_PAYMENT: 'EXPENSE_PAYMENT',
  INVESTOR_PRINCIPAL_IN: 'INVESTOR_PRINCIPAL_IN',
  INVESTOR_PRINCIPAL_OUT: 'INVESTOR_PRINCIPAL_OUT',
  INVESTOR_INTEREST: 'INVESTOR_INTEREST',
  COMPANY_TO_SITE_TRANSFER: 'COMPANY_TO_SITE_TRANSFER',
  SITE_TO_COMPANY_TRANSFER: 'SITE_TO_COMPANY_TRANSFER',
  PARTNER_CAPITAL_IN: 'PARTNER_CAPITAL_IN',
  COMPANY_WITHDRAWAL: 'COMPANY_WITHDRAWAL',
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

export const TRANSACTION_GROUPS = {
  MONEY_IN: 'MONEY_IN',
  MONEY_OUT: 'MONEY_OUT',
  TRANSFERS: 'TRANSFERS',
} as const;

export type TransactionGroup = typeof TRANSACTION_GROUPS[keyof typeof TRANSACTION_GROUPS];

export const TRANSACTION_GROUP_MAPPING: Record<TransactionGroup, TransactionType[]> = {
  [TRANSACTION_GROUPS.MONEY_IN]: [
    TRANSACTION_TYPES.CUSTOMER_PAYMENT,
    TRANSACTION_TYPES.INVESTOR_PRINCIPAL_IN,
    TRANSACTION_TYPES.PARTNER_CAPITAL_IN,
    TRANSACTION_TYPES.COMPANY_TO_SITE_TRANSFER,
  ],
  [TRANSACTION_GROUPS.MONEY_OUT]: [
    TRANSACTION_TYPES.CUSTOMER_REFUND,
    TRANSACTION_TYPES.GENERAL_EXPENSE,
    TRANSACTION_TYPES.VENDOR_EXPENSE,
    TRANSACTION_TYPES.EXPENSE_PAYMENT,
    TRANSACTION_TYPES.INVESTOR_PRINCIPAL_OUT,
    TRANSACTION_TYPES.INVESTOR_INTEREST,
    TRANSACTION_TYPES.COMPANY_WITHDRAWAL,
    TRANSACTION_TYPES.SITE_TO_COMPANY_TRANSFER,
  ],
  [TRANSACTION_GROUPS.TRANSFERS]: [
    TRANSACTION_TYPES.COMPANY_TO_SITE_TRANSFER,
    TRANSACTION_TYPES.SITE_TO_COMPANY_TRANSFER,
  ],
};

// Transaction display information
// Display names for transaction groups
export const TRANSACTION_GROUP_DISPLAY_NAMES: Record<TransactionGroup, string> = {
  [TRANSACTION_GROUPS.MONEY_IN]: 'Money In',
  [TRANSACTION_GROUPS.MONEY_OUT]: 'Money Out',
  [TRANSACTION_GROUPS.TRANSFERS]: 'Transfers',
};

export const TRANSACTION_DISPLAY_INFO: Record<TransactionType, {
  label: string;
  description: string;
  group: TransactionGroup;
  icon: string;
  color: string;
}> = {
  [TRANSACTION_TYPES.CUSTOMER_PAYMENT]: {
    label: 'Payment from Buyer',
    description: 'Money received from a customer for flat booking',
    group: TRANSACTION_GROUPS.MONEY_IN,
    icon: 'ArrowDownLeft',
    color: 'text-emerald-600',
  },
  [TRANSACTION_TYPES.CUSTOMER_REFUND]: {
    label: 'Refund to Buyer',
    description: 'Returning money to a customer',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'ArrowUpRight',
    color: 'text-red-600',
  },
  [TRANSACTION_TYPES.GENERAL_EXPENSE]: {
    label: 'Direct Expense',
    description: 'Daily site costs (chai, snacks, minor items)',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'Receipt',
    color: 'text-amber-600',
  },
  [TRANSACTION_TYPES.VENDOR_EXPENSE]: {
    label: 'Vendor Bill',
    description: 'Booking money you owe a supplier',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'User',
    color: 'text-purple-600',
  },
  [TRANSACTION_TYPES.EXPENSE_PAYMENT]: {
    label: 'Vendor Payment',
    description: 'Paying money you owe a supplier',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'CreditCard',
    color: 'text-orange-600',
  },
  [TRANSACTION_TYPES.INVESTOR_PRINCIPAL_IN]: {
    label: 'Investor Deposit',
    description: 'Money received from an investor',
    group: TRANSACTION_GROUPS.MONEY_IN,
    icon: 'TrendingUp',
    color: 'text-blue-600',
  },
  [TRANSACTION_TYPES.INVESTOR_PRINCIPAL_OUT]: {
    label: 'Return to Investor',
    description: 'Paying back the investor\'s original money',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'TrendingDown',
    color: 'text-slate-600',
  },
  [TRANSACTION_TYPES.INVESTOR_INTEREST]: {
    label: 'Investor Profit Pay',
    description: 'Paying interest or profit to an investor',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'Percent',
    color: 'text-indigo-600',
  },
  [TRANSACTION_TYPES.COMPANY_TO_SITE_TRANSFER]: {
    label: 'Move to Site',
    description: 'Transferring money from office to site account',
    group: TRANSACTION_GROUPS.TRANSFERS,
    icon: 'ArrowRight',
    color: 'text-cyan-600',
  },
  [TRANSACTION_TYPES.SITE_TO_COMPANY_TRANSFER]: {
    label: 'Move to Office',
    description: 'Transferring money from site to office account',
    group: TRANSACTION_GROUPS.TRANSFERS,
    icon: 'ArrowLeft',
    color: 'text-teal-600',
  },
  [TRANSACTION_TYPES.PARTNER_CAPITAL_IN]: {
    label: 'Partner Deposit',
    description: 'Money put in by a partner',
    group: TRANSACTION_GROUPS.MONEY_IN,
    icon: 'Users',
    color: 'text-violet-600',
  },
  [TRANSACTION_TYPES.COMPANY_WITHDRAWAL]: {
    label: 'Personal/Office Use',
    description: 'Withdrawing money for non-site expenses',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'ArrowUp',
    color: 'text-rose-600',
  },
};

// Base transaction form data
export interface BaseTransactionData {
  amount: number;
  date?: string;
  note?: string;
}

// Customer Payment specific data
export interface CustomerPaymentData extends BaseTransactionData {
  siteId: string;
  customerId: string;
}

// Transaction form data union
export type TransactionFormData = 
  | CustomerPaymentData
  // Add other transaction types as we implement them
  ;
