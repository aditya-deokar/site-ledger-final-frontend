'use client';

import { useEffect, useCallback } from 'react';
import { useKeyboardManager } from './use-keyboard-manager';

interface UseTransactionFormOptions {
  onSave: () => void;
  onBack: () => void;
  isValid: boolean;
  siteDropdownOpen?: boolean;
  customerDropdownOpen?: boolean;
}

/**
 * Reusable hook for high-density transaction forms.
 * Handles:
 * 1. Global shortcuts (Ctrl+Enter to save, Ctrl+Backspace/Esc to go back)
 * 2. Auto-scrolling focused fields into view
 * 3. Blocking accidental browser navigation
 */
export function useTransactionForm({
  onSave,
  onBack,
  isValid,
  siteDropdownOpen = false,
  customerDropdownOpen = false,
}: UseTransactionFormOptions) {
  
  // 1. Shared Keyboard Shortcuts
  const { focusElement } = useKeyboardManager({
    shortcuts: [
      {
        key: 'Enter',
        ctrlKey: true,
        description: 'Save Transaction',
        action: () => {
          if (isValid) onSave();
        },
      },
      {
        key: 'Backspace',
        ctrlKey: true,
        description: 'Go Back',
        action: onBack,
      },
      {
        key: 'Escape',
        description: 'Go Back',
        action: () => {
          // Only trigger if no dropdown is open
          if (!siteDropdownOpen && !customerDropdownOpen) {
            onBack();
          }
        },
      },
    ],
  });

  // 2. Global Interceptor (Capture phase for browser-level overrides)
  useEffect(() => {
    const interceptNavigationKeys = (e: KeyboardEvent) => {
      const isAltBackspace = e.key === 'Backspace' && e.altKey;
      const isShiftBackspace = e.key === 'Backspace' && e.shiftKey;
      const isCtrlBackspace = e.key === 'Backspace' && e.ctrlKey;
      const isEscape = e.key === 'Escape';
      const isAltArrow = e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight');

      // Block browser history navigation with Alt + Arrows
      if (isAltArrow) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Handle exit keys in capture phase to ensure they override input defaults
      if (isAltBackspace || isShiftBackspace || isCtrlBackspace || (isEscape && !siteDropdownOpen && !customerDropdownOpen)) {
        e.preventDefault();
        e.stopPropagation();
        onBack();
      }
    };

    document.addEventListener('keydown', interceptNavigationKeys, true);
    return () => document.removeEventListener('keydown', interceptNavigationKeys, true);
  }, [onBack, siteDropdownOpen, customerDropdownOpen]);

  // 3. Auto-scroll focus listener
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const fieldContainer = target.closest('.space-y-2');
        if (fieldContainer) {
          fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  return { focusElement };
}
