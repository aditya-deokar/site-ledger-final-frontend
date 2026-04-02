"use client"

export function StatusMetrics() {
  return (
    <div className="flex gap-1 items-center">
      <MetricItem label="Uptime" value="99.98%" />
      <div className="w-[1px] h-8 bg-white/10 mx-2" />
      <MetricItem label="Latency" value="24ms" />
      <div className="w-[1px] h-8 bg-white/10 mx-2" />
      <MetricItem label="Nodes" value="Active" variant="success" />
    </div>
  )
}

function MetricItem({ label, value, variant }: { label: string, value: string, variant?: 'default' | 'success' }) {
  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <span className="text-[8px] uppercase tracking-[0.2em] opacity-40 font-medium">{label}</span>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${variant === 'success' ? 'text-primary' : 'text-primary/80'}`}>
        {value}
      </span>
    </div>
  )
}
