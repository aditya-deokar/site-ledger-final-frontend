import type { LucideIcon } from 'lucide-react';

export interface ActionDef {
  id: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

export interface CategoryDef {
  id: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  actions: ActionDef[];
}

export type Phase = 'categories' | 'actions' | 'selector' | 'sub-selector' | 'form';
