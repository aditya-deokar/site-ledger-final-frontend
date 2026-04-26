import { ChevronLeft, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { CategoryDef } from './types';
import { KeyList } from './key-list';

interface EntitySelectorProps {
  category: CategoryDef;
  action: string;
  onBack: () => void;
  onSelect: (entity: any) => void;
  focusIndex: number;
  items: any[];
  loading: boolean;
  title?: string;
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
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
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
                {(item.customFlatId || item.flatNumber) ? `Flat ${item.customFlatId || item.flatNumber}` : item.name}
              </p>
              {(item.siteName || item.type || item.status) && (
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                  {item.siteName || item.type || item.status}
                </p>
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

      <div className="mt-4 flex items-center justify-center gap-6 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
        <span>Up/Down Navigate</span>
        <span>Enter Select</span>
        <span>Esc Back</span>
      </div>
    </div>
  );
}
