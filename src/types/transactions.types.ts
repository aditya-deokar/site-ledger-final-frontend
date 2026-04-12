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
  // Entity Management
  CUSTOMER_MANAGE: 'CUSTOMER_MANAGE',
  VENDOR_MANAGE: 'VENDOR_MANAGE',
  INVESTOR_MANAGE: 'INVESTOR_MANAGE',
  PARTNER_MANAGE: 'PARTNER_MANAGE',
  // Entity Creation Forms
  CREATE_CUSTOMER: 'CREATE_CUSTOMER',
  CREATE_VENDOR: 'CREATE_VENDOR',
  CREATE_INVESTOR: 'CREATE_INVESTOR',
  CREATE_PARTNER: 'CREATE_PARTNER',
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

export const TRANSACTION_GROUPS = {
  MONEY_IN: 'MONEY_IN',
  MONEY_OUT: 'MONEY_OUT',
  TRANSFERS: 'TRANSFERS',
  ENTITIES: 'ENTITIES',
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
  [TRANSACTION_GROUPS.ENTITIES]: [
    TRANSACTION_TYPES.CUSTOMER_MANAGE,
    TRANSACTION_TYPES.VENDOR_MANAGE,
    TRANSACTION_TYPES.INVESTOR_MANAGE,
    TRANSACTION_TYPES.PARTNER_MANAGE,
  ],
};

// Transaction display information
// Display names for transaction groups
export const TRANSACTION_GROUP_DISPLAY_NAMES: Record<TransactionGroup, string> = {
  [TRANSACTION_GROUPS.MONEY_IN]: 'Money In',
  [TRANSACTION_GROUPS.MONEY_OUT]: 'Money Out', 
  [TRANSACTION_GROUPS.TRANSFERS]: 'Money Transfer',
  [TRANSACTION_GROUPS.ENTITIES]: 'Manage People',
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
    label: 'Daily Expense',
    description: 'Small daily costs (chai, snacks, minor items)',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'Receipt',
    color: 'text-amber-600',
  },
  [TRANSACTION_TYPES.VENDOR_EXPENSE]: {
    label: 'New Vendor Bill',
    description: 'Record a new bill from supplier',
    group: TRANSACTION_GROUPS.MONEY_OUT,
    icon: 'User',
    color: 'text-purple-600',
  },
  [TRANSACTION_TYPES.EXPENSE_PAYMENT]: {
    label: 'Pay Vendor Bill',
    description: 'Pay existing vendor bills',
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
  [TRANSACTION_TYPES.CUSTOMER_MANAGE]: {
    label: 'Customer Management',
    description: 'Manage customers - Add, Edit, Delete',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'Users',
    color: 'text-emerald-500',
  },
  [TRANSACTION_TYPES.VENDOR_MANAGE]: {
    label: 'Vendor Management',
    description: 'Manage vendors - Add, Edit, Delete',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'Store',
    color: 'text-purple-500',
  },
  [TRANSACTION_TYPES.INVESTOR_MANAGE]: {
    label: 'Investor Management',
    description: 'Manage investors - Add, Edit, Delete',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'Wallet',
    color: 'text-blue-500',
  },
  [TRANSACTION_TYPES.PARTNER_MANAGE]: {
    label: 'Partner Management',
    description: 'Manage partners - Add, Edit, Delete',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'Shield',
    color: 'text-indigo-500',
  },
  [TRANSACTION_TYPES.CREATE_CUSTOMER]: {
    label: 'Create Customer',
    description: 'Add a new customer to the system',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'UserPlus',
    color: 'text-emerald-600',
  },
  [TRANSACTION_TYPES.CREATE_VENDOR]: {
    label: 'Create Vendor',
    description: 'Add a new vendor to the system',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'Store',
    color: 'text-purple-600',
  },
  [TRANSACTION_TYPES.CREATE_INVESTOR]: {
    label: 'Create Investor',
    description: 'Add a new investor to the system',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'UserPlus',
    color: 'text-blue-600',
  },
  [TRANSACTION_TYPES.CREATE_PARTNER]: {
    label: 'Create Partner',
    description: 'Add a new partner to the system',
    group: TRANSACTION_GROUPS.ENTITIES,
    icon: 'UserPlus',
    color: 'text-indigo-600',
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
