import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2, X } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  useCreateFloor,
  useDeleteFlat,
  useDeleteFloor,
  useUpdateFlatDetails,
  useUpdateFloor,
} from '@/hooks/api/site.hooks';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  COMMON_UNIT_TYPES,
  UNASSIGNED_WING_FILTER_ID,
} from '@/components/sites/floors-flats/constants';
import { FlatTypeOption } from '@/components/sites/floors-flats/flat-type-option';
import type { ProjectType, WingOption } from '@/components/sites/floors-flats/types';
import {
  buildScopedWingOptions,
  filterFloorsByWing,
  getFlatDisplayName,
  getFlatTypeLabel,
  getFloorDisplayName,
} from '@/components/sites/floors-flats/utils';
import {
  createFloorSchema,
  type CreateFloorInput,
  type Flat,
  type Floor,
  type UpdateFlatDetailsInput,
  updateFlatDetailsSchema,
} from '@/schemas/site.schema';

function UnitTypeChips({
  onSelect,
  unitType,
}: {
  onSelect: (value: string) => void;
  unitType: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3 xl:grid-cols-4">
      {COMMON_UNIT_TYPES.map((option) => {
        const isSelected = unitType.trim().toLowerCase() === option.toLowerCase();

        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              'flex h-9 items-center justify-center border px-2.5 text-center text-[10px] font-bold uppercase tracking-widest transition-colors',
              isSelected
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground/70 hover:border-primary/30 hover:text-foreground',
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function AddFloorPanel({
  onClose,
  siteId,
  wings,
}: {
  onClose: () => void;
  siteId: string;
  wings: WingOption[];
}) {
  const { mutate: createFloor, isPending, error } = useCreateFloor(siteId, { onSuccess: onClose });
  const hasWings = wings.length > 0;

  const {
    clearErrors,
    formState: { errors },
    handleSubmit,
    register,
    setError,
    watch,
  } = useForm<CreateFloorInput>({
    resolver: zodResolver(createFloorSchema),
    defaultValues: {
      floorName: '',
      wingId: hasWings ? wings[0]?.id : undefined,
    },
  });
  const selectedWingId = watch('wingId') ?? '';
  const wingRegister = register('wingId');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-start justify-between border-b border-border px-8 pb-5 pt-8">
          <div>
            <h2 className="text-2xl font-serif tracking-tight text-foreground">Add New Floor</h2>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
              Manual Site Expansion
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-1 text-muted-foreground/40 transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            if (hasWings && !data.wingId) {
              setError('wingId', { type: 'manual', message: 'Select a wing' });
              return;
            }

            clearErrors('wingId');
            createFloor({ floorName: data.floorName, wingId: data.wingId || undefined });
          })}
          className="flex flex-1 flex-col"
        >
          <div className="flex flex-1 flex-col gap-6 px-8 py-6">
            {error && (
              <div className="bg-destructive/10 p-3 text-[11px] font-bold text-destructive">
                {getApiErrorMessage(error, 'Failed to add floor.')}
              </div>
            )}

            {hasWings && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Wing
                </Label>
                <NativeSelect
                  value={selectedWingId}
                  onChange={(event) => {
                    wingRegister.onChange(event);
                    clearErrors('wingId');
                  }}
                  className="w-full"
                  name={wingRegister.name}
                  onBlur={wingRegister.onBlur}
                  ref={wingRegister.ref}
                >
                  {wings.map((wing) => (
                    <NativeSelectOption key={wing.id} value={wing.id}>
                      {wing.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {errors.wingId && <p className="text-[10px] text-destructive">{errors.wingId.message}</p>}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Floor Name
              </Label>
              <Input
                placeholder="e.g. Ground Floor, 1st Floor, Basement"
                className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                {...register('floorName')}
              />
              {errors.floorName && <p className="text-[10px] text-destructive">{errors.floorName.message}</p>}
            </div>
          </div>
          <div className="border-t border-border px-8 py-6">
            <Button
              type="submit"
              disabled={isPending}
              className="h-14 w-full gap-2 rounded-none bg-primary text-[11px] font-bold uppercase tracking-[0.2em] text-black"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Floor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditFloorDialog({
  floor,
  onClose,
  siteId,
}: {
  floor: Floor;
  onClose: () => void;
  siteId: string;
}) {
  const { mutate: updateFloor, isPending, error } = useUpdateFloor(siteId, { onSuccess: onClose });
  const floorDisplayName = getFloorDisplayName(floor);
  const formId = `edit-floor-form-${floor.id}`;

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateFloorInput>({
    resolver: zodResolver(createFloorSchema),
    defaultValues: { floorName: floor.floorName ?? '' },
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md gap-0 rounded-none border-border p-0">
        <DialogHeader className="border-b border-border px-8 pb-4 pt-8">
          <DialogTitle className="text-2xl font-serif tracking-tight">Edit Floor</DialogTitle>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit((data) => updateFloor({ floorId: floor.id, data }))}
          className="flex flex-col gap-5 px-8 py-6"
        >
          {error && (
            <div className="bg-destructive/10 p-3 text-[11px] font-bold text-destructive">
              {getApiErrorMessage(error, 'Failed to update floor.')}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Floor Name
            </Label>
            <Input
              placeholder="e.g. Ground Floor, 1st Floor, Basement"
              className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
              {...register('floorName')}
            />
            {errors.floorName && <p className="text-[10px] text-destructive">{errors.floorName.message}</p>}
          </div>

          <div className="border border-border bg-muted/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Editing</p>
            <p className="mt-2 text-sm font-serif text-foreground">{floorDisplayName}</p>
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              The floor number stays the same. This only updates the visible floor label.
            </p>
          </div>
        </form>

        <div className="flex gap-3 px-8 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            form={formId}
            type="submit"
            disabled={isPending}
            className="h-11 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Floor'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFloorDialog({
  floor,
  onClose,
  siteId,
}: {
  floor: Floor;
  onClose: () => void;
  siteId: string;
}) {
  const { mutate: deleteFloor, isPending, error } = useDeleteFloor(siteId, { onSuccess: onClose });
  const floorDisplayName = getFloorDisplayName(floor);
  const canDelete = floor.flats.length === 0;

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-lg overflow-hidden rounded-none border-t-4 border-t-red-500 bg-background p-0">
        <AlertDialogHeader className="p-8 pb-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-red-500/10">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-center text-2xl font-serif">
              Delete &ldquo;{floorDisplayName}&rdquo;?
            </AlertDialogTitle>
            <p className="text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              This removes the floor record from the site structure.
            </p>
          </div>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 px-8 pb-6">
          <div
            className={cn(
              'border p-4 text-[11px] leading-relaxed',
              canDelete
                ? 'border-border bg-muted/20 text-muted-foreground'
                : 'border-red-500/20 bg-red-500/5 text-red-600',
            )}
          >
            {canDelete
              ? 'This floor is empty, so it can be deleted safely.'
              : `This floor still contains ${floor.flats.length} flat${floor.flats.length === 1 ? '' : 's'}. Delete those flats first, then remove the floor.`}
          </div>

          {error && (
            <div className="bg-destructive/10 p-3 text-[11px] font-bold text-destructive">
              {getApiErrorMessage(error, 'Failed to delete floor.')}
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex gap-4 p-8 pt-0 sm:space-x-4">
          <AlertDialogCancel className="h-12 flex-1 rounded-none border-border bg-transparent text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              if (!canDelete) return;
              deleteFloor(floor.id);
            }}
            disabled={isPending || !canDelete}
            className="h-12 flex-1 rounded-none bg-red-600 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Floor'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EditFlatDialog({
  flat,
  floors,
  onClose,
  projectType,
  siteId,
  wings,
}: {
  flat: Flat;
  floors: Floor[];
  onClose: () => void;
  projectType: ProjectType;
  siteId: string;
  wings: WingOption[];
}) {
  const { mutate: updateFlat, isPending, error } = useUpdateFlatDetails(siteId, { onSuccess: onClose });
  const flatDisplayName = getFlatDisplayName(flat);
  const formId = `edit-flat-form-${flat.id}`;
  const currentFloor = floors.find((floorItem) => floorItem.flats.some((flatItem) => flatItem.id === flat.id)) ?? null;
  const { hasWingSelection: showWingSelection, wingOptions } = buildScopedWingOptions(floors, wings);
  const initialWingId = showWingSelection
    ? currentFloor?.wingId ?? (floors.some((floorItem) => !floorItem.wingId) ? UNASSIGNED_WING_FILTER_ID : wingOptions[0]?.id ?? '')
    : '';
  const [selectedWingId, setSelectedWingId] = useState(initialWingId);

  const selectableFloors = useMemo(
    () => filterFloorsByWing(floors, selectedWingId, showWingSelection),
    [floors, selectedWingId, showWingSelection],
  );

  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<UpdateFlatDetailsInput>({
    resolver: zodResolver(updateFlatDetailsSchema),
    defaultValues: {
      customFlatId: flat.customFlatId ?? '',
      unitType: flat.unitType ?? '',
      floorId: currentFloor?.id ?? '',
      flatType: flat.flatType,
    },
  });

  const floorId = watch('floorId') ?? '';
  const selectedFloor = selectableFloors.find((floorItem) => floorItem.id === floorId) ?? null;
  const selectedFlatType = watch('flatType');
  const unitType = watch('unitType') ?? '';
  const currentFloorLabel = currentFloor ? getFloorDisplayName(currentFloor) : 'No floor assigned';
  const showPlacementWing =
    showWingSelection || Boolean(currentFloor?.wingId) || Boolean(selectedFloor?.wingId);
  const currentWingLabel = currentFloor?.wingName?.trim() || 'No wing assigned';
  const nextWingLabel = selectedFloor?.wingName?.trim() || 'No wing assigned';
  const nextFloorLabel = selectedFloor ? getFloorDisplayName(selectedFloor) : 'Select a valid floor';
  const flatTypeLabel = getFlatTypeLabel(flat.flatType);

  useEffect(() => {
    if (!showWingSelection) return;

    if (!selectedWingId || !wingOptions.some((wing) => wing.id === selectedWingId)) {
      setSelectedWingId(initialWingId);
    }
  }, [initialWingId, selectedWingId, showWingSelection, wingOptions]);

  useEffect(() => {
    if (!selectableFloors.length) {
      setValue('floorId', '', { shouldValidate: true });
      return;
    }

    if (!floorId || !selectableFloors.some((floorItem) => floorItem.id === floorId)) {
      const fallbackFloorId =
        (currentFloor && selectableFloors.some((floorItem) => floorItem.id === currentFloor.id)
          ? currentFloor.id
          : undefined) ??
        selectableFloors[0]?.id ??
        '';
      setValue('floorId', fallbackFloorId, { shouldValidate: true });
    }
  }, [currentFloor, floorId, selectableFloors, setValue]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[min(94vw,1120px)] max-w-none gap-0 overflow-hidden rounded-none border-border p-0 sm:!max-w-[1120px]">
        <DialogHeader className="border-b border-border px-8 pb-5 pt-7">
          <DialogTitle className="text-2xl font-serif tracking-tight">Edit Flat</DialogTitle>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Update this unit&apos;s identity, placement, and inventory classification without leaving the site register.
          </p>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit((data) =>
            updateFlat({
              flatId: flat.id,
              data: {
                ...data,
                unitType: data.unitType?.trim() || undefined,
                floorId: data.floorId || undefined,
                flatType: projectType === 'NEW_CONSTRUCTION' ? 'CUSTOMER' : data.flatType,
              },
            }),
          )}
          className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_19rem]"
        >
          <div className="min-h-0 overflow-y-auto">
            <div className="grid gap-6 px-8 py-6 sm:grid-cols-2 xl:grid-cols-3">
              {error && (
                <div className="bg-destructive/10 p-3 text-[11px] font-bold text-destructive sm:col-span-2 xl:col-span-3">
                  {getApiErrorMessage(error, 'Failed to update flat.')}
                </div>
              )}

              <div className="flex flex-col gap-1.5 xl:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Custom Flat ID
                </Label>
                <Input
                  placeholder="e.g. A-101, Shop-1, G-01"
                  className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                  {...register('customFlatId')}
                />
                {errors.customFlatId && <p className="text-[10px] text-destructive">{errors.customFlatId.message}</p>}
                <p className="mt-1 text-[10px] italic text-muted-foreground/50">
                  This ID must remain unique within this site
                </p>
              </div>

              {showWingSelection && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Wing
                  </Label>
                  <NativeSelect
                    value={selectedWingId}
                    onChange={(event) => {
                      setSelectedWingId(event.target.value);
                    }}
                    className="w-full"
                  >
                    {wingOptions.map((wing) => (
                      <NativeSelectOption key={wing.id} value={wing.id}>
                        {wing.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Floor
                </Label>
                <NativeSelect
                  value={floorId}
                  onChange={(event) => setValue('floorId', event.target.value, { shouldValidate: true })}
                  className="w-full"
                >
                  {selectableFloors.map((floorItem) => (
                    <NativeSelectOption key={floorItem.id} value={floorItem.id}>
                      {getFloorDisplayName(floorItem)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {errors.floorId && <p className="text-[10px] text-destructive">{errors.floorId.message}</p>}
                {selectableFloors.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60">No floors available in the selected wing.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Unit Type
                  </Label>
                  <p className="text-[10px] text-muted-foreground/55">Pick a common type or type your own</p>
                </div>
                <Input
                  value={unitType}
                  onChange={(event) => setValue('unitType', event.target.value, { shouldValidate: true })}
                  placeholder="Type or pick e.g. 2BHK, Shop, Office"
                  className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                />
                <UnitTypeChips
                  unitType={unitType}
                  onSelect={(value) => setValue('unitType', value, { shouldValidate: true })}
                />
                {errors.unitType && <p className="text-[10px] text-destructive">{errors.unitType.message}</p>}
              </div>

              <input type="hidden" {...register('flatType')} />

              {projectType === 'REDEVELOPMENT' && (
                <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Flat Type
                    </Label>
                    <p className="text-[10px] text-muted-foreground/55">Choose how this unit should behave in inventory</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FlatTypeOption
                      label="Customer Flat"
                      value="CUSTOMER"
                      selected={selectedFlatType === 'CUSTOMER'}
                      onSelect={(value) => setValue('flatType', value, { shouldValidate: true })}
                    />
                    <FlatTypeOption
                      label="Existing Owner Flat"
                      value="EXISTING_OWNER"
                      selected={selectedFlatType === 'EXISTING_OWNER'}
                      onSelect={(value) => setValue('flatType', value, { shouldValidate: true })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="border-t border-border bg-muted/[0.08] px-6 py-6 lg:border-l lg:border-t-0">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
                  Editing
                </p>
                <p className="mt-2 text-xl font-serif text-foreground">{flatDisplayName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {flatTypeLabel}
                </p>
              </div>

              <div className="space-y-3 border border-border bg-background/80 p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                    Current Placement
                  </p>
                  <div className="mt-2 space-y-2">
                    {showPlacementWing && (
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                          Wing
                        </span>
                        <span className="text-right font-medium text-foreground">{currentWingLabel}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                        Floor
                      </span>
                      <span className="text-right font-medium text-foreground">{currentFloorLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/70 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                    After Save
                  </p>
                  <div className="mt-2 space-y-2">
                    {showPlacementWing && (
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                          Wing
                        </span>
                        <span className="text-right font-medium text-foreground">{nextWingLabel}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                        Floor
                      </span>
                      <span className="text-right font-medium text-foreground">{nextFloorLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-background/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                  What Changes
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/75">
                  Save will update the flat label, unit type, floor placement, and inventory classification everywhere this site inventory is shown.
                </p>
              </div>

              {projectType === 'NEW_CONSTRUCTION' && (
                <div className="border border-border bg-primary/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                    New Construction Rule
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/75">
                    These sites always keep flats under customer inventory, so the flat type stays locked to customer.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </form>

        <div className="flex gap-3 border-t border-border bg-background px-8 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            form={formId}
            type="submit"
            disabled={isPending}
            className="h-11 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Flat'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFlatDialog({
  flat,
  floorName,
  onClose,
  siteId,
}: {
  flat: Flat;
  floorName: string;
  onClose: () => void;
  siteId: string;
}) {
  const { mutate: deleteFlat, isPending, error } = useDeleteFlat(siteId, { onSuccess: onClose });
  const flatDisplayName = getFlatDisplayName(flat);
  const canDelete = flat.status === 'AVAILABLE' && !flat.customer;

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-lg overflow-hidden rounded-none border-t-4 border-t-red-500 bg-background p-0">
        <AlertDialogHeader className="p-8 pb-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-red-500/10">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-center text-2xl font-serif">
              Delete &ldquo;{flatDisplayName}&rdquo;?
            </AlertDialogTitle>
            <p className="text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              This removes the flat from {floorName}.
            </p>
          </div>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 px-8 pb-6">
          <div
            className={cn(
              'border p-4 text-[11px] leading-relaxed',
              canDelete
                ? 'border-border bg-muted/20 text-muted-foreground'
                : 'border-red-500/20 bg-red-500/5 text-red-600',
            )}
          >
            {canDelete
              ? 'This flat is still available and unassigned, so it can be deleted.'
              : 'This flat can no longer be deleted because it is already linked to a customer or no longer available.'}
          </div>

          {error && (
            <div className="bg-destructive/10 p-3 text-[11px] font-bold text-destructive">
              {getApiErrorMessage(error, 'Failed to delete flat.')}
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex gap-4 p-8 pt-0 sm:space-x-4">
          <AlertDialogCancel className="h-12 flex-1 rounded-none border-border bg-transparent text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              if (!canDelete) return;
              deleteFlat(flat.id);
            }}
            disabled={isPending || !canDelete}
            className="h-12 flex-1 rounded-none bg-red-600 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Flat'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
