'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { AlertCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const INPUT_CLS = 'h-12 w-full bg-muted border-2 border-transparent rounded-none px-4 text-sm font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';
const LABEL_CLS = 'text-[10px] font-bold uppercase tracking-widest text-foreground/40';
const ERROR_CLS = 'text-[10px] text-destructive mt-1';

type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

function scoreSearchOption(option: SearchableSelectOption, normalizedQuery: string) {
  if (!normalizedQuery) return 1;

  const label = option.label.toLowerCase();
  const value = option.value.toLowerCase();
  const words = label.split(/[\s()-]+/).filter(Boolean);

  if (label === normalizedQuery || value === normalizedQuery) return 100;
  if (label.startsWith(normalizedQuery)) return 90;
  if (words.some((word) => word.startsWith(normalizedQuery))) return 80;
  if (label.includes(normalizedQuery)) return 70;
  if (option.keywords?.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))) return 60;
  if (value.includes(normalizedQuery)) return 50;
  if (option.description?.toLowerCase().includes(normalizedQuery)) return 40;
  return 0;
}

function rankSearchOptions(options: SearchableSelectOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return [...options]
    .map((option) => ({ option, score: scoreSearchOption(option, normalizedQuery) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.option.label.localeCompare(b.option.label))
    .map((row) => row.option);
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  autoFocus,
  onEnter,
  onQueryChange,
  renderNoResults,
  allowCustom = false,
}: {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (nextValue: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onQueryChange?: (query: string) => void;
  renderNoResults?: (query: string) => ReactNode;
  allowCustom?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find((option) => option.value === value) || null;
  const hasQuery = query.trim().length > 0;

  const visibleOptions = useMemo(() => {
    if (!hasQuery || !isTyping) return options;
    return rankSearchOptions(options, query);
  }, [options, query, hasQuery, isTyping]);

  useEffect(() => {
    if (isOpen && !isTyping) {
      if (selectedOption) {
        const idx = visibleOptions.findIndex((o) => o.value === selectedOption.value);
        if (idx !== -1) setActiveIndex(idx);
      } else {
        setActiveIndex(0);
      }
    } else if (!isOpen) {
      if (allowCustom) {
        setQuery(selectedOption?.label || value || '');
      } else {
        setQuery(selectedOption?.label || '');
      }
      setIsTyping(false);
    }
  }, [isOpen, selectedOption, visibleOptions, isTyping, allowCustom, value]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        // Use requestAnimationFrame to ensure the list is rendered before scrolling
        requestAnimationFrame(() => {
          activeElement.scrollIntoView({ block: 'nearest' });
        });
      }
    }
  }, [activeIndex, isOpen]);

  const handleEnter = () => {
    if (isOpen && visibleOptions.length > 0) {
      const next = visibleOptions[activeIndex] || visibleOptions[0];
      if (!next) return;
      onValueChange(next.value);
      setQuery(next.label);
      setIsOpen(false);
      onQueryChange?.(next.label);

      if (allowCustom && next.value === 'CUSTOM') {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
      return;
    }

    if (allowCustom && hasQuery) {
      onValueChange(query);
      setIsOpen(false);
    }

    onEnter?.();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setIsTyping(true);
          setActiveIndex(0);
          onQueryChange?.(e.target.value);
          if (allowCustom) {
            onValueChange(e.target.value);
          }
        }}
        onClick={() => {
          setIsOpen(true);
          setIsTyping(false);
        }}
        onFocus={(e) => {
          setIsOpen(true);
          setIsTyping(false);
          e.target.select();
        }}
        onBlur={() => {
          // Increased timeout to allow for scrollbar interaction and option selection
          window.setTimeout(() => {
            setIsOpen(false);
            setIsTyping(false);
            if (allowCustom && query) {
              onValueChange(query);
            }
          }, 200);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation(); // Prevent FormShell from navigating fields
            setIsOpen(true);
            if (!visibleOptions.length) return;
            setActiveIndex((prev) => Math.min(prev + 1, visibleOptions.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation(); // Prevent FormShell from navigating fields
            setIsOpen(true);
            if (!visibleOptions.length) return;
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (e.key === 'Escape') {
            if (isOpen) {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }
            return;
          }
          if (e.key === 'Enter') {
            if (isOpen && visibleOptions.length > 0) {
              e.preventDefault();
              e.stopPropagation(); // Prevent FormShell from moving to next field
              handleEnter();
              return;
            }
            // If dropdown is closed, let Enter bubble up to FormShell for navigation
          }
          if (e.key === 'Tab') {
            setIsOpen(false);
          }
        }}
        placeholder={searchPlaceholder || placeholder || 'Type to search...'}
        className={cn(INPUT_CLS, 'h-11 text-[11px] tracking-[0.12em]')}
        autoComplete="off"
      />

      {isOpen && visibleOptions.length > 0 && (
        <div 
          ref={listRef} 
          onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking scrollbar/container
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto overscroll-contain border border-border bg-background shadow-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20"
        >
          {visibleOptions.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onValueChange(option.value);
                setQuery(option.label);
                setIsOpen(false);
                onQueryChange?.(option.label);

                if (allowCustom && option.value === 'CUSTOM') {
                  setTimeout(() => {
                    inputRef.current?.focus();
                    inputRef.current?.select();
                  }, 50);
                }
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest transition-colors flex flex-col gap-0.5',
                idx === activeIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/40'
              )}
            >
              <span>{option.label}</span>
              {option.description && (
                <span className="text-[9px] font-medium normal-case tracking-normal text-muted-foreground/60 truncate w-full">
                  {option.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && hasQuery && visibleOptions.length === 0 && (
        <div 
          className="absolute z-50 mt-1 w-full border border-border bg-background p-1 shadow-xl max-h-60 overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {renderNoResults ? (
            <div>{renderNoResults(query)}</div>
          ) : (
            <p className="text-[10px] text-muted-foreground/60">{emptyText || 'No matching results.'}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function KeyToggle<T extends string>({
  options,
  value,
  onChange,
  renderOption,
}: {
  options: T[];
  value: T;
  onChange: (val: T) => void;
  renderOption: (opt: T, selected: boolean) => ReactNode;
}) {
  const idx = options.indexOf(value);

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + options.length) % options.length;
      onChange(options[prev]);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % options.length;
      onChange(options[next]);
    } else if (e.key >= '1' && e.key <= String(options.length)) {
      e.preventDefault();
      onChange(options[parseInt(e.key, 10) - 1]);
    }
  };

  return (
    <div
      tabIndex={0}
      role="radiogroup"
      onKeyDown={handleKeyDown}
      className="grid gap-3 outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          tabIndex={-1}
          onClick={() => onChange(opt)}
          className="outline-none"
        >
          {renderOption(opt, opt === value)}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={LABEL_CLS}>{label}</label>
      {children}
      {error && <p className={ERROR_CLS}>{error}</p>}
    </div>
  );
}

export function FormError({ msg }: { msg: string }) {
  return (
    <div className="bg-destructive/10 border border-destructive/30 p-3 text-[11px] font-bold text-destructive flex items-start gap-2">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

export function FormShell({ title, onBack, isPending, submitLabel, formId, destructive, sidePanel, children }: {
  title: string;
  onBack: () => void;
  isPending: boolean;
  submitLabel: string;
  formId: string;
  destructive?: boolean;
  sidePanel?: ReactNode;
  children: ReactNode;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const FOCUSABLE = 'input:not([type="hidden"]), textarea, select, [role="radiogroup"], [data-navbtn]';

  const requestCancel = () => {
    onBack();
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const focusables: HTMLElement[] = Array.from(el.querySelectorAll(FOCUSABLE));
    const primaryFocusable =
      focusables.find((node) => !node.hasAttribute('data-navbtn')) ||
      focusables.find((node) => node.getAttribute('data-submitbtn') === 'true') ||
      focusables[0];

    if (!primaryFocusable) return;
    requestAnimationFrame(() => {
      primaryFocusable.focus();
      primaryFocusable.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
  }, [title]);

  const getFocusables = (): HTMLElement[] => {
    if (!navRef.current) return [];
    return Array.from(navRef.current.querySelectorAll(FOCUSABLE));
  };

  const getIdx = (): number => {
    const active = document.activeElement as HTMLElement;
    const items = getFocusables();
    let idx = items.indexOf(active);
    if (idx === -1) {
      const rg = active?.closest('[role="radiogroup"]');
      if (rg) idx = items.indexOf(rg as HTMLElement);
    }
    return idx;
  };

  const focusItem = (items: HTMLElement[], idx: number) => {
    if (idx >= 0 && idx < items.length) {
      items[idx].focus();
      items[idx].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const active = document.activeElement as HTMLElement;
    const items = getFocusables();
    const idx = getIdx();
    if (idx === -1) return;

    const tag = active?.tagName;
    const isBtn = !!active?.getAttribute('data-navbtn');
    const isRadioGroup = active?.getAttribute('role') === 'radiogroup' || !!active?.closest('[role="radiogroup"]');

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      requestCancel();
      return;
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      const el = navRef.current;
      if (!el) return;
      const submitBtn = el.querySelector('[data-submitbtn="true"]') as HTMLButtonElement;
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      }
      return;
    }

    if (e.key === 'Enter') {
      if (isBtn) return;
      e.preventDefault();
      e.stopPropagation();
      focusItem(items, idx + 1);
      return;
    }

    if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && isBtn)) {
      if (!isBtn && (tag === 'SELECT' || isRadioGroup)) return;
      e.preventDefault();
      e.stopPropagation();
      focusItem(items, idx + 1);
      return;
    }

    if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && isBtn)) {
      if (!isBtn && (tag === 'SELECT' || isRadioGroup)) return;
      e.preventDefault();
      e.stopPropagation();
      focusItem(items, idx - 1);
    }
  };

  const BTN_FOCUS = 'outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';

  return (
    <div ref={navRef} onKeyDown={handleKeyDown} className="flex flex-col gap-6">
      <button onClick={requestCancel} tabIndex={-1} className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group">
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>
      
      <div className={cn(
        "grid gap-12 items-start",
        sidePanel ? "lg:grid-cols-[1fr_20rem]" : "grid-cols-1"
      )}>
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-serif tracking-tight text-foreground">{title}</h2>
          {children}
          
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              data-navbtn="true"
              type="button"
              onClick={requestCancel}
              className={cn(
                'h-12 w-full font-bold text-[11px] uppercase tracking-[0.2em] border border-border text-muted-foreground transition-all flex items-center justify-center gap-2',
                'hover:bg-muted/30',
                BTN_FOCUS,
              )}
            >
              Cancel
            </button>
            <button
              data-navbtn="true"
              data-submitbtn="true"
              type="submit"
              form={formId}
              disabled={isPending}
              className={cn(
                'h-12 w-full font-bold text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2',
                destructive
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-primary text-black hover:bg-primary/90',
                isPending && 'opacity-60 cursor-not-allowed',
                BTN_FOCUS,
              )}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
            </button>
          </div>
          
          <p className="text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
            Enter next | Ctrl+Enter save | Up/Down move | Left/Right buttons | Esc back
          </p>
        </div>

        {sidePanel && (
          <div className="lg:sticky lg:top-0 h-fit">
            {sidePanel}
          </div>
        )}
      </div>
    </div>
  );
}
