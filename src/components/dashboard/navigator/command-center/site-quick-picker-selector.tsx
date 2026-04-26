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
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading Sites...</p>
      </div>
    </div>
  );

  return (
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
          value={selectedSiteId}
          onValueChange={(id) => {
            setSelectedSiteId(id);
            const site = sites.find(s => s.id === id);
            if (site) {
              // Immediate selection for faster navigation
              onSelect(site);
            }
          }}
          placeholder="Select site..."
          searchPlaceholder="Type site name..."
          emptyText="No sites match your search."
          autoFocus
        />

        <div className="mt-4 flex flex-col gap-2">
          {activeSite ? (
            <p className="text-[10px] text-muted-foreground">
              Selected: <span className="text-foreground font-bold">{activeSite.name}</span> - {activeSite.address}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">Select a site to continue.</p>
          )}
        </div>
      </div>
    </div>
  );
}


