"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { Partner } from "@/schemas/company.schema"
import { EquityReallocation } from "./equity-reallocation"
import { useState } from "react"

const COLORS = [
  "var(--primary)",
  "oklch(0.6 0.2 215)",
  "oklch(0.7 0.15 45)",
  "oklch(0.55 0.18 300)",
  "oklch(0.65 0.2 160)",
  "oklch(0.6 0.18 20)",
]

interface EquityChartProps {
  partners: Partner[]
  onPartnersUpdate?: (partners: Partner[]) => void
}

export function EquityChart({ partners, onPartnersUpdate }: EquityChartProps) {
  const [showReallocation, setShowReallocation] = useState(false)
  
  const totalStake = partners.reduce((s, p) => s + p.stakePercentage, 0)
  const available = Math.max(0, 100 - totalStake)
  const isOverLimit = totalStake > 100

  const data = [
    ...partners.map((p, i) => ({
      key: p.id,
      name: p.name.toUpperCase(),
      value: p.stakePercentage,
      color: COLORS[i % COLORS.length],
    })),
    { key: "available-equity", name: "AVAILABLE EQUITY", value: available, color: "var(--muted)" },
  ]

  return (
    <div className="bg-card border border-border p-8 flex flex-col gap-8 shadow-sm h-full">
      <h3 className="text-2xl font-serif text-foreground tracking-tight text-center">Equity Distribution</h3>

      <div className="h-64 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.key}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--sidebar)",
                border: "1px solid var(--sidebar-border)",
                borderRadius: "0px",
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--sidebar-foreground)",
              }}
              itemStyle={{ color: "var(--sidebar-foreground)" }}
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] tracking-[0.2em] font-bold text-muted-foreground uppercase">Distributed</span>
          <span className={cn(
            "text-4xl font-sans font-bold leading-tight transition-all duration-300",
            isOverLimit ? "text-destructive" : "text-foreground"
          )}>
            {totalStake}%
          </span>
          {isOverLimit && (
            <span className="text-[8px] text-destructive font-bold mt-1">EXCEEDS 100%</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {data.map((item) => (
          <div key={item.key} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 shrink-0" style={{ backgroundColor: item.color }} />
              <span className={cn(
                "text-[9px] tracking-widest font-bold uppercase transition-all duration-300",
                item.name === "AVAILABLE EQUITY" ? "text-muted-foreground/30" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {item.name}
              </span>
            </div>
            <span className={cn(
              "text-[9px] tracking-widest font-bold uppercase transition-all duration-300",
              item.name === "AVAILABLE EQUITY" ? "text-muted-foreground/30" : "text-muted-foreground group-hover:text-primary"
            )}>
              {item.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Equity Warning */}
      {isOverLimit && (
        <div className="bg-destructive/10 border border-destructive/30 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">⚠ Equity Over-allocated</span>
          </div>
          <p className="text-[10px] text-destructive font-medium leading-relaxed">
            Total equity ({totalStake}%) exceeds 100%. Use the reallocation tool below to adjust partner stakes.
          </p>
          <button
            onClick={() => setShowReallocation(true)}
            className="text-[9px] font-bold text-destructive uppercase tracking-widest border border-destructive/30 px-3 py-1 hover:bg-destructive/20 transition-colors mt-2"
          >
            Open Reallocation Tool
          </button>
        </div>
      )}

      {/* Reallocation Modal */}
      <EquityReallocation
        partners={partners}
        isOpen={showReallocation}
        onOpenChange={setShowReallocation}
        onSave={(updatedPartners) => {
          onPartnersUpdate?.(updatedPartners)
        }}
      />
    </div>
  )
}
