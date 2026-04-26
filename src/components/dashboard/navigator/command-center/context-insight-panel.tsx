import { useFloors } from '@/hooks/api/site.hooks';
import type { Flat, Floor } from '@/schemas/site.schema';

import { ACTIONS_USING_SITE_SELECTOR, LABEL_CLS } from './constants';
import { BookedFlatsTable } from './booked-flats-table';
import { formatINR } from './utils';

interface ContextInsightPanelProps {
  action: string | null;
  site: any | null;
  customer: any | null;
  focusedFloorNumber: number | null;
}

export function ContextInsightPanel({
  action,
  site,
  customer,
  focusedFloorNumber,
}: ContextInsightPanelProps) {
  const { data: floorsData, isLoading } = useFloors(site?.id || '');
  const floors = floorsData?.data?.floors ?? [];
  const selectedFloor = focusedFloorNumber
    ? floors.find((floor: Floor) => floor.floorNumber === focusedFloorNumber)
    : null;
  const bookedFlats = selectedFloor?.flats.filter((flat: Flat) => flat.status === 'BOOKED' || flat.status === 'SOLD') ?? [];

  if (!site) return null;

  const isSiteDrivenAction = !!action && ACTIONS_USING_SITE_SELECTOR.includes(action);

  return (
    <aside className="self-start border border-border bg-card p-5 sticky top-6 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain shadow-sm animate-in fade-in duration-300">

      <div className="flex flex-col gap-4">
        {action === 'book-flat' && (
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 border-b border-border pb-2">
              Booked Flats On Selected Floor
            </p>
            {isLoading ? (
              <p className="mt-2 text-[10px] text-muted-foreground italic">Loading floor details...</p>
            ) : selectedFloor ? (
              <>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Floor {selectedFloor.floorNumber}
                </p>
                <BookedFlatsTable
                  flats={bookedFlats}
                  floorNumber={selectedFloor.floorNumber}
                  emptyMessage="No booked/sold flats on this floor yet."
                />
              </>
            ) : (
              <p className="mt-2 text-[10px] text-muted-foreground italic">No booked/sold flats on this floor yet.</p>
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
