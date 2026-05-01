import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  useBookFlat,
  useCreateFlat,
  useUpdateFlatDetails,
} from '@/hooks/api/site.hooks';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  COMMON_UNIT_TYPES,
  UNIT_TYPE_PICK_OPTIONS,
  UNASSIGNED_WING_FILTER_ID,
} from '@/components/sites/floors-flats/constants';
import type { ProjectType, WingOption } from '@/components/sites/floors-flats/types';
import {
  buildScopedWingOptions,
  filterFloorsByWing,
  formatINR,
  getBookingReferenceLabel,
  getFlatDisplayName,
  getFloorDisplayName,
  resolveCustomUnitType,
  resolveUnitTypePreset,
} from '@/components/sites/floors-flats/utils';
import { bookFlatSchema, type BookFlatInput, type Flat, type Floor } from '@/schemas/site.schema';

const bookFlatWithSelectionSchema = bookFlatSchema
  .extend({
    floorId: z.string().min(1, 'Select a floor'),
    unitTypePreset: z.enum(UNIT_TYPE_PICK_OPTIONS),
    customUnitType: z.string().trim().optional(),
    flatName: z.string().trim().min(1, 'Flat name is required'),
    flatType: z.enum(['CUSTOMER', 'EXISTING_OWNER']).default('CUSTOMER'),
  })
  .superRefine((data, ctx) => {
    if (data.unitTypePreset === 'CUSTOM' && !data.customUnitType?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customUnitType'],
        message: 'Enter a custom unit type',
      });
    }

    if (data.bookingAmount > 0 && !data.paymentMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMode'],
        message: 'Select the payment mode for the booking amount',
      });
    }

    if (
      data.bookingAmount > 0 &&
      data.paymentMode &&
      data.paymentMode !== 'CASH' &&
      !data.referenceNumber?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['referenceNumber'],
        message: 'Reference number is required for non-cash booking payments',
      });
    }
  });

type BookFlatWithSelectionInput = z.input<typeof bookFlatWithSelectionSchema>;

export function BookFlatPanel({
  floors,
  initialFlatId,
  onClose,
  preferredFloorId,
  preferredWingId,
  projectType,
  siteId,
  wings,
}: {
  floors: Floor[];
  initialFlatId?: string;
  onClose: () => void;
  preferredFloorId?: string;
  preferredWingId?: string;
  projectType: ProjectType;
  siteId: string;
  wings: WingOption[];
}) {
  const { mutateAsync: createFlat, error: createFlatError, isPending: isCreatingFlat } = useCreateFlat(siteId);
  const {
    mutateAsync: updateFlatDetails,
    error: updateFlatError,
    isPending: isUpdatingFlat,
  } = useUpdateFlatDetails(siteId);
  const {
    mutateAsync: bookFlat,
    error: bookingError,
    isPending: isBooking,
  } = useBookFlat(siteId, { onSuccess: onClose });
  const { hasWingSelection, wingOptions } = buildScopedWingOptions(floors, wings);
  const floorWithInitialFlat = initialFlatId
    ? floors.find((floor) => floor.flats.some((flat) => flat.id === initialFlatId)) ?? null
    : null;
  const initialWingId = hasWingSelection
    ? (
        floorWithInitialFlat
          ? floorWithInitialFlat.wingId ?? UNASSIGNED_WING_FILTER_ID
          : undefined
      ) ??
      (preferredWingId && wingOptions.some((wing) => wing.id === preferredWingId)
        ? preferredWingId
        : undefined) ??
      wingOptions[0]?.id ??
      ''
    : '';
  const initialFloorCandidates = filterFloorsByWing(floors, initialWingId, hasWingSelection);
  const resolvedInitialFloorId =
    floorWithInitialFlat?.id ??
    (preferredFloorId && initialFloorCandidates.some((floor) => floor.id === preferredFloorId)
      ? preferredFloorId
      : initialFloorCandidates[0]?.id ?? '');
  const initiallySelectedFlat = floorWithInitialFlat && initialFlatId
    ? floorWithInitialFlat.flats.find((flat) => flat.id === initialFlatId) ?? null
    : null;

  const [selectedWingId, setSelectedWingId] = useState(initialWingId);
  const [selectedFloorId, setSelectedFloorId] = useState(resolvedInitialFloorId);
  const [flatIdError, setFlatIdError] = useState<string | null>(null);

  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<BookFlatWithSelectionInput>({
    resolver: zodResolver(bookFlatWithSelectionSchema),
    defaultValues: {
      floorId: resolvedInitialFloorId,
      flatName: initiallySelectedFlat ? getFlatDisplayName(initiallySelectedFlat) : '',
      unitTypePreset: resolveUnitTypePreset(initiallySelectedFlat?.unitType),
      customUnitType: resolveCustomUnitType(initiallySelectedFlat?.unitType),
      flatType:
        projectType === 'NEW_CONSTRUCTION'
          ? 'CUSTOMER'
          : initiallySelectedFlat?.flatType ?? 'CUSTOMER',
      name: '',
      phone: '',
      email: '',
      sellingPrice: 0,
      bookingAmount: 0,
      paymentMode: 'CASH',
      referenceNumber: '',
    },
  });

  useEffect(() => {
    if (!hasWingSelection) return;

    if (!selectedWingId || !wingOptions.some((wing) => wing.id === selectedWingId)) {
      setSelectedWingId(initialWingId);
    }
  }, [hasWingSelection, initialWingId, selectedWingId, wingOptions]);

  const wingScopedFloors = useMemo(
    () => filterFloorsByWing(floors, selectedWingId, hasWingSelection),
    [floors, hasWingSelection, selectedWingId],
  );

  useEffect(() => {
    const fallbackFloorId =
      (initialFlatId
        ? wingScopedFloors.find((floor) => floor.flats.some((flat) => flat.id === initialFlatId))?.id
        : undefined) ??
      (preferredFloorId && wingScopedFloors.some((floor) => floor.id === preferredFloorId)
        ? preferredFloorId
        : undefined) ??
      wingScopedFloors[0]?.id ??
      '';

    if (!selectedFloorId || !wingScopedFloors.some((floor) => floor.id === selectedFloorId)) {
      setSelectedFloorId(fallbackFloorId);
    }
  }, [initialFlatId, preferredFloorId, selectedFloorId, wingScopedFloors]);

  const selectedFloor = wingScopedFloors.find((floor) => floor.id === selectedFloorId) ?? null;
  const availableFlats = selectedFloor?.flats.filter((candidateFlat) => candidateFlat.status === 'AVAILABLE') ?? [];
  const unitTypePreset = watch('unitTypePreset');
  const customUnitType = watch('customUnitType') || '';
  const unitTypeInputValue = unitTypePreset === 'CUSTOM' ? customUnitType : unitTypePreset;
  const flatName = watch('flatName') || '';
  const selectedFlatType = watch('flatType') || 'CUSTOMER';
  const resolvedUnitType = (
    unitTypePreset === 'CUSTOM' ? customUnitType : unitTypePreset
  )?.trim() || '';
  const normalizedFlatName = flatName.trim().toLowerCase();
  const matchedAvailableFlat = normalizedFlatName
    ? availableFlats.find(
        (candidateFlat) => getFlatDisplayName(candidateFlat).trim().toLowerCase() === normalizedFlatName,
      ) ?? null
    : null;

  useEffect(() => {
    setValue('floorId', selectedFloorId, { shouldValidate: true });
  }, [selectedFloorId, setValue]);

  useEffect(() => {
    if (!matchedAvailableFlat) return;

    setValue('unitTypePreset', resolveUnitTypePreset(matchedAvailableFlat.unitType), {
      shouldValidate: true,
    });
    setValue('customUnitType', resolveCustomUnitType(matchedAvailableFlat.unitType), {
      shouldValidate: true,
    });
    setValue(
      'flatType',
      projectType === 'NEW_CONSTRUCTION' ? 'CUSTOMER' : matchedAvailableFlat.flatType,
      { shouldValidate: true },
    );
  }, [matchedAvailableFlat, projectType, setValue]);

  const applyUnitTypeValue = (nextValue: string) => {
    const normalizedValue = nextValue.trim();
    const matchedCommonUnitType = COMMON_UNIT_TYPES.find(
      (unitTypeOption) => unitTypeOption.toLowerCase() === normalizedValue.toLowerCase(),
    );

    if (matchedCommonUnitType) {
      setValue('unitTypePreset', matchedCommonUnitType, { shouldValidate: true });
      setValue('customUnitType', '', { shouldValidate: true });
      return;
    }

    setValue('unitTypePreset', 'CUSTOM', { shouldValidate: true });
    setValue('customUnitType', nextValue, { shouldValidate: true });
  };

  const effectiveFlatType =
    projectType === 'NEW_CONSTRUCTION'
      ? 'CUSTOMER'
      : matchedAvailableFlat?.flatType ?? selectedFlatType;
  const isExistingOwner = effectiveFlatType === 'EXISTING_OWNER';
  const sellingPrice = watch('sellingPrice') || 0;
  const bookingAmount = watch('bookingAmount') || 0;
  const bookingPaymentMode = watch('paymentMode') || 'CASH';
  const remaining = Number(sellingPrice) - Number(bookingAmount);

  useEffect(() => {
    if (Number(bookingAmount) <= 0 || bookingPaymentMode === 'CASH') {
      setValue('referenceNumber', '', { shouldValidate: true });
    }
  }, [bookingAmount, bookingPaymentMode, setValue]);

  const onSubmit = async (data: BookFlatWithSelectionInput) => {
    if (!selectedFloor) {
      setFlatIdError('Select a floor before booking.');
      return;
    }

    const trimmedFlatName = data.flatName.trim();
    if (!trimmedFlatName) {
      setFlatIdError('Flat name is required.');
      return;
    }

    const nextUnitType = (
      data.unitTypePreset === 'CUSTOM' ? data.customUnitType : data.unitTypePreset
    )?.trim();
    if (!nextUnitType) {
      setFlatIdError('Unit type is required.');
      return;
    }

    let targetFlatId = '';

    if (matchedAvailableFlat) {
      const currentDisplayFlatId = getFlatDisplayName(matchedAvailableFlat);
      const nextFlatType = projectType === 'NEW_CONSTRUCTION' ? 'CUSTOMER' : data.flatType;

      if (
        trimmedFlatName !== currentDisplayFlatId ||
        matchedAvailableFlat.unitType !== nextUnitType ||
        matchedAvailableFlat.flatType !== nextFlatType
      ) {
        await updateFlatDetails({
          flatId: matchedAvailableFlat.id,
          data: {
            customFlatId: trimmedFlatName,
            unitType: nextUnitType,
            flatType: nextFlatType,
          },
        });
      }

      targetFlatId = matchedAvailableFlat.id;
    } else {
      const createdFlat = await createFlat({
        floorId: selectedFloor.id,
        data: {
          customFlatId: trimmedFlatName,
          unitType: nextUnitType,
          flatType: projectType === 'NEW_CONSTRUCTION' ? 'CUSTOMER' : data.flatType,
        },
      });

      targetFlatId = createdFlat?.data?.flat?.id ?? '';
      if (!targetFlatId) {
        setFlatIdError('Could not prepare the flat entry. Please retry.');
        return;
      }
    }

    setFlatIdError(null);
    await bookFlat({
      flatId: targetFlatId,
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        sellingPrice: data.sellingPrice,
        bookingAmount: data.bookingAmount,
        paymentMode: data.bookingAmount > 0 ? data.paymentMode : undefined,
        referenceNumber: data.bookingAmount > 0 ? data.referenceNumber?.trim() || undefined : undefined,
      },
    });
  };

  const isPending = isUpdatingFlat || isCreatingFlat || isBooking;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="border-b border-border px-6 pb-4 pt-7">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
            Current Action
          </p>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-serif tracking-tight text-foreground">Book Flat</h2>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
            >
              Cancel
            </Button>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">
            {hasWingSelection
              ? 'Select wing, floor, unit type, and flat name. Then fill the customer details to complete booking.'
              : 'Choose floor, unit type, and flat name. Then fill the customer details to complete booking.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-5 px-6 py-5">
            <input type="hidden" {...register('floorId')} />

            {(createFlatError || updateFlatError || bookingError) && (
              <div className="bg-destructive/10 p-3 text-[11px] font-bold text-destructive">
                {getApiErrorMessage(createFlatError ?? updateFlatError ?? bookingError, 'Failed to complete booking.')}
              </div>
            )}

            {floors.length === 0 && (
              <div className="border border-border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
                Add at least one floor first. Then you can create and book a flat directly from this panel.
              </div>
            )}

            {floors.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                  Unit Selection
                </p>

                {hasWingSelection && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Wing
                    </Label>
                    <NativeSelect
                      value={selectedWingId}
                      onChange={(event) => {
                        setSelectedWingId(event.target.value);
                        setSelectedFloorId('');
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
                    value={selectedFloorId}
                    onChange={(event) => {
                      setSelectedFloorId(event.target.value);
                    }}
                    className="w-full"
                  >
                    {wingScopedFloors.map((floor) => (
                      <NativeSelectOption key={floor.id} value={floor.id}>
                        {getFloorDisplayName(floor)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {errors.floorId && <p className="text-[10px] text-destructive">{errors.floorId.message}</p>}
                  {wingScopedFloors.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/60">No floors found in the selected wing.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Unit Type
                  </Label>
                  <Input
                    value={unitTypeInputValue || ''}
                    onChange={(event) => applyUnitTypeValue(event.target.value)}
                    placeholder="Type or pick e.g. 2BHK, Shop, Office"
                    className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COMMON_UNIT_TYPES.map((option) => {
                      const isSelected = resolvedUnitType.toLowerCase() === option.toLowerCase();

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => applyUnitTypeValue(option)}
                          className={cn(
                            'h-7 border px-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
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
                  {errors.customUnitType && <p className="text-[10px] text-destructive">{errors.customUnitType.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Flat Name
                  </Label>
                  <Input
                    value={flatName}
                    onChange={(event) => {
                      setValue('flatName', event.target.value, { shouldValidate: true });
                      setFlatIdError(null);
                    }}
                    placeholder="e.g. A-101, Shop-1, G-01"
                    className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                  />
                  {flatIdError && <p className="text-[10px] text-destructive">{flatIdError}</p>}
                  {errors.flatName && <p className="text-[10px] text-destructive">{errors.flatName.message}</p>}
                  <p className="text-[10px] text-muted-foreground/60">
                    {matchedAvailableFlat
                      ? 'Matching available flat found. This entry will be booked.'
                      : 'This flat entry will be added and booked directly in one step.'}
                  </p>
                </div>

                {projectType === 'REDEVELOPMENT' && (
                  <div className="flex flex-col gap-1.5">
                    <input type="hidden" {...register('flatType')} />
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Buyer Type
                    </Label>
                    <NativeSelect
                      value={selectedFlatType}
                      onChange={(event) =>
                        setValue('flatType', event.target.value as 'CUSTOMER' | 'EXISTING_OWNER', {
                          shouldValidate: true,
                        })
                      }
                      className="w-full"
                    >
                      <NativeSelectOption value="CUSTOMER">New Customer</NativeSelectOption>
                      <NativeSelectOption value="EXISTING_OWNER">Existing Owner</NativeSelectOption>
                    </NativeSelect>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                Customer Details
              </p>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Full Name
                </Label>
                <Input
                  placeholder="Enter name"
                  className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                  {...register('name')}
                />
                {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Phone
                  </Label>
                  <Input
                    placeholder="+91"
                    className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                    {...register('phone')}
                  />
                  {errors.phone && <p className="text-[10px] text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Email
                  </Label>
                  <Input
                    placeholder="example@mail.com"
                    className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                    {...register('email')}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                Payment Breakdown
              </p>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  {isExistingOwner ? 'Settlement Value' : 'Base Price'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {'\u20B9'}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 rounded-none border-none bg-muted pl-8 text-sm focus-visible:bg-card"
                    {...register('sellingPrice', { valueAsNumber: true })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  {isExistingOwner
                    ? 'Use 0 if this flat is only being transferred back to an existing owner.'
                    : 'This is the starting base price. GST, charges, discounts, and credits can be added later from the customer profile.'}
                </p>
                {errors.sellingPrice && <p className="text-[10px] text-destructive">{errors.sellingPrice.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  {isExistingOwner ? 'Amount Received Now' : 'Booking Amount Received Now'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {'\u20B9'}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 rounded-none border-none bg-muted pl-8 text-sm focus-visible:bg-card"
                    {...register('bookingAmount', { valueAsNumber: true })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  Future payments can be added later from the profile. You will not need to enter the total amount again.
                </p>
                {errors.bookingAmount && <p className="text-[10px] text-destructive">{errors.bookingAmount.message}</p>}
              </div>

              {Number(bookingAmount) > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Payment Mode
                    </Label>
                    <select
                      value={bookingPaymentMode}
                      onChange={(event) =>
                        setValue('paymentMode', event.target.value as BookFlatInput['paymentMode'], {
                          shouldValidate: true,
                        })
                      }
                      className="h-11 rounded-none border border-input bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                    </select>
                    {errors.paymentMode && <p className="text-[10px] text-destructive">{errors.paymentMode.message}</p>}
                  </div>

                  {bookingPaymentMode !== 'CASH' ? (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {getBookingReferenceLabel(bookingPaymentMode)}
                      </Label>
                      <Input
                        placeholder={getBookingReferenceLabel(bookingPaymentMode)}
                        className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                        {...register('referenceNumber')}
                      />
                      {errors.referenceNumber && <p className="text-[10px] text-destructive">{errors.referenceNumber.message}</p>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Reference Number
                      </Label>
                      <div className="flex h-11 items-center border border-dashed border-border bg-muted/40 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Cash payment does not require a reference number.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 divide-y divide-border border border-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Base Price
                  </span>
                  <span className="text-sm font-serif text-foreground">{formatINR(Number(sellingPrice))}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Booking Deduction
                  </span>
                  <span className="text-sm font-serif text-red-500">- {formatINR(Number(bookingAmount))}</span>
                </div>
                <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Remaining
                  </span>
                  <span className="text-lg font-serif text-primary">{formatINR(Math.max(0, remaining))}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border px-6 py-5">
            <Button
              type="submit"
              disabled={isPending || !selectedFloor}
              className="h-14 w-full gap-2 rounded-none bg-primary text-[11px] font-bold uppercase tracking-[0.2em] text-black"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  {isExistingOwner ? 'Create Owner Entry' : 'Book Flat'}
                </>
              )}
            </Button>
            <p className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40">
              {isExistingOwner
                ? 'You can add later payments from the owner profile whenever funds are received.'
                : 'By proceeding, you generate a temporary booking receipt valid for 72 hours.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
