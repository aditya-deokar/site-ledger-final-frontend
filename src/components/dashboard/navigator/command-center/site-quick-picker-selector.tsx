import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';

import { SearchableSelect } from '@/components/dashboard/navigator/form-primitives';

interface SiteQuickPickerSelectorProps {
  sites: any[];
  loading: boolean;
  onBack: () => void;
  onSelect: (site: any) => void;
  title?: string;
}

export function SiteQuickPickerSelector({
  sites,
  loading,
  onBack,
  onSelect,
  title,
}: SiteQuickPickerSelectorProps) {
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const activeSite = sites.find((site) => site.id === selectedSiteId) || null;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading Sites...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <button onClick={onBack} className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group">
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
        <h2 className="text-2xl font-serif tracking-tight text-foreground">{title || 'Select Site'}</h2>
      </div>

      <div className="border border-border bg-muted/20 p-4">
        <SearchableSelect
          options={sites.map((site) => ({
            value: site.id,
            label: site.name,
            description: site.address,
            keywords: [site.address].filter(Boolean),
          }))}
          value={activeSite?.id || ''}
          onValueChange={setSelectedSiteId}
          placeholder="Select site..."
          searchPlaceholder="Type site name..."
          emptyText="No sites match your search."
          autoFocus
          onEnter={() => {
            if (activeSite) onSelect(activeSite);
          }}
        />

        {activeSite ? (
          <>
            <p className="mt-3 text-[10px] text-muted-foreground">{activeSite.address}</p>
            <button
              type="button"
              onClick={() => onSelect(activeSite)}
              className="mt-4 h-11 w-full bg-primary text-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary/90 transition-colors"
            >
              Continue
            </button>
          </>
        ) : (
          <p className="mt-3 text-[10px] text-muted-foreground">No site matches your search.</p>
        )}
      </div>
    </div>
  );
}
