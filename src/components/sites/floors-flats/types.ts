import type { Flat, Wing } from '@/schemas/site.schema';

export type ProjectType = 'NEW_CONSTRUCTION' | 'REDEVELOPMENT';

export type WingOption = Pick<Wing, 'id' | 'name'>;

export type FlatSelectionState = {
  flat: Flat;
  floorName: string;
};
