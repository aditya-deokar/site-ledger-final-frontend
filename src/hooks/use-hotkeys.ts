import { useCallback } from 'react';
import { useHotkeys as useHotkeysLib } from 'react-hotkeys-hook';

export interface HotkeyOptions {
  enabled?: boolean;
  scopes?: string[];
  filter?: (event: KeyboardEvent) => boolean;
  enableOnTags?: string[];
}

export function useHotkeys(
  keys: string | string[],
  callback: (event: KeyboardEvent, handler: any) => void,
  options: HotkeyOptions = {}
) {
  const memoizedCallback = useCallback(callback, []);
  
  useHotkeysLib(keys, memoizedCallback, {
    enabled: options.enabled !== false,
    scopes: options.scopes || [],
    filter: options.filter as any,
    enableOnTags: ['INPUT', 'SELECT', 'TEXTAREA'],
  });
}

// Predefined hotkey combinations
export const HOTKEYS = {
  // Navigation
  ARROW_UP: 'arrowup',
  ARROW_DOWN: 'arrowdown', 
  ARROW_LEFT: 'arrowleft',
  ARROW_RIGHT: 'arrowright',
  
  // Modifiers
  SHIFT_LEFT: 'shift+left',
  SHIFT_RIGHT: 'shift+right',
  SHIFT_UP: 'shift+up',
  SHIFT_DOWN: 'shift+down',
  
  // Actions
  ENTER: 'enter',
  ESCAPE: 'escape',
  BACKSPACE: 'backspace',
  TAB: 'tab',
  SHIFT_TAB: 'shift+tab',
  
  // Form actions
  CTRL_ENTER: 'ctrl+enter',
  CTRL_S: 'ctrl+s',
  
  // Numbers
  DIGITS: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  
  // Letters
  LETTERS: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
} as const;
