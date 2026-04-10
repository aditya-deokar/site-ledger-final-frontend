// Form Shortcuts
export const FORM_SHORTCUTS = {
  NEXT_FIELD: { key: 'arrowright', description: 'Next Field' },
  PREVIOUS_FIELD: { key: 'arrowleft', description: 'Previous Field' },
  INCREMENT_AMOUNT: { key: 'arrowup', description: 'Increment Amount' },
  DECREMENT_AMOUNT: { key: 'arrowdown', description: 'Decrement Amount' },
  NAVIGATE_DROPDOWN: { key: 'arrowdown', description: 'Navigate Dropdown Options' },
  SELECT_OPTION: { key: 'enter', description: 'Select Option / Submit Form' },
  CLOSE_DROPDOWN: { key: 'escape', description: 'Close Dropdown' },
} as const;

// Global Shortcuts
export const GLOBAL_SHORTCUTS = {
  NEW_TRANSACTION: { key: 'n', description: 'New Transaction' },
  HELP: { key: '?', description: 'Show Keyboard Help' },
  BACK_TO_TYPES: { key: 'backspace', description: 'Back to Transaction Types' },
  RESET_FORM: { key: 'escape', description: 'Reset Form' },
  SUBMIT_FORM: { key: 'ctrl+enter', description: 'Submit Form' },
} as const;

// Transaction Type Shortcuts
export const TRANSACTION_TYPE_SHORTCUTS = {
  CUSTOMER_PAYMENT: { key: '2', description: 'Customer Payment' },
  CUSTOMER_REFUND: { key: '3', description: 'Customer Refund' },
  GENERAL_EXPENSE: { key: '4', description: 'General Expense' },
  VENDOR_EXPENSE: { key: '5', description: 'Vendor Expense' },
  EXPENSE_PAYMENT: { key: '6', description: 'Expense Payment' },
  INVESTOR_PRINCIPAL_IN: { key: '7', description: 'Investor Principal In' },
  INVESTOR_PRINCIPAL_OUT: { key: '8', description: 'Investor Principal Out' },
  INVESTOR_INTEREST: { key: '9', description: 'Investor Interest' },
  COMPANY_WITHDRAWAL: { key: '0', description: 'Company Withdrawal' },
} as const;

// Combined All Shortcuts
export const ALL_SHORTCUTS = {
  ...TRANSACTION_TYPE_SHORTCUTS,
  ...GLOBAL_SHORTCUTS,
  ...FORM_NAVIGATION_SHORTCUTS,
};
