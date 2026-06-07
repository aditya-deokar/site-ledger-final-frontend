'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function FundDeploymentChart({ allocated, expenses }: { allocated: number; expenses: number }) {
  const pct = allocated > 0 ? Math.min(100, (expenses / allocated) * 100) : 0;
  const data = [
    { value: pct, color: 'var(--primary)' },
    { value: 100 - pct, color: 'var(--muted)' },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" paddingAngle={2}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-sans font-bold text-foreground">{pct.toFixed(0)}%</span>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50 mt-1">Deployed</span>
        </div>
      </div>
      <p className="text-[10px] text-center text-muted-foreground/50 font-medium max-w-32">
        {allocated === 0
          ? 'No funds allocated yet.'
          : `${(100 - pct).toFixed(1)}% of budget remaining.`}
      </p>
    </div>
  );
}

export default FundDeploymentChart;
