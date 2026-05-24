import { Loader2 } from 'lucide-react';
import { useFloors, useWings, useExpenses } from '@/hooks/api/site.hooks';
import { useCompany } from '@/hooks/api/company.hooks';
import { useVendor, useVendorTransactions } from '@/hooks/api/vendor.hooks';
import { useCustomerPayments } from '@/hooks/api/customer.hooks';
import type { Flat, Floor } from '@/schemas/site.schema';

import { ACTIONS_USING_SITE_SELECTOR, LABEL_CLS } from './constants';
import { BookedFlatsTable } from './booked-flats-table';
import { formatINR, formatShortDate } from './utils';

interface ContextInsightPanelProps {
  action: string | null;
  site: any | null;
  customer: any | null;
  focusedFloorNumber: number | null;
  focusedWingId?: string | null;
  focusedVendorId?: string | null;
}

type HistoryExpense = {
  id: string;
  vendorId?: string | null;
  type?: string | null;
  reason?: string | null;
  description?: string | null;
  paymentDate?: string | null;
  createdAt?: string | null;
  amount: number;
};

function CustomerPaymentHistory({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerPayments(customerId);
  const payments = data?.data?.payments ?? [];

  return (
    <div className="flex flex-col gap-3">
      <p className={LABEL_CLS}>Payment History</p>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</span>
        </div>
      ) : payments.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">No payments recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {payments.slice(0, 10).map((p: any) => (
            <div key={p.id} className="border border-border/50 p-2.5 flex justify-between items-start gap-3 text-[10px]">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold uppercase tracking-widest text-foreground">
                  {p.movementType === 'CUSTOMER_PAYMENT' ? 'Payment' : 'Refund'}
                  {p.paymentMode ? ` · ${p.paymentMode.replace('_', ' ')}` : ''}
                </span>
                {p.note && <span className="text-muted-foreground/60 truncate">{p.note}</span>}
                <span className="text-muted-foreground/50">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
              </div>
              <span className={`shrink-0 font-bold text-xs ${p.direction === 'OUT' ? 'text-red-500' : 'text-emerald-600'}`}>
                {p.direction === 'OUT' ? '−' : '+'}{formatINR(Number(p.amount ?? 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContextInsightPanel({
  action,
  site,
  customer,
  focusedFloorNumber,
  focusedWingId,
  focusedVendorId,
}: ContextInsightPanelProps) {
  const { data: floorsData, isLoading: floorsLoading } = useFloors(site?.id || '');
  const { data: wingsData } = useWings(site?.id || '');
  const { data: vendorData, isLoading: vendorLoading } = useVendor(focusedVendorId || '');
  const { data: vendorTransactionsData, isLoading: vendorTransactionsLoading } = useVendorTransactions(focusedVendorId || '');
  const { data: companyData } = useCompany({ enabled: action === 'manage-funds' });
  const { data: expensesData } = useExpenses(site?.id || '', { enabled: !!site?.id });

  const floors = floorsData?.data?.floors ?? [];
  const wings = wingsData?.data?.wings ?? [];
  const selectedWing = wings.find((w: any) => w.id === focusedWingId);
  const selectedFloor = focusedFloorNumber !== null && focusedFloorNumber !== -1
    ? floors.find((floor: Floor) => 
        floor.floorNumber === focusedFloorNumber && 
        (!focusedWingId || floor.wingId === focusedWingId)
      )
    : null;
  const bookedFlats = selectedFloor?.flats.filter((flat: Flat) => flat.status === 'BOOKED' || flat.status === 'SOLD') ?? [];

  const vendor = vendorData?.data?.vendor;
  const vendorBills = vendorTransactionsData?.data?.transactions ?? [];
  const companyFunds = companyData?.data;
  const expenses = (expensesData?.data?.expenses ?? []) as HistoryExpense[];
  const historyExpenses = expenses
    .filter((exp) => focusedVendorId ? exp.vendorId === focusedVendorId : exp.type === 'GENERAL')
    .slice(0, 10);

  const isVendorAction =
    action === 'edit-vendor'
    || action === 'view-vendor-profile'
    || action === 'manage-vendor-documents'
    || action === 'archive-vendor'
    || action === 'vendor-transactions';
  const isCustomerPaymentAction = (action === 'record-payment' || action === 'cancel-deal') && !!customer;
  if (!site && !isVendorAction && !isCustomerPaymentAction) return null;

  const isSiteDrivenAction = !!action && ACTIONS_USING_SITE_SELECTOR.includes(action);

  return (
    <aside className="self-start border border-border bg-card p-5 sticky top-6 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain shadow-sm animate-in fade-in duration-300">

      <div className="flex flex-col gap-6">
        {/* Manage Funds Context */}
        {action === 'manage-funds' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Company Wallet */}
            <div className="border border-border bg-muted/20 p-4">
              <p className={LABEL_CLS}>Company Wallet Context</p>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground/60">Total Funds</span>
                  <span className="text-foreground">{formatINR(companyFunds?.total_fund || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground/60">Partner Capital</span>
                  <span className="text-foreground">{formatINR(companyFunds?.partner_fund || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground/60">Investor Capital</span>
                  <span className="text-foreground">{formatINR(companyFunds?.investor_fund || 0)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
                  <span className={LABEL_CLS}>Available to Use</span>
                  <span className="text-sm font-bold text-primary">{formatINR(companyFunds?.available_fund || 0)}</span>
                </div>
              </div>
            </div>

            {/* Site Status */}
            <div className="border border-border bg-muted/20 p-4">
              <p className={LABEL_CLS}>Current Site Status</p>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground/60">Allocated</span>
                  <span className="text-foreground">{formatINR(Number(site?.allocatedFund || 0))}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground/60">Spent</span>
                  <span className="text-foreground">{formatINR(Number(site?.totalExpenses || 0))}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
                  <span className={LABEL_CLS}>Balance</span>
                  <span className="text-sm font-bold text-primary">{formatINR(Number(site?.remainingFund || 0))}</span>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground/60 italic leading-relaxed">
              Adding funds will transfer money from the company&apos;s available wallet into this project&apos;s dedicated account.
            </p>
          </div>
        )}

        {/* Site Expense Context & History */}
        {action === 'add-site-expense' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Site Balance Snapshot */}
            <div className="border border-border bg-primary/5 p-4">
              <p className={LABEL_CLS}>Site Fund Snapshot</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-serif text-primary">{formatINR(Number(site?.balance || 0))}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Available</span>
              </div>
            </div>

            {/* Vendor context (if selected) */}
            {focusedVendorId && vendor && (
              <div className="border border-border bg-muted/20 p-4">
                <p className={LABEL_CLS}>Selected Vendor Details</p>
                <div className="mt-3">
                  <p className="text-sm font-bold uppercase tracking-widest">{vendor.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{vendor.type}</p>
                  <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-baseline">
                    <span className={LABEL_CLS}>Global Balance Due</span>
                    <span className="text-sm font-bold text-primary">{formatINR(Number(vendor.remainingBalance ?? vendor.totalOutstanding ?? 0))}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
                    <div>
                      <p className={LABEL_CLS}>Status</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{vendor.status}</p>
                    </div>
                    <div>
                      <p className={LABEL_CLS}>Overdue Bills</p>
                      <p className="mt-1 text-sm font-bold text-amber-700">{Number(vendor.overdueBillCount ?? 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent History */}
            <div className="flex flex-col gap-3">
              <p className={LABEL_CLS}>
                {focusedVendorId ? 'Vendor Payment History' : 'Recent General Expenses'}
              </p>
              <div className="flex flex-col gap-2">
                {historyExpenses
                  .map((exp) => (
                    <div key={exp.id} className="border border-border/50 p-2 text-[10px] flex justify-between gap-3">
                      <div className="flex flex-col gap-0.5 max-w-[60%]">
                        <span className="font-bold text-foreground truncate">{exp.reason || exp.description || 'Expense Entry'}</span>
                        <span className="text-muted-foreground/60">
                          {formatShortDate(exp.paymentDate || exp.createdAt)}
                        </span>
                      </div>
                      <span className="shrink-0 font-bold text-red-500">{formatINR(exp.amount)}</span>
                    </div>
                  ))
                }
                {historyExpenses.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">No recent history found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {action === 'book-flat' && (
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 border-b border-border pb-2">
              Booked Flats On Selected Floor
            </p>
            {floorsLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading floor details...</p>
              </div>
            ) : selectedFloor ? (
              <>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {selectedWing ? `${selectedWing.name} - ` : ''}
                  {selectedFloor.floorNumber === 0 ? 'Ground Floor' : `Floor ${selectedFloor.floorNumber}`}
                </p>
                <BookedFlatsTable
                  flats={bookedFlats}
                  floorNumber={selectedFloor.floorNumber}
                  emptyMessage="No booked/sold flats on this floor yet."
                />
              </>
            ) : (
              <p className="mt-2 text-[10px] text-muted-foreground italic">Select a floor to see its status.</p>
            )}
          </div>
        )}

        {(action === 'record-payment' || action === 'cancel-deal') && customer && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Customer card */}
            <div className="border border-border bg-muted/20 p-4 flex flex-col gap-3">
              <p className={LABEL_CLS}>Selected Customer</p>
              <p className="text-sm font-bold uppercase tracking-widest">{customer.name}</p>
              {customer.siteName && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {customer.siteName}
                  {customer.customFlatId ? ` · Flat ${customer.customFlatId}` : ''}
                </p>
              )}
              <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-3">
                <div>
                  <p className={LABEL_CLS}>Selling Price</p>
                  <p className="mt-1 text-xs font-bold">{formatINR(Number(customer.sellingPrice ?? 0))}</p>
                </div>
                <div>
                  <p className={LABEL_CLS}>Paid</p>
                  <p className="mt-1 text-xs font-bold text-emerald-600">{formatINR(Number(customer.amountPaid ?? 0))}</p>
                </div>
                <div>
                  <p className={LABEL_CLS}>Remaining</p>
                  <p className="mt-1 text-xs font-bold text-primary">{formatINR(Number(customer.remaining ?? 0))}</p>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <CustomerPaymentHistory customerId={customer.id} />
          </div>
        )}

        {isVendorAction && focusedVendorId && (
          <div className="flex flex-col gap-4">
            <div className="border border-border bg-muted/20 p-4">
              <p className={LABEL_CLS}>Selected Vendor</p>
              {vendorLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading vendor...</p>
                </div>
              ) : vendor ? (
                <>
                  <p className="mt-2 text-sm font-bold uppercase tracking-widest">{vendor.name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{vendor.type}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {vendor.contactPersonName || vendor.phone || vendor.email || 'No primary contact'}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                    <div>
                      <p className={LABEL_CLS}>Billed</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{formatINR(Number(vendor.totalBilled ?? 0))}</p>
                    </div>
                    <div>
                      <p className={LABEL_CLS}>Outstanding</p>
                      <p className="mt-1 text-sm font-bold text-primary">{formatINR(Number(vendor.totalOutstanding ?? 0))}</p>
                    </div>
                    <div>
                      <p className={LABEL_CLS}>Assigned Sites</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{Number(vendor.siteCount ?? 0)}</p>
                    </div>
                    <div>
                      <p className={LABEL_CLS}>Overdue Bills</p>
                      <p className="mt-1 text-sm font-bold text-amber-700">{Number(vendor.overdueBillCount ?? 0)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[10px] text-muted-foreground italic">Vendor details unavailable.</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className={LABEL_CLS}>Recent Vendor Bills</p>
              {vendorTransactionsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading history...</p>
                </div>
              ) : vendorBills.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">No bill history found for this vendor.</p>
              ) : (
                vendorBills.slice(0, 6).map((bill) => (
                  <div key={bill.id} className="flex justify-between gap-3 border border-border/50 p-2 text-[10px]">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{bill.description || bill.reason || bill.siteName || 'Vendor bill'}</p>
                      <p className="text-muted-foreground/60">{formatShortDate(bill.billDate || bill.createdAt)}{bill.siteName ? ` / ${bill.siteName}` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-red-500">{formatINR(Number(bill.amount ?? 0))}</p>
                      <p className="text-muted-foreground/50">{bill.paymentStatus}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
