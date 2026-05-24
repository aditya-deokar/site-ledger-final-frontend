import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Flat, Floor } from '@/schemas/site.schema';

import { FLOOR_PAGE_SIZE } from './constants';
import { formatINR, getFlatDisplayName, getFloorDisplayName } from './utils';

function FlatCard({
  flat,
  onBook,
  onDelete,
  onEdit,
  onOpenCustomer,
}: {
  flat: Flat;
  onBook: (flat: Flat) => void;
  onDelete: (flat: Flat) => void;
  onEdit: (flat: Flat) => void;
  onOpenCustomer: (flat: Flat) => void;
}) {
  const flatDisplayName = getFlatDisplayName(flat);
  const isOwnerFlat = flat.flatType === 'EXISTING_OWNER';
  const flatTypeLabel = isOwnerFlat ? 'Existing Owner' : 'Customer';
  const customer = flat.customer;
  const paymentProgress = customer
    ? customer.sellingPrice > 0
      ? Math.min(100, (customer.amountPaid / customer.sellingPrice) * 100)
      : customer.remaining <= 0
        ? 100
        : 0
    : 0;
  const isSold = flat.status === 'SOLD';
  const isBooked = flat.status === 'BOOKED';
  const isAvailable = flat.status === 'AVAILABLE';

  return (
    <div className="px-3 py-3">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                isAvailable ? 'bg-emerald-500' : isSold ? 'bg-blue-500' : 'bg-amber-500',
              )}
            />
            <p className="truncate text-base font-semibold text-foreground">{flatDisplayName}</p>
            <span
              className={cn(
                'inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest',
                isAvailable
                  ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-700'
                  : isSold
                    ? 'border-blue-500/25 bg-blue-500/15 text-blue-700'
                    : 'border-amber-500/25 bg-amber-500/15 text-amber-700',
              )}
            >
              {isAvailable ? 'Available' : isSold ? 'Sold' : 'Booked'}
            </span>
            <span
              className={cn(
                'inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest',
                isOwnerFlat
                  ? 'border-violet-500/25 bg-violet-500/15 text-violet-700'
                  : 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700',
              )}
            >
              {flatTypeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/75">
            <span>{flat.unitType || 'Unit type pending'}</span>
            {customer ? (
              <button
                type="button"
                onClick={() => onOpenCustomer(flat)}
                className="max-w-full truncate text-left text-foreground/85 hover:underline"
              >
                {customer.name}
              </button>
            ) : (
              <span>No customer assigned</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {customer ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                <span>Payment</span>
                <span>{paymentProgress.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full',
                    isSold ? 'bg-emerald-500' : isBooked ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/80">
                {formatINR(customer.amountPaid)} / {formatINR(customer.sellingPrice)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                Ready to book
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                Choose wing, floor, unit type and customer details.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:justify-end">
          {isAvailable ? (
            <>
              <Button
                type="button"
                onClick={() => onBook(flat)}
                className="h-8 gap-1 rounded-md px-3 text-[10px] font-bold uppercase tracking-widest"
              >
                <BookOpen className="h-3.5 w-3.5" /> Book
              </Button>
              <button
                type="button"
                onClick={() => onEdit(flat)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground/70 transition-colors hover:text-foreground"
                aria-label={`Edit ${flatDisplayName}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(flat)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground/70 transition-colors hover:text-red-500"
                aria-label={`Delete ${flatDisplayName}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenCustomer(flat)}
                disabled={!customer}
                className="h-8 rounded-md px-3 text-[10px] font-bold uppercase tracking-widest"
              >
                View
              </Button>
              <button
                type="button"
                onClick={() => onEdit(flat)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground/70 transition-colors hover:text-foreground"
                aria-label={`Edit ${flatDisplayName}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FloorRow({
  defaultOpen,
  floor,
  onBookFlat,
  onBookFloor,
  onDeleteFlat,
  onDeleteFloor,
  onEditFlat,
  onEditFloor,
  onOpenCustomer,
}: {
  defaultOpen: boolean;
  floor: Floor;
  onBookFlat: (flat: Flat) => void;
  onBookFloor: (floor: Floor) => void;
  onDeleteFlat: (flat: Flat, floorName: string) => void;
  onDeleteFloor: (floor: Floor) => void;
  onEditFlat: (flat: Flat, floorName: string) => void;
  onEditFloor: (floor: Floor) => void;
  onOpenCustomer: (flat: Flat) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [page, setPage] = useState(1);

  const sold = floor.flats.filter((flatItem) => flatItem.status === 'SOLD').length;
  const booked = floor.flats.filter((flatItem) => flatItem.status === 'BOOKED').length;
  const available = floor.flats.filter((flatItem) => flatItem.status === 'AVAILABLE').length;
  const ownerFlats = floor.flats.filter((flatItem) => flatItem.flatType === 'EXISTING_OWNER').length;
  const customerFlats = Math.max(0, floor.flats.length - ownerFlats);
  const totalPages = Math.max(1, Math.ceil(floor.flats.length / FLOOR_PAGE_SIZE));
  const pagedFlats = floor.flats.slice((page - 1) * FLOOR_PAGE_SIZE, page * FLOOR_PAGE_SIZE);
  const floorDisplayName = getFloorDisplayName(floor);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="border border-border/80 bg-background">
      <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{floorDisplayName}</h3>
            {floor.wingName && (
              <span className="bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {floor.wingName}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <span className="bg-muted px-2 py-0.5 text-muted-foreground/70">{floor.flats.length} Flats</span>
            <span className="bg-emerald-500/10 px-2 py-0.5 text-emerald-600">{available} Available</span>
            <span className="bg-amber-500/10 px-2 py-0.5 text-amber-600">{booked} Booked</span>
            <span className="bg-foreground/10 px-2 py-0.5 text-foreground/70">{sold} Sold</span>
            <span className="bg-sky-500/10 px-2 py-0.5 text-sky-700">{customerFlats} Customer</span>
            <span className="bg-violet-500/15 px-2 py-0.5 text-violet-700">{ownerFlats} Existing Owner</span>
          </div>
        </button>

        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onEditFloor(floor)}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-border p-0 text-muted-foreground/70 hover:bg-muted hover:text-foreground"
            aria-label={`Edit ${floorDisplayName}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteFloor(floor)}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-border p-0 text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-500"
            aria-label={`Delete ${floorDisplayName}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onBookFloor(floor)}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-border text-muted-foreground/70 hover:bg-primary hover:text-black"
            aria-label={`Book a flat in ${floorDisplayName}`}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setOpen((isOpen) => !isOpen)}
            className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground/60 hover:text-foreground"
            aria-label={open ? `Collapse ${floorDisplayName}` : `Expand ${floorDisplayName}`}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1">
          {floor.flats.length === 0 ? (
            <button
              type="button"
              onClick={() => onBookFloor(floor)}
              className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <BookOpen className="h-5 w-5 text-muted-foreground/30" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                Book A Flat
              </p>
            </button>
          ) : (
            <div className="border border-border/70 bg-background">
              <div className="hidden border-b border-border/70 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/55 md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] md:items-center">
                <span>Flat</span>
                <span>Payment</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-border/70">
                {pagedFlats.map((flatItem) => (
                  <FlatCard
                    key={flatItem.id}
                    flat={flatItem}
                    onBook={onBookFlat}
                    onOpenCustomer={onOpenCustomer}
                    onEdit={(selectedFlat) => onEditFlat(selectedFlat, floorDisplayName)}
                    onDelete={(selectedFlat) => onDeleteFlat(selectedFlat, floorDisplayName)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/10 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60">
                    Showing {(page - 1) * FLOOR_PAGE_SIZE + 1}-
                    {Math.min(page * FLOOR_PAGE_SIZE, floor.flats.length)} of {floor.flats.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      disabled={page === 1}
                      className="h-7 border border-border px-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {page}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                      disabled={page === totalPages}
                      className="h-7 border border-border px-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FloorInventoryList({
  floors,
  onBookFlat,
  onBookFloor,
  onDeleteFlat,
  onDeleteFloor,
  onEditFlat,
  onEditFloor,
  onOpenCustomer,
}: {
  floors: Floor[];
  onBookFlat: (flat: Flat) => void;
  onBookFloor: (floor: Floor) => void;
  onDeleteFlat: (flat: Flat, floorName: string) => void;
  onDeleteFloor: (floor: Floor) => void;
  onEditFlat: (flat: Flat, floorName: string) => void;
  onEditFloor: (floor: Floor) => void;
  onOpenCustomer: (flat: Flat) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {floors.map((floor, index) => (
        <FloorRow
          key={floor.id}
          floor={floor}
          defaultOpen={index === 0}
          onBookFlat={onBookFlat}
          onOpenCustomer={onOpenCustomer}
          onBookFloor={onBookFloor}
          onEditFloor={onEditFloor}
          onDeleteFloor={onDeleteFloor}
          onEditFlat={onEditFlat}
          onDeleteFlat={onDeleteFlat}
        />
      ))}
    </div>
  );
}
