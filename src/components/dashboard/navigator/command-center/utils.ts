import type { Flat } from '@/schemas/site.schema';

export function formatINR(n: number) {
  return 'INR ' + n.toLocaleString('en-IN');
}

export function getShortcutNumber(e: KeyboardEvent): number | null {
  const codeMatch = e.code.match(/^(?:Digit|Numpad)([0-9])$/);
  if (codeMatch?.[1]) {
    return Number(codeMatch[1]);
  }

  const keyAsNumber = Number.parseInt(e.key, 10);
  if (!Number.isNaN(keyAsNumber)) {
    return keyAsNumber;
  }

  return null;
}

export function getTodayDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function getTodayDateTimeInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function parseOptionalPositiveInteger(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const nextValue = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(nextValue) ? undefined : nextValue;
}

export function parseOptionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const nextValue = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(nextValue) ? undefined : nextValue;
}

export function formatShortDate(value?: string | null) {
  if (!value) return '-';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '-';
  return dateValue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function toDateInputValue(value?: string | null) {
  if (!value) return getTodayDateInputValue();
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return getTodayDateInputValue();
  return dateValue.toISOString().slice(0, 10);
}

export function employeeStatusLabel(status?: 'active' | 'inactive' | 'terminated') {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  if (status === 'terminated') return 'Terminated';
  return '-';
}

export function getFlatDisplayId(flat: Flat) {
  if (flat.customFlatId && flat.customFlatId.trim().length > 0) return flat.customFlatId.trim();
  if (flat.flatNumber !== null && flat.flatNumber !== undefined) return `Flat ${flat.flatNumber}`;
  return '-';
}

export function getFlatWing(flat: Flat) {
  const flatId = flat.customFlatId?.trim();
  if (!flatId) return '-';

  const hyphenWing = flatId.match(/^([a-zA-Z]+)[-\s]/);
  if (hyphenWing?.[1]) return hyphenWing[1].toUpperCase();

  const prefixWing = flatId.match(/^([a-zA-Z]+)/);
  if (prefixWing?.[1] && prefixWing[1].length <= 3) return prefixWing[1].toUpperCase();

  return '-';
}

export function toIsoDate(dateValue: string) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function toIsoDateTime(dateValue: string, timeValue?: string) {
  if (!timeValue) return undefined;
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}
