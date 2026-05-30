// src/components/dashboard/vendor-header.tsx

"use client";

import { ChevronLeft, Trash2, Loader2, CircleDot, MapPin, Landmark, Building2, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VendorStatusBadge } from "./vendor-primitives";
import { usePatchVendorStatus } from "@/hooks/api/vendor.hooks";
import { toast } from "sonner";

export function VendorHeader({
  vendor,
  onClose,
  isPatchingStatus,
}: {
  vendor: any; // VendorSummary type
  onClose: () => void;
  isPatchingStatus: boolean;
}) {
  const { mutate: patchVendorStatus } = usePatchVendorStatus();

  const statusOptions = ["ACTIVE", "INACTIVE", "BLOCKED", "ARCHIVED"] as const;

  return (
    <div className="p-6">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>
      <div className="mt-5 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
            Vendor Workspace
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h3 className="text-3xl font-serif leading-none text-foreground sm:text-4xl">
              {vendor?.name || "Vendor"}
            </h3>
            {vendor && (
              <VendorStatusBadge status={vendor.status} />
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {vendor?.notes?.trim() ? vendor.notes : "A compact view of vendor identity, contact details, banking information, active sites, and payment health."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          <span className="border border-border bg-muted/30 px-2.5 py-1">
            {vendor?.type || "Unclassified vendor"}
          </span>
          <span className="border border-border bg-muted/30 px-2.5 py-1">
            {vendor?.contactPersonName || "No contact name"}
          </span>
          <span className="border border-border bg-muted/30 px-2.5 py-1">
            {vendor?.paymentTermsDays ? `${vendor.paymentTermsDays} day terms` : "Terms not set"}
          </span>
        </div>
        {/* Status Controls */}
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <Button
              key={status}
              type="button"
              variant={vendor?.status === status ? "default" : "outline"}
              disabled={isPatchingStatus}
              onClick={() =>
                patchVendorStatus({ id: vendor.id, status })
              }
              className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
