import { ChevronLeft, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { SearchableSelect } from '@/components/dashboard/navigator/form-primitives';
import type { CategoryDef } from './types';
import { KeyList } from './key-list';

type EntityRecord = {
  id?: string;
  name?: string;
  address?: string | null;
  siteId?: string | null;
  customFlatId?: string | null;
  flatNumber?: string | number | null;
  floorNumber?: number | null;
  floorName?: string | null;
  wingName?: string | null;
  unitType?: string | null;
  flatType?: string | null;
  dealStatus?: string | null;
  phone?: string | null;
  email?: string | null;
  siteName?: string | null;
  type?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  fixedRate?: number | null;
  equityPercentage?: number | null;
};

interface EntitySelectorProps {
  category: CategoryDef;
  action: string;
  onBack: () => void;
  onSelect: (entity: EntityRecord) => void;
  focusIndex: number;
  items: EntityRecord[];
  loading: boolean;
  title?: string;
}

function getEntityTitle(category: CategoryDef, item: EntityRecord) {
  if (category.id === 'customers') return item.name || 'Untitled';
  if (item.customFlatId || item.flatNumber) return `Flat ${item.customFlatId || item.flatNumber}`;
  return item.name || 'Untitled';
}

function getInvestorMeta(item: EntityRecord) {
  const contact = [item.phone, item.email].filter(Boolean).join(' / ');
  const typeLabel = item.type === 'FIXED_RATE' ? 'Fixed Rate' : item.type === 'EQUITY' ? 'Equity' : item.type;
  const terms = item.type === 'FIXED_RATE'
    ? (item.fixedRate !== null && item.fixedRate !== undefined ? `${item.fixedRate}% p.a.` : null)
    : (item.equityPercentage !== null && item.equityPercentage !== undefined ? `${item.equityPercentage}% equity` : null);

  return [contact, item.siteName, typeLabel, terms].filter(Boolean);
}

function getVendorMeta(item: EntityRecord) {
  const contact = [item.phone, item.email].filter(Boolean).join(' / ');
  return [contact, item.type].filter(Boolean);
}

function getCustomerMeta(item: EntityRecord) {
  const contact = [item.phone, item.email].filter(Boolean).join(' / ');
  const floor = item.floorName || (item.floorNumber !== null && item.floorNumber !== undefined ? `Floor ${item.floorNumber}` : null);
  const flat = item.customFlatId || (item.flatNumber !== null && item.flatNumber !== undefined ? `Flat ${item.flatNumber}` : null);
  return [
    contact,
    item.siteName,
    item.wingName,
    floor,
    flat,
    item.unitType || item.flatType,
    item.dealStatus || item.status,
  ].filter(Boolean);
}

function getEntityMeta(category: CategoryDef, item: EntityRecord) {
  if (category.id === 'investors') return getInvestorMeta(item);
  if (category.id === 'vendors') return getVendorMeta(item);
  if (category.id === 'customers') return getCustomerMeta(item);
  if (category.id === 'sites') return [item.isActive === false ? 'Archived' : 'Active', item.address].filter(Boolean);
  return [item.siteName || item.type || item.status].filter(Boolean);
}

function getSearchText(category: CategoryDef, item: EntityRecord) {
  return [
    getEntityTitle(category, item),
    ...getEntityMeta(category, item),
    item.phone,
    item.email,
    item.id,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function EntitySelector({
  category,
  action,
  onBack,
  onSelect,
  focusIndex,
  items,
  loading,
  title,
}: EntitySelectorProps) {
  const isInvestorSelector = category.id === 'investors';
  const isVendorSelector = category.id === 'vendors';
  const isCustomerSelector = category.id === 'customers';
  const isDropdownSelector = isInvestorSelector || isVendorSelector || isCustomerSelector;
  const dropdownLabel = isInvestorSelector ? 'Investor' : isVendorSelector ? 'Vendor' : 'Customer';

  if (loading) return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <button 
          onClick={onBack} 
          data-navbtn="true"
          className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">No items found.</p>
      <button onClick={onBack} className="text-[10px] font-bold text-primary uppercase hover:underline">Go Back</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <button onClick={onBack} className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group">
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
        <h2 className="text-2xl font-serif tracking-tight text-foreground">{title || `Select ${category.label.slice(0, -1)} to ${action.split('-')[0]}`}</h2>
      </div>

      {isDropdownSelector && (
        <div className="border border-border bg-muted/20 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Search {dropdownLabel}</p>
          <SearchableSelect
            options={items.map((item) => ({
              value: item.id ?? '',
              label: getEntityTitle(category, item),
              description: getEntityMeta(category, item).join(' - '),
              keywords: getSearchText(category, item).split(' '),
            }))}
            value=""
            onValueChange={(id) => {
              const selectedItem = items.find((item) => item.id === id);
              if (selectedItem) onSelect(selectedItem);
            }}
            placeholder={`Select ${dropdownLabel.toLowerCase()}...`}
            searchPlaceholder={isCustomerSelector ? 'Search name, phone, site, flat, floor, unit...' : `Search name, phone, email, ${isInvestorSelector ? 'site, ' : ''}or type...`}
            emptyText={`No ${dropdownLabel.toLowerCase()} matches your search.`}
            autoFocus
          />
          <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/35">
            {isInvestorSelector
              ? 'Search by name, phone, site, type, or rate'
              : isVendorSelector
                ? 'Search by name, phone, email, or type'
                : 'Search by name, phone, site, wing, floor, flat, or unit type'}
          </p>
        </div>
      )}

      {!isDropdownSelector && (
        <KeyList
          items={items.map((it, i) => ({ ...it, shortcut: String(i + 1) }))}
          focusIndex={focusIndex}
          onSelect={(idx) => onSelect(items[idx])}
          renderItem={(item, i, focused) => (
            <div className={cn(
              'flex items-center gap-4 border px-5 py-4 transition-all',
              focused
                ? `${category.border} ${category.bg} shadow-sm`
                : 'border-border hover:bg-muted/30',
            )}>
              <div className="flex-1">
                <p className={cn('text-sm font-bold uppercase tracking-widest', focused ? 'text-foreground' : 'text-muted-foreground')}>
                  {getEntityTitle(category, item)}
                </p>
                {getEntityMeta(category, item).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {getEntityMeta(category, item).map((meta) => (
                      <span key={meta} className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/50">
                        {meta}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {focused && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary animate-in fade-in duration-200">
                  Confirm Enter
                </span>
              )}
            </div>
          )}
        />
      )}

      {!isDropdownSelector && (
        <div className="mt-4 flex items-center justify-center gap-6 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
          <span>Up/Down Navigate</span>
          <span>Enter Select</span>
          <span>Esc Back</span>
        </div>
      )}
    </div>
  );
}
