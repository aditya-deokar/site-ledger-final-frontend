export function InvestorStatCard({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
        {label}
      </p>
      <p className={`text-2xl font-sans font-bold tracking-tight sm:text-3xl ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}
