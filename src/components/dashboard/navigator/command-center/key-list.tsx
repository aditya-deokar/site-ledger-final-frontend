import type { ReactNode } from 'react';

interface KeyListProps<T extends { shortcut: string }> {
  items: T[];
  focusIndex: number;
  onSelect: (idx: number) => void;
  renderItem: (item: T, idx: number, focused: boolean) => ReactNode;
}

export function KeyList<T extends { shortcut: string }>({
  items,
  focusIndex,
  onSelect,
  renderItem,
}: KeyListProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="w-full text-left outline-none"
          tabIndex={-1}
        >
          {renderItem(item, i, i === focusIndex)}
        </button>
      ))}
    </div>
  );
}
