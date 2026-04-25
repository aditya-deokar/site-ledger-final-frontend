export interface SiteReportSite {
  id: string;
  name: string;
  address: string;
  projectType: 'NEW_CONSTRUCTION' | 'REDEVELOPMENT';
  totalFloors: number;
  totalFlats: number;
  generatedAt: string;
  createdAt: string;
}

export interface SiteReportFinancialSummary {
  partnerAllocatedFund: number;
  investorAllocatedFund: number;
  totalAllocatedFund: number;
  totalWithdrawnFund: number;
  totalAgreementValue: number;
  netSaleValue: number;
  totalTaxAmount: number;
  totalDiscounts: number;
  totalExpensesPaid: number;
  totalExpensesRecorded: number;
  totalExpensesOutstanding: number;
  customerCollections: number;
  remainingFund: number;
  totalProjectedRevenue: number;
  totalOutstandingReceivables: number;
  totalProfit: number;
}

export interface SiteReportInventorySummary {
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  soldUnits: number;
  customerFlats: number;
  ownerFlats: number;
}

export interface SiteReportCustomerSummary {
  totalCustomers: number;
  bookedCustomers: number;
  soldCustomers: number;
  existingOwners: number;
  totalAgreementValue: number;
  netSaleValue: number;
  totalTaxAmount: number;
  totalDiscounts: number;
  totalBookingAmount: number;
  totalCollected: number;
  totalOutstanding: number;
}

export interface SiteReportExpenseSummary {
  totalExpenseItems: number;
  generalExpenseItems: number;
  vendorExpenseItems: number;
  totalRecorded: number;
  totalPaid: number;
  totalOutstanding: number;
  pendingCount: number;
  partialCount: number;
  completedCount: number;
}

export interface SiteReportInvestorSummary {
  totalInvestors: number;
  activeInvestors: number;
  closedInvestors: number;
  totalInvested: number;
  totalReturned: number;
  outstandingPrincipal: number;
}

export interface SiteReportFlatRow {
  id: string;
  flatNumber: number | null;
  customFlatId: string | null;
  displayName: string;
  status: 'AVAILABLE' | 'BOOKED' | 'SOLD';
  flatType: 'CUSTOMER' | 'EXISTING_OWNER';
  customerName: string | null;
  customerType: 'CUSTOMER' | 'EXISTING_OWNER' | null;
  sellingPrice: number | null;
  bookingAmount: number | null;
  amountPaid: number | null;
  remaining: number | null;
}

export interface SiteReportFloor {
  id: string;
  floorNumber: number;
  floorName: string | null;
  displayName: string;
  totals: {
    totalUnits: number;
    availableUnits: number;
    bookedUnits: number;
    soldUnits: number;
  };
  flats: SiteReportFlatRow[];
}

export interface SiteReportCustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  customerType: 'CUSTOMER' | 'EXISTING_OWNER' | null;
  flatStatus: 'BOOKED' | 'SOLD' | 'AVAILABLE' | null;
  floorName: string | null;
  flatDisplayName: string;
  sellingPrice: number;
  bookingAmount: number;
  amountPaid: number;
  remaining: number;
  createdAt: string;
}

export interface SiteReportExpenseRow {
  id: string;
  type: 'GENERAL' | 'VENDOR';
  reason: string | null;
  vendorName: string | null;
  vendorType: string | null;
  description: string | null;
  amount: number;
  amountPaid: number;
  remaining: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  paymentDate: string | null;
  createdAt: string;
}

export interface SiteReportInvestorRow {
  id: string;
  name: string;
  phone: string | null;
  equityPercentage: number | null;
  totalInvested: number;
  totalReturned: number;
  outstandingPrincipal: number;
  isClosed: boolean;
  createdAt: string;
}

export interface SiteReportFundHistoryRow {
  id: string;
  type: 'ALLOCATION' | 'WITHDRAWAL';
  amount: number;
  note: string | null;
  runningBalance: number;
  createdAt: string;
}

export interface SiteReportActivityRow {
  id: string;
  kind: string;
  title: string;
  counterparty: string | null;
  amount: number;
  direction: 'IN' | 'OUT';
  note: string | null;
  createdAt: string;
}

export interface SiteReport {
  site: SiteReportSite;
  financialSummary: SiteReportFinancialSummary;
  inventorySummary: SiteReportInventorySummary;
  customerSummary: SiteReportCustomerSummary;
  expenseSummary: SiteReportExpenseSummary;
  investorSummary: SiteReportInvestorSummary;
  floors: SiteReportFloor[];
  customers: SiteReportCustomerRow[];
  existingOwners: SiteReportCustomerRow[];
  expenses: SiteReportExpenseRow[];
  investors: SiteReportInvestorRow[];
  fundHistory: SiteReportFundHistoryRow[];
  recentActivity: SiteReportActivityRow[];
}

export interface SiteReportResponse {
  ok: boolean;
  data: {
    report: SiteReport;
  };
}

