"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createExpenseSchema, CreateExpenseInput, Expense } from "@/schemas/site.schema"
import { useExpenses, useAddExpense, useUpdateExpensePayment } from "@/hooks/api/site.hooks"
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal"
import { useVendors } from "@/hooks/api/vendor.hooks"
import { Vendor } from "@/schemas/vendor.schema"
import { VendorProfile } from "@/components/dashboard/vendor-profile"
import { SearchableSelect } from "@/components/dashboard/navigator/form-primitives"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Loader2, Plus, X, FileText, Users2 } from "lucide-react"

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN")
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase()
}

function getCurrentDateTimeLocalInput() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

// ── Add Expense Panel ─────────────────────────────────
function AddExpensePanel({
  siteId,
  remainingFund,
  onClose,
}: {
  siteId: string
  remainingFund: number
  onClose: () => void
}) {
  const { mutate: addExpense, isPending, error } = useAddExpense(siteId, { onSuccess: onClose })
  const { data: vendorData } = useVendors()
  const vendors: Vendor[] = vendorData?.data?.vendors ?? []

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { type: "GENERAL", amount: 0, amountPaid: 0, paymentDate: getCurrentDateTimeLocalInput(), reason: '', vendorId: '', description: '' },
  })

  const expenseType = watch("type")
  const selectedVendorId = watch("vendorId") || ""

  const onSubmit = (data: CreateExpenseInput) => {
    const payload: CreateExpenseInput = {
      ...data,
      vendorId: data.type === "VENDOR" ? data.vendorId : undefined,
      reason: data.reason || undefined,
      description: data.description || undefined,
      amountPaid: isNaN(data.amountPaid as number) ? 0 : data.amountPaid,
      paymentDate: data.paymentDate ? new Date(data.paymentDate).toISOString() : undefined,
    }
    addExpense(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-2">
            Bill Entry
          </p>
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-serif tracking-tight text-foreground">Add Expense</h2>
            <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="px-8 py-6 flex flex-col gap-6 flex-1">

            {error && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
                Failed to add expense
              </div>
            )}

            {/* Expense Type Toggle */}
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                Expense Type
              </Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => field.onChange("GENERAL")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 border-2 transition-all",
                        field.value === "GENERAL"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <FileText className={cn("w-5 h-5", field.value === "GENERAL" ? "text-primary" : "text-muted-foreground/40")} />
                      <span className="text-[9px] font-bold tracking-widest uppercase">General</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("VENDOR")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 border-2 transition-all",
                        field.value === "VENDOR"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <Users2 className={cn("w-5 h-5", field.value === "VENDOR" ? "text-primary" : "text-muted-foreground/40")} />
                      <span className="text-[9px] font-bold tracking-widest uppercase">Vendor</span>
                    </button>
                  </div>
                )}
              />
            </div>

            {/* Vendor Selector (only for VENDOR type) */}
            {expenseType === "VENDOR" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  Select Vendor
                </Label>
                <input type="hidden" {...register("vendorId")} />
                <SearchableSelect
                  options={vendors.map((vendor) => ({
                    value: vendor.id,
                    label: vendor.name,
                    description: [vendor.type, vendor.phone, vendor.email].filter(Boolean).join(" / "),
                    keywords: [vendor.type, vendor.phone, vendor.email].filter(Boolean) as string[],
                  }))}
                  value={selectedVendorId}
                  onValueChange={(value) => setValue("vendorId", value, { shouldValidate: true })}
                  placeholder="Choose a vendor..."
                  searchPlaceholder="Search vendor by name, type, phone, or email..."
                  emptyText="No vendors match your search."
                />
                {errors.vendorId && <p className="text-[10px] text-destructive">{errors.vendorId.message}</p>}
              </div>
            )}

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                Reason
              </Label>
              <Input
                placeholder="e.g. Cement purchase, Site security deposit"
                className="h-11 bg-muted border-none rounded-none text-sm"
                {...register("reason")}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                Description
              </Label>
              <Textarea
                placeholder="Enter transaction details..."
                className="bg-muted border-none rounded-none text-sm min-h-20 resize-none"
                {...register("description")}
              />
            </div>

            {/* Bill and initial payment row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  Bill Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 pl-8 bg-muted border-none rounded-none text-sm"
                    {...register("amount", { valueAsNumber: true })}
                  />
                </div>
                {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  Initial Payment (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 pl-8 bg-muted border-none rounded-none text-sm"
                    {...register("amountPaid", { valueAsNumber: true })}
                  />
                </div>
                {errors.amountPaid && <p className="text-[10px] text-destructive">{errors.amountPaid.message}</p>}
              </div>
            </div>

            {/* Initial payment date */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                Initial Payment Date
              </Label>
              <Input
                type="datetime-local"
                className="h-11 bg-muted border-none rounded-none text-sm uppercase tracking-widest"
                {...register("paymentDate")}
              />
              {errors.paymentDate && <p className="text-[10px] text-destructive">{errors.paymentDate.message}</p>}
              <p className="text-[10px] text-muted-foreground/50">
                Leave blank if you are recording the bill now and paying later.
              </p>
            </div>

            {/* Remaining Fund */}
            <div className="flex justify-between items-center border border-border px-4 py-3">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                Site Remaining Fund
              </span>
              <span className="text-sm font-serif text-primary">{formatINR(remainingFund)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-border">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Bill"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────
export function ExpensesTab({ siteId, remainingFund }: { siteId: string; remainingFund: number }) {
  const { data, isLoading } = useExpenses(siteId)
  const [addOpen, setAddOpen] = useState(false)
  const [profileVendorId, setProfileVendorId] = useState<string | null>(null)
  const [payExpense, setPayExpense] = useState<Expense | null>(null)
  const { mutate: updatePayment, isPending: updatingPayment } = useUpdateExpensePayment(siteId, { onSuccess: () => setPayExpense(null) })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const expenses: Expense[] = data?.data?.expenses ?? []

  const totalBilled = expenses.reduce((s, e) => s + e.amount, 0)
  const totalPaid = expenses.reduce((s, e) => s + e.amountPaid, 0)
  const totalOutstanding = expenses.reduce((s, e) => s + e.remaining, 0)

  return (
    <>
      <div className="space-y-6">

        {/* Stats Row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-1">
              Bills Recorded
            </p>
            <p className="text-3xl font-serif text-foreground tracking-tight">{formatINR(totalBilled)}</p>
          </div>
          <div className="flex gap-6">
            <div className="border border-border px-5 py-3">
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-0.5">
                Paid
              </p>
              <p className="text-lg font-serif text-emerald-600 tracking-tight">{formatINR(totalPaid)}</p>
            </div>
            <div className="border border-border px-5 py-3">
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-0.5">
                Outstanding
              </p>
              <p className="text-lg font-serif text-red-500 tracking-tight">{formatINR(totalOutstanding)}</p>
            </div>
          </div>
        </div>

        {/* Record Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setAddOpen(true)}
            className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-6"
          >
            <Plus className="w-4 h-4" /> Record Expense
          </Button>
        </div>

        {/* Expense Table */}
        {expenses.length === 0 ? (
          <div className="border border-dashed border-border flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground italic">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/30">
              <div className="col-span-2 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Type</div>
              <div className="col-span-3 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Bill</div>
              <div className="col-span-2 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Vendor</div>
              <div className="col-span-2 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Recorded</div>
              <div className="col-span-1 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Paid</div>
              <div className="col-span-1 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Due</div>
              <div className="col-span-1 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Status</div>
            </div>

            {/* Rows */}
            {expenses.map((exp) => (
              <div key={exp.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center">

                {/* Type Badge */}
                <div className="col-span-2">
                  <span className={cn(
                    "inline-block px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase border",
                    exp.type === "GENERAL"
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  )}>
                    {exp.type.toLowerCase()}
                  </span>
                </div>

                {/* Bill */}
                <div className="col-span-3">
                  <p className="text-sm font-serif text-foreground tracking-tight truncate">
                    {exp.reason || exp.description || "—"}
                  </p>
                  {exp.reason && exp.description && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{exp.description}</p>
                  )}
                  <p className="text-[10px] font-bold tracking-widest uppercase text-red-500 mt-1">{formatINR(exp.amount)}</p>
                </div>

                {/* Vendor */}
                <div className="col-span-2">
                  {exp.vendorName ? (
                    <div>
                      <button onClick={() => exp.vendorId && setProfileVendorId(exp.vendorId)} className="text-sm text-primary hover:underline text-left">{exp.vendorName}</button>
                      <p className="text-[9px] font-bold tracking-widest text-muted-foreground/40">
                        {exp.vendorType}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                    {formatDate(exp.createdAt)}
                  </span>
                  {exp.paymentDate && (
                    <p className="text-[9px] text-muted-foreground/50 mt-1">
                      Last paid {formatDate(exp.paymentDate)}
                    </p>
                  )}
                </div>

                <div className="col-span-1 text-right">
                  <span className="text-sm font-serif text-emerald-600 tracking-tight">{formatINR(exp.amountPaid)}</span>
                </div>

                <div className="col-span-1 text-right">
                  <span className="text-sm font-serif text-red-500 tracking-tight">{formatINR(exp.remaining)}</span>
                </div>

                <div className="col-span-1 flex flex-col items-end gap-1 text-right">
                  {exp.paymentStatus === 'COMPLETED' ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20">PAID</span>
                  ) : exp.paymentStatus === 'PARTIAL' ? (
                    <button onClick={() => setPayExpense(exp)} className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer">PARTIAL</button>
                  ) : (
                    <button onClick={() => setPayExpense(exp)} className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer">PENDING</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <AddExpensePanel
          siteId={siteId}
          remainingFund={remainingFund}
          onClose={() => setAddOpen(false)}
        />
      )}

      {profileVendorId && (
        <VendorProfile vendorId={profileVendorId} onClose={() => setProfileVendorId(null)} />
      )}

      {payExpense && (
        <RecordPaymentModal
          title={payExpense.reason || payExpense.description || payExpense.vendorName || 'Expense Payment'}
          totalAmount={payExpense.amount}
          currentlyPaid={payExpense.amountPaid}
          entityType="expense"
          entityId={payExpense.id}
          siteId={siteId}
          isPending={updatingPayment}
          onClose={() => setPayExpense(null)}
          onSubmit={({ amount, note }) => {
            updatePayment({ expenseId: payExpense.id, data: { amount, note } })
          }}
        />
      )}
    </>
  )
}
