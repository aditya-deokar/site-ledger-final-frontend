// src/components/dashboard/vendor-primitives.tsx

"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

/** Simple key/value display */
export function InfoPair({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-1 border border-border bg-muted/20 p-3 rounded-md">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value ?? "-"}</p>
    </div>
  );
}

/** Summary card for KPIs */
export function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="border border-border bg-card p-4">
      <CardHeader className="p-0">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</CardTitle>
      </CardHeader>
      <CardContent className={cn("mt-2 text-2xl font-serif text-foreground", tone)}>{value}</CardContent>
    </Card>
  );
}

/** Consistent action button */
export function ActionButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-9 rounded-none text-[9px] font-bold uppercase tracking-widest", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

/** Badge for vendor status */
export function VendorStatusBadge({ status }: { status: string }) {
  const tone = (() => {
    switch (status) {
      case "ACTIVE":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
      case "INACTIVE":
        return "border-slate-500/30 bg-slate-500/10 text-slate-700";
      case "BLOCKED":
        return "border-amber-500/30 bg-amber-500/10 text-amber-700";
      case "ARCHIVED":
        return "border-rose-500/30 bg-rose-500/10 text-rose-700";
      default:
        return "border-border bg-muted text-foreground";
    }
  })();
  return <span className={cn("border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest", tone)}>{status}</span>;
}
