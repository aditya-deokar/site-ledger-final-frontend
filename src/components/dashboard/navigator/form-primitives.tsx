'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const INPUT_CLS = 'h-12 w-full bg-muted border-2 border-transparent rounded-none px-4 text-sm font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';
const LABEL_CLS = 'text-[10px] font-bold uppercase tracking-widest text-foreground/40';
const ERROR_CLS = 'text-[10px] text-destructive mt-1';

type SearchableSelectOption = {
  value: string;
  label: string;
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
  onEnter,
  onQueryChange,
  renderNoResults,
}: {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (nextValue: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onEnter?: () => void;
  onQueryChange?: (query: string) => void;
  renderNoResults?: (query: string) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedOption = options.find((option) => option.value === value) || null;
  const hasQuery = query.trim().length > 0;

  const visibleOptions = useMemo(() => {
    if (!hasQuery) return options;
    return rankSearchOptions(options, query);
  }, [options, query, hasQuery]);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label || '');
    }
  }, [isOpen, selectedOption]);

  useEffect(() => {
    if (!visibleOptions.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => Math.min(prev, visibleOptions.length - 1));
  }, [visibleOptions]);

  const handleEnter = () => {
    if (isOpen && visibleOptions.length > 0) {
      const next = visibleOptions[activeIndex] || visibleOptions[0];
      if (!next) return;
      onValueChange(next.value);
      setQuery(next.label);
      setIsOpen(false);
      onQueryChange?.(next.label);
      return;
    }

    onEnter?.();
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(0);
          onQueryChange?.(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            if (!visibleOptions.length) return;
            setActiveIndex((prev) => Math.min(prev + 1, visibleOptions.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIsOpen(true);
            if (!visibleOptions.length) return;
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            handleEnter();
            return;
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
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-border bg-background shadow-2xl">
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
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest transition-colors',
                idx === activeIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/40'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {isOpen && hasQuery && visibleOptions.length === 0 && (
        <div className="absolute z-20 mt-1 w-full border border-border bg-background p-2 shadow-2xl">
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
  return <div className="bg-destructive/10 border border-destructive/30 p-3 text-[11px] font-bold text-destructive">{msg}</div>;
}

export function FormShell({ title, onBack, isPending, submitLabel, formId, destructive, children }: {
  title: string;
  onBack: () => void;
  isPending: boolean;
  submitLabel: string;
  formId: string;
  destructive?: boolean;
  children: ReactNode;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelChoice, setCancelChoice] = useState<'keep' | 'confirm'>('keep');
  const keepEditingBtnRef = useRef<HTMLButtonElement>(null);
  const confirmCancelBtnRef = useRef<HTMLButtonElement>(null);
  const FOCUSABLE = 'input:not([type="hidden"]), textarea, select, [role="radiogroup"], [data-navbtn]';

  const requestCancel = () => {
    setCancelChoice('keep');
    setShowCancelConfirm(true);
  };
  const dismissCancel = () => setShowCancelConfirm(false);
  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onBack();
  };

  useEffect(() => {
    if (!showCancelConfirm) return;
    const target = cancelChoice === 'keep' ? keepEditingBtnRef.current : confirmCancelBtnRef.current;
    requestAnimationFrame(() => target?.focus());
  }, [showCancelConfirm, cancelChoice]);

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

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const getFocusables = (): HTMLElement[] =>
      Array.from(el.querySelectorAll(FOCUSABLE));

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

    const handler = (e: KeyboardEvent) => {
      if (showCancelConfirm) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          dismissCancel();
          return;
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setCancelChoice('keep');
          return;
        }

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setCancelChoice('confirm');
          return;
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          setCancelChoice((prev) => (prev === 'keep' ? 'confirm' : 'keep'));
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (cancelChoice === 'keep') {
            dismissCancel();
          } else {
            confirmCancel();
          }
        }
        return;
      }

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
        focusItem(items, idx + 1);
        return;
      }

      if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && isBtn)) {
        if (!isBtn && (tag === 'SELECT' || isRadioGroup)) return;
        e.preventDefault();
        focusItem(items, idx - 1);
      }
    };

    el.addEventListener('keydown', handler, true);
    return () => el.removeEventListener('keydown', handler, true);
  }, [showCancelConfirm]);

  const BTN_FOCUS = 'outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';

  return (
    <div ref={navRef} className="flex flex-col gap-6">
      <button onClick={requestCancel} tabIndex={-1} className="flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group">
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>
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
        Enter next | Up/Down move | Left/Right buttons | Esc back
      </p>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-md border border-border bg-background p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-foreground">Cancel This Action?</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Any unsaved inputs in this form will be lost.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                ref={keepEditingBtnRef}
                type="button"
                onClick={dismissCancel}
                onFocus={() => setCancelChoice('keep')}
                className={cn(
                  'h-11 w-full font-bold text-[10px] uppercase tracking-[0.18em] border border-border text-muted-foreground transition-all',
                  'hover:bg-muted/30',
                  cancelChoice === 'keep' && 'border-primary text-foreground bg-muted/40',
                  BTN_FOCUS,
                )}
              >
                Keep Editing
              </button>
              <button
                ref={confirmCancelBtnRef}
                type="button"
                onClick={confirmCancel}
                onFocus={() => setCancelChoice('confirm')}
                className={cn(
                  'h-11 w-full font-bold text-[10px] uppercase tracking-[0.18em] transition-all',
                  'bg-primary text-black hover:bg-primary/90',
                  cancelChoice === 'confirm' && 'ring-2 ring-primary/50',
                  BTN_FOCUS,
                )}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
