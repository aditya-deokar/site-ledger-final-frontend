// Transaction Type Shortcuts
export const TRANSACTION_SHORTCUTS = {
  CUSTOMER_PAYMENT: { key: '2', description: 'Customer Payment' },
  CUSTOMER_REFUND: { key: '3', description: 'Customer Refund' },
  GENERAL_EXPENSE: { key: '4', description: 'General Expense' },
  VENDOR_EXPENSE: { key: '5', description: 'Vendor Expense' },
  EXPENSE_PAYMENT: { key: '6', description: 'Expense Payment' },
  INVESTOR_PRINCIPAL_IN: { key: '7', description: 'Investor Principal In' },
  INVESTOR_PRINCIPAL_OUT: { key: '8', description: 'Investor Principal Out' },
  INVESTOR_INTEREST: { key: '9', description: 'Investor Interest' },
  COMPANY_WITHDRAWAL: { key: '0', description: 'Company Withdrawal' },
  // Entity Management - Single entry per entity type
  CUSTOMER_MANAGE: { key: 'c', description: 'Customer Management' },
  VENDOR_MANAGE: { key: 'v', description: 'Vendor Management' },
  INVESTOR_MANAGE: { key: 'i', description: 'Investor Management' },
  PARTNER_MANAGE: { key: 'p', description: 'Partner Management' },
} as const;

// Kept for backward compatibility if needed, but TRANSACTION_SHORTCUTS is preferred
export const TRANSACTION_TYPE_SHORTCUTS = TRANSACTION_SHORTCUTS;

// Global Shortcuts
export const GLOBAL_SHORTCUTS = {
  NEW_TRANSACTION: { key: 'n', description: 'New Transaction' },
  HELP: { key: '?', description: 'Show Keyboard Help' },
  RESET_FORM: { key: 'Escape', description: 'Reset Form' },
  BACK_TO_TYPES: { key: 'Backspace', description: 'Back to Transaction Types' },
  FORCE_BACK: { key: 'Backspace', altKey: true, description: 'Force back to types' },
  SUBMIT_FORM: { key: 'Enter', ctrlKey: true, description: 'Submit Form' },
} as const;

// Form Navigation Shortcuts
export const FORM_NAVIGATION_SHORTCUTS = {
  NEXT_FIELD: { key: 'ArrowRight', description: 'Next Field' },
  PREVIOUS_FIELD: { key: 'ArrowLeft', description: 'Previous Field' },
  INCREMENT_AMOUNT: { key: 'ArrowUp', description: 'Increment Amount' },
  DECREMENT_AMOUNT: { key: 'ArrowDown', description: 'Decrement Amount' },
  NAVIGATE_DROPDOWN: { key: 'ArrowDown', description: 'Navigate Dropdown Options' },
  SELECT_OPTION: { key: 'Enter', description: 'Select Option / Submit Form' },
  CLOSE_DROPDOWN: { key: 'Escape', description: 'Close Dropdown' },
} as const;

// Combined Shortcuts
export const ALL_SHORTCUTS = {
  ...TRANSACTION_SHORTCUTS,
  ...GLOBAL_SHORTCUTS,
  ...FORM_NAVIGATION_SHORTCUTS,
} as const;
