"use client"

import { type ReactNode, useMemo } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { CustomerDetailPageContent } from "@/components/dashboard/customer-detail-page-content"
import { useAllCustomers } from "@/hooks/api/customer.hooks"
import { CustomerWithSite } from "@/schemas/customer.schema"
import { getCustomerGroupKey, groupCustomerDeals } from "@/lib/customer-grouping"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, Loader2 } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"

function DetailSkeleton() {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-3">
      <Skeleton className="h-16 w-full" />
      <div className="grid min-h-0 grid-cols-3 gap-3">
        <div className="col-span-2 flex min-h-0 flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="col-span-1">
          <Skeleton className="h-full min-h-[220px] w-full" />
        </div>
      </div>
      <Skeleton className="h-44 w-full" />
    </div>
  )
}

function EmptyState({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="border border-dashed border-border px-6 py-12 text-center">
      {children}
    </div>
  )
}

export default function CustomerDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const customerId = typeof params?.customerId === "string" ? params.customerId : Array.isArray(params?.customerId) ? params?.customerId[0] : ""
  const action = searchParams.get("action")

  const { data, isLoading, isError, error, refetch, isRefetching } = useAllCustomers()

  const { customer, customerDeals } = useMemo(() => {
    const raw = (data as { data?: { customers?: CustomerWithSite[] } })?.data?.customers ?? []
    const direct = raw.find((c) => c.id === customerId) ?? null
    if (direct) {
      const groupKey = getCustomerGroupKey(direct)
      const groupedDeals = raw
        .filter((deal) => getCustomerGroupKey(deal) === groupKey)
        .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())

      return { customer: direct, customerDeals: groupedDeals }
    }

    const decoded = decodeURIComponent(customerId)
    const matchedGroup = groupCustomerDeals(raw).find((group) => group.groupKey === decoded) ?? null
    if (!matchedGroup || matchedGroup.deals.length === 0) {
      return { customer: null, customerDeals: [] as CustomerWithSite[] }
    }

    return { customer: matchedGroup.deals[0], customerDeals: matchedGroup.deals }
  }, [data, customerId])

  return (
    <div className="mx-auto h-[calc(100dvh-8rem)] w-full max-w-[1680px] min-w-0 overflow-hidden animate-in fade-in duration-500">
      {isLoading ? (
        <DetailSkeleton />
      ) : isError ? (
        <EmptyState>
          <p className="text-sm font-medium text-destructive">
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
        </EmptyState>
      ) : !customerId ? (
        <EmptyState>
          <p className="text-sm text-muted-foreground">Missing customer in the URL.</p>
          <Link
            href="/customers"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "mt-4 inline-flex h-9 min-h-0 items-center text-[10px] font-bold uppercase tracking-widest",
            )}
          >
            Back to Customers
          </Link>
        </EmptyState>
      ) : !customer ? (
        <EmptyState>
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
        </EmptyState>
      ) : customerDeals.length === 0 ? (
        <EmptyState>
          <p className="text-sm text-muted-foreground">No deals found for this customer.</p>
          <Link
            href="/customers"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "mt-4 inline-flex h-9 min-h-0 items-center text-[10px] font-bold uppercase tracking-widest",
            )}
          >
            Back to Customers
          </Link>
        </EmptyState>
      ) : (
        <CustomerDetailPageContent
          customer={customer}
          customerDeals={customerDeals}
          initialAction={action}
        />
      )}
    </div>
  )
}
