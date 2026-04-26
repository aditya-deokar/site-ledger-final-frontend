import type { Flat } from '@/schemas/site.schema';
import { cn } from '@/lib/utils';

import { formatShortDate, getFlatDisplayId, getFlatWing } from './utils';

interface BookedFlatsTableProps {
  flats: Flat[];
  floorNumber: number | null;
  emptyMessage: string;
}

export function BookedFlatsTable({ flats, floorNumber, emptyMessage }: BookedFlatsTableProps) {
  if (!flats.length) {
    return <p className="mt-2 text-[10px] text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="mt-2 border border-border/60">
      <table className="w-full table-fixed text-[10px]">
        <thead className="bg-muted/30">
          <tr className="border-b border-border/60 text-[9px] uppercase tracking-widest text-muted-foreground">
            <th className="px-3 py-2 text-left">Wing</th>
            <th className="px-3 py-2 text-left">Floor</th>
            <th className="px-3 py-2 text-left">Flat</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Booked On</th>
          </tr>
        </thead>
        <tbody>
          {flats.map((flat) => (
            <tr key={flat.id} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 font-bold uppercase tracking-widest">{getFlatWing(flat)}</td>
              <td className="px-3 py-2">{floorNumber ?? '—'}</td>
              <td className="px-3 py-2 font-bold uppercase tracking-widest">{getFlatDisplayId(flat)}</td>
              <td className="px-3 py-2 truncate" title={flat.unitType ?? undefined}>{flat.unitType || '—'}</td>
              <td className={cn(
                'px-3 py-2 font-bold uppercase tracking-widest',
                flat.status === 'SOLD' ? 'text-amber-500' : 'text-blue-500'
              )}>
                {flat.status}
              </td>
              <td className="px-3 py-2">{formatShortDate(flat.customer?.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
