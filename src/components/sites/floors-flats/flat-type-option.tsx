type FlatTypeValue = 'CUSTOMER' | 'EXISTING_OWNER';

export function FlatTypeOption({
  label,
  onSelect,
  selected,
  value,
}: {
  label: string;
  onSelect: (value: FlatTypeValue) => void;
  selected: boolean;
  value: FlatTypeValue;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={[
        'flex flex-col items-center gap-2 border p-4 text-left transition-colors',
        selected ? 'border-primary/60 bg-primary/10' : 'border-border bg-muted/10 hover:bg-muted/20',
      ].join(' ')}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
    </button>
  );
}
