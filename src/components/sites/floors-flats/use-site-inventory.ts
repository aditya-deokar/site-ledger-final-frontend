import { useEffect, useMemo, useState } from 'react';

import { useFloors, useWings } from '@/hooks/api/site.hooks';
import type { Wing } from '@/schemas/site.schema';

import {
  buildScopedWingOptions,
  filterFloorsByWing,
  getEffectiveWings,
  getWingOptionsFromFloors,
} from './utils';

export function useSiteInventory(siteId: string) {
  const { data, isLoading, refetch } = useFloors(siteId);
  const { data: wingsData } = useWings(siteId);
  const [selectedWingFilterId, setSelectedWingFilterId] = useState('');

  const floors = data?.data?.floors ?? [];
  const floorWingOptions = useMemo(() => getWingOptionsFromFloors(floors), [floors]);
  const siteWings = useMemo(
    () =>
      (wingsData?.data?.wings ?? []).map((wing: Wing) => ({
        id: wing.id,
        name: wing.name,
      })),
    [wingsData],
  );
  const effectiveWings = useMemo(
    () => getEffectiveWings(siteWings, floors),
    [floors, siteWings],
  );
  const showWingFilter = effectiveWings.length > 1;
  const wingFilterMeta = useMemo(
    () => buildScopedWingOptions(floors, effectiveWings),
    [effectiveWings, floors],
  );
  const wingFilterOptions = useMemo(() => {
    if (!showWingFilter) return [];
    return wingFilterMeta.wingOptions.length > 0
      ? wingFilterMeta.wingOptions
      : floorWingOptions;
  }, [floorWingOptions, showWingFilter, wingFilterMeta.wingOptions]);

  useEffect(() => {
    if (!showWingFilter) {
      if (selectedWingFilterId !== '') {
        setSelectedWingFilterId('');
      }
      return;
    }

    if (!wingFilterOptions.some((wing) => wing.id === selectedWingFilterId)) {
      setSelectedWingFilterId(wingFilterOptions[0]?.id ?? '');
    }
  }, [selectedWingFilterId, showWingFilter, wingFilterOptions]);

  const visibleFloors = useMemo(
    () => filterFloorsByWing(floors, selectedWingFilterId, showWingFilter),
    [floors, selectedWingFilterId, showWingFilter],
  );
  const visibleFlatCount = useMemo(
    () => visibleFloors.reduce((count, floor) => count + floor.flats.length, 0),
    [visibleFloors],
  );

  return {
    canOpenBooking: visibleFloors.length > 0,
    effectiveWings,
    floors,
    isLoading,
    refetchFloors: refetch,
    selectedWingFilterId,
    setSelectedWingFilterId,
    showWingFilter,
    visibleFlatCount,
    visibleFloors,
    wingFilterOptions,
  };
}
