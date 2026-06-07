import type { BookFlatInput, Flat, Floor } from '@/schemas/site.schema';

import {
  COMMON_UNIT_TYPES,
  UNASSIGNED_WING_FILTER_ID,
  UNIT_TYPE_PICK_OPTIONS,
} from './constants';
import type { WingOption } from './types';
import { formatMoney } from '@/lib/money';

export function formatINR(value: number) {
  return formatMoney(value);
}

export function getBookingReferenceLabel(paymentMode?: BookFlatInput['paymentMode']) {
  switch (paymentMode) {
    case 'CHEQUE':
      return 'Cheque Number';
    case 'BANK_TRANSFER':
      return 'Bank Transfer Ref / UTR';
    case 'UPI':
      return 'UPI Transaction ID';
    default:
      return 'Reference Number';
  }
}

export function getFloorDisplayName(floor: Pick<Floor, 'floorName' | 'floorNumber'>) {
  if (floor.floorName) return floor.floorName;
  if (floor.floorNumber === 0) return 'Ground Floor';
  return `Floor ${floor.floorNumber}`;
}

export function getFlatDisplayName(flat: Pick<Flat, 'customFlatId' | 'flatNumber'>) {
  return flat.customFlatId || `Flat ${flat.flatNumber}`;
}

export function getFlatTypeLabel(flatType: Flat['flatType']) {
  return flatType === 'EXISTING_OWNER' ? 'Existing Owner' : 'Customer';
}

export function getWingOptionsFromFloors(floors: Floor[]): WingOption[] {
  const grouped = new Map<string, WingOption>();

  floors.forEach((floor) => {
    if (!floor.wingId || !floor.wingName) return;
    grouped.set(floor.wingId, { id: floor.wingId, name: floor.wingName });
  });

  return Array.from(grouped.values());
}

export function getEffectiveWings(siteWings: WingOption[], floors: Floor[]) {
  return siteWings.length > 0 ? siteWings : getWingOptionsFromFloors(floors);
}

export function hasWingSelection(floors: Floor[], wings: WingOption[]) {
  return wings.length > 0 && floors.some((floor) => Boolean(floor.wingId));
}

export function buildScopedWingOptions(floors: Floor[], wings: WingOption[]) {
  const scopedByWing = hasWingSelection(floors, wings);
  const hasUnassignedFloors = floors.some((floor) => !floor.wingId);

  if (!scopedByWing) {
    return {
      hasUnassignedFloors,
      hasWingSelection: false,
      wingOptions: [] as WingOption[],
    };
  }

  const usedWingIds = new Set(
    floors.map((floor) => floor.wingId).filter((wingId): wingId is string => Boolean(wingId)),
  );

  const wingOptions = wings.filter((wing) => usedWingIds.has(wing.id));
  if (hasUnassignedFloors) {
    wingOptions.push({ id: UNASSIGNED_WING_FILTER_ID, name: 'Unassigned' });
  }

  return {
    hasUnassignedFloors,
    hasWingSelection: true,
    wingOptions,
  };
}

export function filterFloorsByWing(
  floors: Floor[],
  selectedWingId?: string,
  scopedByWing = true,
) {
  if (!scopedByWing || !selectedWingId) {
    return floors;
  }

  if (selectedWingId === UNASSIGNED_WING_FILTER_ID) {
    return floors.filter((floor) => !floor.wingId);
  }

  return floors.filter((floor) => floor.wingId === selectedWingId);
}

export function resolveUnitTypePreset(unitType?: string | null) {
  return COMMON_UNIT_TYPES.includes((unitType ?? '') as (typeof COMMON_UNIT_TYPES)[number])
    ? ((unitType ?? '') as (typeof UNIT_TYPE_PICK_OPTIONS)[number])
    : 'CUSTOM';
}

export function resolveCustomUnitType(unitType?: string | null) {
  const normalized = unitType?.trim();

  if (!normalized) return '';
  if (COMMON_UNIT_TYPES.includes(normalized as (typeof COMMON_UNIT_TYPES)[number])) {
    return '';
  }

  return normalized;
}
