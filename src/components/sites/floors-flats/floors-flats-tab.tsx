'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, LayoutGrid, Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Flat, Floor } from '@/schemas/site.schema';

import { FloorInventoryList } from './inventory-list';
import {
  AddFloorPanel,
  DeleteFlatDialog,
  DeleteFloorDialog,
  EditFlatDialog,
  EditFloorDialog,
} from './inventory-dialogs';
import type { FlatSelectionState, ProjectType } from './types';
import { useSiteInventory } from './use-site-inventory';

export function FloorsFlatsTab({
  projectType,
  siteId,
}: {
  projectType: ProjectType;
  siteId: string;
  siteName?: string;
}) {
  const router = useRouter();
  const {
    canOpenBooking,
    effectiveWings,
    floors,
    isLoading,
    selectedWingFilterId,
    setSelectedWingFilterId,
    showWingFilter,
    visibleFlatCount,
    visibleFloors,
    wingFilterOptions,
  } = useSiteInventory(siteId);
  const [addingFloor, setAddingFloor] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [deletingFloor, setDeletingFloor] = useState<Floor | null>(null);
  const [editingFlat, setEditingFlat] = useState<FlatSelectionState | null>(null);
  const [deletingFlat, setDeletingFlat] = useState<FlatSelectionState | null>(null);

  const openBookingWorkspace = (options?: {
    initialFlatId?: string;
    preferredFloorId?: string;
    preferredWingId?: string;
  }) => {
    const params = new URLSearchParams();

    if (options?.initialFlatId) {
      params.set('flatId', options.initialFlatId);
    }

    if (options?.preferredFloorId) {
      params.set('floorId', options.preferredFloorId);
    }

    if (options?.preferredWingId) {
      params.set('wingId', options.preferredWingId);
    }

    const query = params.toString();
    router.push(query ? `/sites/${siteId}/book-flat?${query}` : `/sites/${siteId}/book-flat`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Inventory Control
              </span>
            </div>

            {showWingFilter && (
              <div className="flex items-center gap-2 border-l border-border/60 pl-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                  Wing
                </span>
                <NativeSelect
                  value={selectedWingFilterId}
                  onChange={(event) => setSelectedWingFilterId(event.target.value)}
                  className="h-8 min-w-36"
                >
                  {wingFilterOptions.map((wing) => (
                    <NativeSelectOption key={wing.id} value={wing.id}>
                      {wing.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}

            {floors.length > 0 && (
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/45">
                {visibleFloors.length} Floors - {visibleFlatCount} Flats
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                openBookingWorkspace({
                  preferredWingId: selectedWingFilterId || undefined,
                })
              }
              disabled={!canOpenBooking}
              className="h-10 gap-2 rounded-none border-border px-4 text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              <BookOpen className="h-4 w-4" /> Book Flat
            </Button>
            <Button
              onClick={() => setAddingFloor(true)}
              className="h-10 gap-2 rounded-none bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-black hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add Floor
            </Button>
          </div>
        </div>

        {floors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border bg-muted/10 py-20">
            <p className="text-sm uppercase tracking-widest text-muted-foreground/50 italic">
              No floors defined for this site
            </p>
            <Button
              variant="outline"
              onClick={() => setAddingFloor(true)}
              className="rounded-none border-primary/30 text-primary hover:bg-primary hover:text-black"
            >
              Initialize First Floor
            </Button>
          </div>
        ) : visibleFloors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-muted/10 py-16">
            <p className="text-sm uppercase tracking-widest text-muted-foreground/60">
              No floors in this wing yet
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              Select a different wing or add a floor for this wing.
            </p>
          </div>
        ) : (
          <FloorInventoryList
            floors={visibleFloors}
            onBookFlat={(flat) => openBookingWorkspace({ initialFlatId: flat.id })}
            onOpenCustomer={(flat) => {
              if (flat.customer?.id) {
                router.push(`/customers/${flat.customer.id}`);
              }
            }}
            onBookFloor={(floor) =>
              openBookingWorkspace({
                preferredFloorId: floor.id,
                preferredWingId: floor.wingId ?? selectedWingFilterId ?? undefined,
              })
            }
            onEditFloor={setEditingFloor}
            onDeleteFloor={setDeletingFloor}
            onEditFlat={(flat, floorName) => setEditingFlat({ flat, floorName })}
            onDeleteFlat={(flat, floorName) => setDeletingFlat({ flat, floorName })}
          />
        )}
      </div>

      {addingFloor && (
        <AddFloorPanel
          siteId={siteId}
          wings={effectiveWings}
          onClose={() => setAddingFloor(false)}
        />
      )}

      {editingFloor && (
        <EditFloorDialog
          siteId={siteId}
          floor={editingFloor}
          onClose={() => setEditingFloor(null)}
        />
      )}

      {deletingFloor && (
        <DeleteFloorDialog
          siteId={siteId}
          floor={deletingFloor}
          onClose={() => setDeletingFloor(null)}
        />
      )}

      {editingFlat && (
        <EditFlatDialog
          siteId={siteId}
          flat={editingFlat.flat}
          floors={floors}
          wings={effectiveWings}
          projectType={projectType}
          onClose={() => setEditingFlat(null)}
        />
      )}

      {deletingFlat && (
        <DeleteFlatDialog
          siteId={siteId}
          flat={deletingFlat.flat}
          floorName={deletingFlat.floorName}
          onClose={() => setDeletingFlat(null)}
        />
      )}
    </>
  );
}
