'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, BookOpen, Loader2, Plus, ReceiptText, Trash2 } from 'lucide-react';

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
import {
  bookFlatSchema,
  type BookFlatAgreementLineInput,
  type BookFlatInput,
  type Flat,
  type Floor,
} from '@/schemas/site.schema';
import {
  computeBookingAgreementPreview,
  getBookingAgreementLineCalculationMode,
  mapBookingAgreementLinesForSubmit,
  resolveBookingAgreementLineAmount,
  type BookingAgreementCalculationMode,
} from '@/lib/booking-pricing';

const BOOKING_PRICING_ITEM_TYPES = ['CHARGE', 'TAX', 'DISCOUNT', 'CREDIT'] as const;
const bookingAgreementCalculationModeSchema = z.enum(['FIXED_AMOUNT', 'PERCENTAGE']);
const BOOKING_PRICING_ITEM_LABELS: Record<BookFlatAgreementLineInput['type'], string> = {
  CHARGE: 'Charge',
  TAX: 'Tax / GST',
  DISCOUNT: 'Discount',
  CREDIT: 'Credit',
};

function parseOptionalNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const bookingPricingItemDraftSchema = z.object({
  type: z.enum(BOOKING_PRICING_ITEM_TYPES),
  label: z.string().trim().min(1, 'Pricing item name is required'),
  amount: z.number().min(0, 'Amount must be zero or more'),
  ratePercent: z.number().min(0).optional(),
  calculationMode: bookingAgreementCalculationModeSchema.optional(),
  note: z.string().optional().or(z.literal('')),
}).superRefine((item, ctx) => {
  if (item.type === 'TAX' && (item.ratePercent === undefined || item.ratePercent <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ratePercent'],
      message: 'Enter tax percentage',
    });
  }

  if (item.type === 'DISCOUNT') {
    const mode = item.calculationMode ?? 'FIXED_AMOUNT';

    if (mode === 'PERCENTAGE' && (item.ratePercent === undefined || item.ratePercent <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ratePercent'],
        message: 'Enter discount percentage',
      });
    }

    if (mode === 'FIXED_AMOUNT' && item.amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Enter discount amount',
      });
    }
  }
});

const bookFlatWithSelectionSchema = bookFlatSchema
  .extend({
    floorId: z.string().min(1, 'Select a floor'),
    unitTypePreset: z.enum(UNIT_TYPE_PICK_OPTIONS),
    customUnitType: z.string().trim().optional(),
    flatName: z.string().trim().min(1, 'Flat name is required'),
    flatType: z.enum(['CUSTOMER', 'EXISTING_OWNER']).default('CUSTOMER'),
    agreementLines: z.array(bookingPricingItemDraftSchema).default([]),
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
type BookFlatPricingItemDraftInput = NonNullable<BookFlatWithSelectionInput['agreementLines']>[number];

function createDefaultBookingPricingItem(): BookFlatPricingItemDraftInput {
  return {
    type: 'CHARGE',
    label: '',
    amount: 0,
    ratePercent: undefined,
    calculationMode: 'FIXED_AMOUNT',
    note: '',
  };
}

type BookFlatWorkspaceProps = {
  floors: Floor[];
  initialFlatId?: string;
  onCancel: () => void;
  onSuccess: () => void;
  preferredFloorId?: string;
  preferredWingId?: string;
  projectType: ProjectType;
  siteId: string;
  siteName?: string;
  wings: WingOption[];
};

export function BookFlatWorkspace({
  floors,
  initialFlatId,
  onCancel,
  onSuccess,
  preferredFloorId,
  preferredWingId,
  projectType,
  siteId,
  siteName,
  wings,
}: BookFlatWorkspaceProps) {
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
  } = useBookFlat(siteId, { onSuccess });
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
    control,
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
      agreementLines: [],
    },
  });
  const {
    fields: agreementLineFields,
    append: appendAgreementLine,
    remove: removeAgreementLine,
  } = useFieldArray({
    control,
    name: 'agreementLines',
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
  const agreementLines = watch('agreementLines') ?? [];
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
  const agreementPreview = computeBookingAgreementPreview(Number(sellingPrice), agreementLines);
  const remaining = Math.max(0, agreementPreview.payableTotal - Number(bookingAmount));
  const adjustmentsTotal = agreementPreview.charges + agreementPreview.tax;
  const discountsAndCreditsTotal = agreementPreview.discounts + agreementPreview.credits;

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
        agreementLines: mapBookingAgreementLinesForSubmit(data.agreementLines ?? [], data.sellingPrice),
      },
    });
  };

  const isPending = isUpdatingFlat || isCreatingFlat || isBooking;
  const formId = `book-flat-form-${siteId}-${initialFlatId ?? 'new'}`;
  const selectedWingLabel = hasWingSelection
    ? wingOptions.find((wing) => wing.id === selectedWingId)?.name ?? 'Select a wing'
    : null;
  const selectedFloorLabel = selectedFloor ? getFloorDisplayName(selectedFloor) : 'Select a floor';
  const bookingTargetLabel = flatName.trim() || 'Choose or create a flat';
  const bookingTargetMode = matchedAvailableFlat
    ? 'Existing available inventory will be booked.'
    : 'A new inventory entry will be created and booked in one step.';
  const canSubmit = Boolean(selectedFloor);
  const buyerTypeLabel = isExistingOwner ? 'Existing Owner Flat' : 'Customer Flat';

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <div className="border border-border bg-background/70 px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
              Booking Workspace
            </p>
            <h1 className="mt-2 text-3xl font-serif tracking-tight text-foreground sm:text-4xl">
              Book Flat
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground/75">
              {siteName
                ? `Create a buyer record for ${siteName}, prepare the inventory unit if needed, and record the opening booking amount in one guided flow.`
                : 'Prepare the inventory unit if needed, attach buyer details, and record the opening booking amount in one guided flow.'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 gap-2 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Floors & Flats
          </Button>
        </div>
      </div>

      <form
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div className="space-y-6">
          <input type="hidden" {...register('floorId')} />

          {(createFlatError || updateFlatError || bookingError) && (
            <div className="border border-destructive/30 bg-destructive/10 p-4 text-[11px] font-bold text-destructive">
              {getApiErrorMessage(createFlatError ?? updateFlatError ?? bookingError, 'Failed to complete booking.')}
            </div>
          )}

          <section className="border border-border bg-background/70 p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
                Unit Setup
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Match an available unit or create a new flat entry and book it immediately.
              </p>
            </div>

            {floors.length === 0 ? (
              <div className="border border-border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
                Add at least one floor first. Once a floor exists, this booking page will let you create and book a flat in one pass.
              </div>
            ) : (
              <div className="space-y-4">
                <div className={cn('grid gap-4', hasWingSelection ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
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

                <div className="grid gap-4 sm:grid-cols-2">
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

                <p className="text-[10px] text-muted-foreground/60">
                  {matchedAvailableFlat
                    ? 'Matching available flat found. This inventory unit will be booked.'
                    : 'No available match found. The system will create the flat entry and book it in one step.'}
                </p>
              </div>
            )}
          </section>

          <section className="border border-border bg-background/70 p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
                Customer Details
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Capture the primary buyer details that should be attached to this unit.
              </p>
            </div>

            <div className="space-y-4">
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </section>

          <section className="border border-border bg-background/70 p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
                Pricing & Opening Payment
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Set the base price, add any GST or other pricing items, and record the amount collected today.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  {errors.bookingAmount && <p className="text-[10px] text-destructive">{errors.bookingAmount.message}</p>}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/60">
                {isExistingOwner
                  ? 'Use 0 if this flat is only being transferred back to an existing owner.'
                  : 'Add GST, parking, floor rise, discounts, or credits now so the customer agreement starts complete.'}
              </p>

              <div className="border border-border bg-muted/10 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
                      Pricing Items
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      Use this for taxes, extra charges, discounts, or credits that should become part of the customer agreement.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendAgreementLine(createDefaultBookingPricingItem())}
                    className="h-10 gap-2 rounded-none px-4 text-[10px] font-bold uppercase tracking-widest"
                  >
                    <Plus className="h-4 w-4" />
                    Add Pricing Item
                  </Button>
                </div>

                {agreementLineFields.length === 0 ? (
                  <div className="mt-4 border border-dashed border-border bg-background/60 px-4 py-8 text-center">
                    <ReceiptText className="mx-auto h-5 w-5 text-muted-foreground/30" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                      No additional pricing items yet
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/60">
                      Base price is created automatically. Add GST, charges, or discounts only when needed.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {agreementLineFields.map((field, index) => {
                      const typePath = `agreementLines.${index}.type` as const;
                      const labelPath = `agreementLines.${index}.label` as const;
                      const amountPath = `agreementLines.${index}.amount` as const;
                      const ratePercentPath = `agreementLines.${index}.ratePercent` as const;
                      const calculationModePath = `agreementLines.${index}.calculationMode` as const;
                      const notePath = `agreementLines.${index}.note` as const;
                      const itemType = (watch(typePath) || 'CHARGE') as BookFlatAgreementLineInput['type'];
                      const calculationMode = (watch(calculationModePath) || 'FIXED_AMOUNT') as BookingAgreementCalculationMode;
                      const watchedLine = watch(`agreementLines.${index}` as const);
                      const calculatedAmount = resolveBookingAgreementLineAmount(
                        {
                          type: itemType,
                          amount: Number(watchedLine?.amount ?? 0),
                          calculationMode,
                          ratePercent: Number(watchedLine?.ratePercent ?? 0),
                        },
                        Number(sellingPrice),
                      );
                      const usesPercentage =
                        itemType === 'TAX' || (itemType === 'DISCOUNT' && calculationMode === 'PERCENTAGE');

                      return (
                        <div key={field.id} className="border border-border bg-background p-4">
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
                                Pricing Item {index + 1}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground/65">
                                {itemType === 'TAX'
                                  ? 'Applied as a percentage of the base price.'
                                  : itemType === 'DISCOUNT'
                                    ? 'Use a fixed amount or a percentage discount.'
                                    : 'Adds or reduces the agreement total directly.'}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeAgreementLine(index)}
                              className="h-9 gap-2 rounded-none border-red-500/30 px-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Pricing Item Type
                              </Label>
                              <NativeSelect
                                value={itemType}
                                onChange={(event) => {
                                  const nextType = event.target.value as BookFlatAgreementLineInput['type'];
                                  setValue(typePath, nextType, { shouldValidate: true });

                                  if (nextType === 'TAX') {
                                    setValue(calculationModePath, 'PERCENTAGE', { shouldValidate: true });
                                    setValue(amountPath, 0, { shouldValidate: true });
                                  } else if (nextType === 'DISCOUNT') {
                                    setValue(calculationModePath, 'FIXED_AMOUNT', { shouldValidate: true });
                                  } else {
                                    setValue(calculationModePath, 'FIXED_AMOUNT', { shouldValidate: true });
                                    setValue(ratePercentPath, undefined, { shouldValidate: true });
                                  }
                                }}
                                className="w-full"
                              >
                                {BOOKING_PRICING_ITEM_TYPES.map((type) => (
                                  <NativeSelectOption key={type} value={type}>
                                    {BOOKING_PRICING_ITEM_LABELS[type]}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                              {errors.agreementLines?.[index]?.type && (
                                <p className="text-[10px] text-destructive">{errors.agreementLines[index]?.type?.message}</p>
                              )}
                            </div>

                            {itemType === 'DISCOUNT' ? (
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                  Discount Mode
                                </Label>
                                <NativeSelect
                                  value={calculationMode}
                                  onChange={(event) => {
                                    const nextMode = event.target.value as BookingAgreementCalculationMode;
                                    setValue(calculationModePath, nextMode, { shouldValidate: true });

                                    if (nextMode === 'PERCENTAGE') {
                                      setValue(amountPath, 0, { shouldValidate: true });
                                    } else {
                                      setValue(ratePercentPath, undefined, { shouldValidate: true });
                                    }
                                  }}
                                  className="w-full"
                                >
                                  <NativeSelectOption value="FIXED_AMOUNT">Fixed Amount</NativeSelectOption>
                                  <NativeSelectOption value="PERCENTAGE">Percentage</NativeSelectOption>
                                </NativeSelect>
                              </div>
                            ) : itemType === 'TAX' ? (
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                  Tax Basis
                                </Label>
                                <div className="flex h-11 items-center border border-dashed border-border bg-muted/40 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/55">
                                  Percentage of base price
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                  Amount
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    {'\u20B9'}
                                  </span>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="h-11 rounded-none border-none bg-muted pl-8 text-sm focus-visible:bg-card"
                                    {...register(amountPath, { valueAsNumber: true })}
                                  />
                                </div>
                                {errors.agreementLines?.[index]?.amount && (
                                  <p className="text-[10px] text-destructive">{errors.agreementLines[index]?.amount?.message}</p>
                                )}
                              </div>
                            )}
                          </div>

                          {usesPercentage ? (
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                  {itemType === 'TAX' ? 'Tax Percentage (%)' : 'Discount Percentage (%)'}
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                                  {...register(ratePercentPath, { setValueAs: parseOptionalNumber })}
                                />
                                {errors.agreementLines?.[index]?.ratePercent && (
                                  <p className="text-[10px] text-destructive">{errors.agreementLines[index]?.ratePercent?.message}</p>
                                )}
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                  Calculated Amount
                                </Label>
                                <div className="flex h-11 items-center border border-border bg-muted px-4 text-sm font-bold text-foreground">
                                  {formatINR(calculatedAmount)}
                                </div>
                              </div>
                            </div>
                          ) : itemType === 'DISCOUNT' ? (
                            <div className="mt-4 flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Discount Amount
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  {'\u20B9'}
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="h-11 rounded-none border-none bg-muted pl-8 text-sm focus-visible:bg-card"
                                  {...register(amountPath, { valueAsNumber: true })}
                                />
                              </div>
                              {errors.agreementLines?.[index]?.amount && (
                                <p className="text-[10px] text-destructive">{errors.agreementLines[index]?.amount?.message}</p>
                              )}
                            </div>
                          ) : null}

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Pricing Item Name
                              </Label>
                              <Input
                                className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                                placeholder={
                                  itemType === 'TAX'
                                    ? 'GST, registration, stamp duty'
                                    : itemType === 'DISCOUNT'
                                      ? 'Launch discount, festival offer'
                                      : itemType === 'CREDIT'
                                        ? 'Previous advance credit'
                                        : 'Parking, floor rise, amenities'
                                }
                                {...register(labelPath)}
                              />
                              {errors.agreementLines?.[index]?.label && (
                                <p className="text-[10px] text-destructive">{errors.agreementLines[index]?.label?.message}</p>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Note
                              </Label>
                              <Input
                                className="h-11 rounded-none border-none bg-muted text-sm focus-visible:bg-card"
                                placeholder="Optional note for this pricing item"
                                {...register(notePath)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {Number(bookingAmount) > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <div className="mt-1 divide-y divide-border border border-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Base Price
                  </span>
                  <span className="text-sm font-serif text-foreground">{formatINR(agreementPreview.basePrice)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Charges + Tax
                  </span>
                  <span className="text-sm font-serif text-foreground">+ {formatINR(adjustmentsTotal)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Discounts / Credits
                  </span>
                  <span className="text-sm font-serif text-emerald-700">- {formatINR(discountsAndCreditsTotal)}</span>
                </div>
                <div className="flex items-center justify-between bg-muted/20 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Agreement Total
                  </span>
                  <span className="text-sm font-serif text-foreground">{formatINR(agreementPreview.payableTotal)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Received Now
                  </span>
                  <span className="text-sm font-serif text-red-500">- {formatINR(Number(bookingAmount))}</span>
                </div>
                <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Remaining After Booking
                  </span>
                  <span className="text-lg font-serif text-primary">{formatINR(Math.max(0, remaining))}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-5 border border-border bg-muted/[0.08] p-5 lg:sticky lg:top-6 lg:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/45">
              Booking Target
            </p>
            <p className="mt-2 text-xl font-serif text-foreground">{bookingTargetLabel}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {buyerTypeLabel}
            </p>
          </div>

          <div className="space-y-3 border border-border bg-background/80 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                Placement
              </p>
              <div className="mt-2 space-y-2">
                {selectedWingLabel && (
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                      Wing
                    </span>
                    <span className="text-right font-medium text-foreground">{selectedWingLabel}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                    Floor
                  </span>
                  <span className="text-right font-medium text-foreground">{selectedFloorLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                    Unit Type
                  </span>
                  <span className="text-right font-medium text-foreground">
                    {resolvedUnitType || 'Choose unit type'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/70 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                Inventory Action
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/75">
                {bookingTargetMode}
              </p>
            </div>
          </div>

          <div className="border border-border bg-background/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
              Deal Snapshot
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                  Base
                </span>
                <span className="font-medium text-foreground">{formatINR(agreementPreview.basePrice)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                  Extras
                </span>
                <span className="font-medium text-foreground">+ {formatINR(adjustmentsTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                  Discounts
                </span>
                <span className="font-medium text-foreground">- {formatINR(discountsAndCreditsTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2 text-[11px]">
                <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                  Agreement Total
                </span>
                <span className="font-medium text-foreground">{formatINR(agreementPreview.payableTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                  Received
                </span>
                <span className="font-medium text-foreground">{formatINR(Number(bookingAmount))}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2 text-[11px]">
                <span className="font-bold uppercase tracking-widest text-muted-foreground/45">
                  Remaining
                </span>
                <span className="text-base font-serif text-primary">{formatINR(Math.max(0, remaining))}</span>
              </div>
            </div>
          </div>

          <div className="border border-border bg-background/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
              What Happens
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/75">
              Save will prepare the unit if needed, create the buyer record, create the pricing items under that customer agreement, and record the opening booking payment in one flow.
            </p>
          </div>
        </aside>
      </form>

      <div className="sticky bottom-0 z-10 border border-border bg-background px-6 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            form={formId}
            type="submit"
            disabled={isPending || !canSubmit}
            className="h-11 flex-1 gap-2 rounded-none text-[10px] font-bold uppercase tracking-widest"
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
        </div>
      </div>
    </div>
  );
}
