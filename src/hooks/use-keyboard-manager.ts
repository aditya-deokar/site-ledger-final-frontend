'use client';

import { useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { TRANSACTION_SHORTCUTS, GLOBAL_SHORTCUTS, FORM_NAVIGATION_SHORTCUTS, ALL_SHORTCUTS } from '@/constants/keyboard-shortcuts';

// Re-export for convenience and to avoid breaking existing imports
export { TRANSACTION_SHORTCUTS, GLOBAL_SHORTCUTS, FORM_NAVIGATION_SHORTCUTS, ALL_SHORTCUTS };

export interface KeyboardShortcut {
  key: string;
  description: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  enabled?: boolean;
}

export interface UseKeyboardManagerOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardManager({ shortcuts, enabled = true }: UseKeyboardManagerOptions) {
  // Convert shortcuts to hotkeys format - library expects array of key strings
  const hotkeyKeys = shortcuts.map(shortcut => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('ctrl');
    if (shortcut.shiftKey) keys.push('shift');
    if (shortcut.altKey) keys.push('alt');
    if (shortcut.metaKey) keys.push('meta');
    keys.push(shortcut.key.toLowerCase());
    
    return keys.join('+');
  });

  // Use the hotkeys library for better handling
  useHotkeys(
    hotkeyKeys,
    (event, handler) => {
      // Find which shortcut was triggered
      const keyIndex = shortcuts.findIndex((shortcut, i) => {
        const keys = hotkeyKeys[i].toLowerCase().split('+');
        return keys.includes(event.key.toLowerCase()) || 
               (shortcut.ctrlKey && event.ctrlKey && shortcut.key.toLowerCase() === event.key.toLowerCase());
      });
      
      if (keyIndex !== -1 && shortcuts[keyIndex].enabled !== false) {
        event.preventDefault();
        event.stopPropagation();
        shortcuts[keyIndex].action();
      }
    },
    {
      enabled,
      enableOnTags: ['INPUT', 'SELECT', 'TEXTAREA'],
      filter: (event) => {
        // Allow certain keys even in input fields
        const key = event.key.toLowerCase();
        return ['tab', 'enter', 'escape'].includes(key) || (key === 'backspace' && event.altKey);
      }
    }
  );

  // Helper function to focus element by ID
  const focusElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  }, []);

  return { focusElement };
}
