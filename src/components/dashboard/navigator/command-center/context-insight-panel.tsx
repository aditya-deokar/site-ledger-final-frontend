import { useFloors, useWings, useExpenses } from '@/hooks/api/site.hooks';
import { useCompany } from '@/hooks/api/company.hooks';
import { useVendor } from '@/hooks/api/vendor.hooks';
import type { Flat, Floor } from '@/schemas/site.schema';

import { ACTIONS_USING_SITE_SELECTOR, LABEL_CLS } from './constants';
import { BookedFlatsTable } from './booked-flats-table';
import { formatINR } from './utils';

interface ContextInsightPanelProps {
  action: string | null;
  site: any | null;
  customer: any | null;
  focusedFloorNumber: number | null;
  focusedWingId?: string | null;
  focusedVendorId?: string | null;
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
  const companyFunds = companyData?.data;
  const expenses = expensesData?.data?.expenses ?? [];

  if (!site) return null;

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
                    <span className="text-sm font-bold text-primary">{formatINR(Number(vendor.remaining ?? 0))}</span>
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
                {expenses
                  .filter((exp: any) => focusedVendorId ? exp.vendorId === focusedVendorId : exp.type === 'GENERAL')
                  .slice(0, 10)
                  .map((exp: any) => (
                    <div key={exp.id} className="border border-border/50 p-2 text-[10px] flex justify-between items-center">
                      <div className="flex flex-col gap-0.5 max-w-[60%]">
                        <span className="font-bold text-foreground truncate">{exp.reason || exp.description || 'Expense Entry'}</span>
                        <span className="text-muted-foreground/60">{exp.paymentDate ? new Date(exp.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'No date'}</span>
                      </div>
                      <span className="font-bold text-red-500">{formatINR(exp.amount)}</span>
                    </div>
                  ))
                }
                {expenses.length === 0 && (
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
              <p className="mt-2 text-[10px] text-muted-foreground italic">Loading floor details...</p>
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

        {action === 'record-payment' && customer && (
          <div className="border border-border bg-muted/20 p-4">
            <p className={LABEL_CLS}>Selected Customer</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-widest">{customer.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground font-medium">
              Remaining Balance: <span className="text-primary">{formatINR(Number(customer.remaining ?? 0))}</span>
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
