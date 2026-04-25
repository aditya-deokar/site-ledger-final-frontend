"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CustomerDetailPageContent } from "@/components/dashboard/customer-detail-page-content"
import { useAllCustomers } from "@/hooks/api/customer.hooks"
import { Customer } from "@/schemas/customer.schema"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, Loader2 } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"

function DetailSkeleton() {
  return (
    <div className="w-full max-w-6xl min-w-0 space-y-8">
      <Skeleton className="h-9 w-40" />
      <div className="space-y-3">
        <Skeleton className="h-9 w-3/4 max-w-md" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = typeof params?.customerId === "string" ? params.customerId : Array.isArray(params?.customerId) ? params?.customerId[0] : ""

  const { data, isLoading, isError, error, refetch, isRefetching } = useAllCustomers()

  const customer = useMemo(() => {
    const raw = (data as { data?: { customers?: (Customer & { siteId: string | null; siteName: string | null })[] } })?.data?.customers ?? []
    return raw.find((c) => c.id === customerId) ?? null
  }, [data, customerId])

  return (
    <DashboardShell>
      <div className="min-w-0 w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {isLoading ? (
          <DetailSkeleton />
        ) : isError ? (
          <div className="border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-destructive font-medium">
              {getApiErrorMessage(error, "We could not load customers.")}
            </p>
            <Button variant="outline" className="mt-6 h-9 rounded-none text-[10px] font-bold uppercase tracking-widest" onClick={() => refetch()}>
              {isRefetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Try again"}
            </Button>
            <div className="mt-4">
              <Link
                href="/customers"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "inline-flex h-9 min-h-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Customers
              </Link>
            </div>
          </div>
        ) : !customerId ? (
          <div className="border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            <p>Missing customer in the URL.</p>
            <Link
              href="/customers"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "mt-4 inline-flex h-9 min-h-0 items-center text-[10px] font-bold uppercase tracking-widest",
              )}
            >
              Back to Customers
            </Link>
          </div>
        ) : !customer ? (
          <div className="border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No customer found for this link. It may have been removed or you may not have access.</p>
            <Link
              href="/customers"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "mt-6 inline-flex h-9 min-h-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Customers
            </Link>
          </div>
        ) : !customer.siteId ? (
          <div className="border border-amber-500/20 bg-amber-500/5 px-6 py-8 text-sm text-foreground">
            <p className="font-serif">This customer record is not linked to a site in your account.</p>
            <p className="mt-2 text-xs text-muted-foreground">You cannot post payments or edit the agreement until the record is associated with a site.</p>
            <Link
              href="/customers"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "mt-6 inline-flex h-9 min-h-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Customers
            </Link>
          </div>
        ) : (
          <CustomerDetailPageContent
            customer={customer}
            siteId={customer.siteId}
            siteName={customer.siteName ?? undefined}
          />
        )}
      </div>
    </DashboardShell>
  )
}
