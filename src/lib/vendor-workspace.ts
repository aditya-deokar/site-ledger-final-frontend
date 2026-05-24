export const VENDOR_WORKSPACE_TABS = [
  'overview',
  'bills',
  'payments',
  'receipts',
  'documents',
  'statement',
] as const;

export type VendorWorkspaceTab = (typeof VENDOR_WORKSPACE_TABS)[number];

export function isVendorWorkspaceTab(value: string | null | undefined): value is VendorWorkspaceTab {
  return !!value && VENDOR_WORKSPACE_TABS.includes(value as VendorWorkspaceTab);
}

export function buildVendorWorkspacePath(vendorId: string, tab: VendorWorkspaceTab = 'overview') {
  if (tab === 'overview') {
    return `/vendors/${vendorId}`;
  }

  return `/vendors/${vendorId}?tab=${tab}`;
}
