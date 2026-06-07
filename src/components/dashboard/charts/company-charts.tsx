'use client';

import { BarChart, Bar, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';

export interface EquityDonutRow {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function EquityDonut({ donutRows }: { donutRows: EquityDonutRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={donutRows}
          dataKey="value"
          nameKey="label"
          innerRadius={58}
          outerRadius={86}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {donutRows.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface WithdrawalTrendBucket {
  day: string;
  amount: number;
}

export function WithdrawalTrendsChart({
  chartData,
  maxAmount,
  formatINR,
}: {
  chartData: WithdrawalTrendBucket[];
  maxAmount: number;
  formatINR: (amount: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} barCategoryGap="4%" barGap={1}>
        <Tooltip
          cursor={false}
          contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 0, fontSize: 11 }}
          formatter={(v: number) => v > 0 ? [formatINR(v), 'Withdrawn'] : null}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="amount" radius={0} minPointSize={0}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.amount === maxAmount && entry.amount > 0
                  ? 'var(--primary)'
                  : entry.amount > 0
                    ? 'color-mix(in oklch, var(--primary) 35%, transparent)'
                    : 'var(--muted)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
