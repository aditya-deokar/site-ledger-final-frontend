export const UNASSIGNED_WING_FILTER_ID = '__UNASSIGNED__';

export const COMMON_UNIT_TYPES = [
  '1RK',
  '1BHK',
  '2BHK',
  '2.5BHK',
  '3BHK',
  '4BHK',
  'DUPLEX',
  'PENTHOUSE',
] as const;

export const UNIT_TYPE_PICK_OPTIONS = [...COMMON_UNIT_TYPES, 'CUSTOM'] as const;

export const FLOOR_PAGE_SIZE = 8;
