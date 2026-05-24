"use client"

import { useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createExpenseSchema, CreateExpenseInput, Expense } from "@/schemas/site.schema"
import { useExpenses, useAddExpense, useUpdateExpensePayment } from "@/hooks/api/site.hooks"
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal"
import { useCreateVendorDocument, useVendors } from "@/hooks/api/vendor.hooks"
import { Vendor } from "@/schemas/vendor.schema"
import { SearchableSelect } from "@/components/dashboard/navigator/form-primitives"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { exportElementToPdf } from "@/lib/pdf-export"
import { buildVendorWorkspacePath } from "@/lib/vendor-workspace"
import { vendorService } from "@/services/vendor.service"
import { toast } from "sonner"
import { Loader2, Plus, X, FileText, Users2, FileSpreadsheet, Eye, Search, Upload } from "lucide-react"

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

// â”€â”€ Add Expense Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AddExpensePanel({
  siteId,
  remainingFund,
  onClose,
}: {
  siteId: string
  remainingFund: number
  onClose: () => void
}) {
  const { mutateAsync: addExpense, isPending, error } = useAddExpense(siteId)
  const { mutateAsync: createVendorDocument } = useCreateVendorDocument()
  const { data: vendorData } = useVendors()
  const vendors: Vendor[] = vendorData?.data?.vendors ?? []
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false)

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { type: "GENERAL", amount: 0, amountPaid: 0, paymentDate: getCurrentDateTimeLocalInput(), reason: '', vendorId: '', description: '' },
  })

  const expenseType = watch("type")
  const selectedVendorId = watch("vendorId") || ""

  const onSubmit = async (data: CreateExpenseInput) => {
    const payload: CreateExpenseInput = {
      ...data,
      vendorId: data.type === "VENDOR" ? data.vendorId : undefined,
      reason: data.reason || undefined,
      description: data.description || undefined,
      amountPaid: isNaN(data.amountPaid as number) ? 0 : data.amountPaid,
      paymentDate: data.paymentDate || undefined,
    }

    try {
      const response = await addExpense(payload)
      const expenseId = response?.data?.expense?.id as string | undefined

      if (payload.type === "VENDOR" && payload.vendorId && invoiceFile && expenseId) {
        setIsUploadingInvoice(true)
        try {
          const fileUrl = await vendorService.uploadVendorDocumentToS3(invoiceFile)
          await createVendorDocument({
            vendorId: payload.vendorId,
            data: {
              documentType: "Invoice",
              documentName: invoiceFile.name,
              fileUrl,
              siteId,
              expenseId,
              note: payload.description || payload.reason || undefined,
            },
          })
        } finally {
          setIsUploadingInvoice(false)
        }
      }

      onClose()
    } catch (submitError) {
      console.error("Failed to add expense", submitError)
    }
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

            {expenseType === "VENDOR" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  Bill Attachment
                </Label>
                <label className="flex h-11 cursor-pointer items-center gap-2 border border-dashed border-border bg-muted px-3 text-sm text-foreground">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{invoiceFile ? invoiceFile.name : ""}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            )}

            {/* Bill and initial payment row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  Bill Amount
                </Label>
                <Input
                  type="number"
                  min={0}
                  className="h-11 bg-muted border-none rounded-none text-sm"
                  {...register("amount", { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  Initial Payment
                </Label>
                <Input
                  type="number"
                  min={0}
                  className="h-11 bg-muted border-none rounded-none text-sm"
                  {...register("amountPaid", { valueAsNumber: true })}
                />
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
              disabled={isPending || isUploadingInvoice}
              className="w-full h-14 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              {isPending || isUploadingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Bill"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// â”€â”€ Main Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ExpensesTab({ siteId, remainingFund }: { siteId: string; remainingFund: number }) {
  const router = useRouter()
  const { data, isLoading } = useExpenses(siteId)
  const [addOpen, setAddOpen] = useState(false)
  const [payExpense, setPayExpense] = useState<Expense | null>(null)
  const [isPdfing, setIsPdfing] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "PARTIAL" | "COMPLETED">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "GENERAL" | "VENDOR">("all")
  const exportRef = useRef<HTMLDivElement>(null)
  const { mutate: updatePayment, isPending: updatingPayment } = useUpdateExpensePayment(siteId, { onSuccess: () => setPayExpense(null) })

  const expenses: Expense[] = data?.data?.expenses ?? []

  const totalBilled = expenses.reduce((s, e) => s + e.amount, 0)
  const totalPaid = expenses.reduce((s, e) => s + e.amountPaid, 0)
  const totalOutstanding = expenses.reduce((s, e) => s + e.remaining, 0)
  const filteredExpenses = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return expenses.filter((exp) => {
      if (statusFilter !== "all" && exp.paymentStatus !== statusFilter) return false
      if (typeFilter !== "all" && exp.type !== typeFilter) return false
      if (!q) return true
      const haystack = [
        exp.type,
        exp.reason,
        exp.description,
        exp.vendorName,
        exp.vendorType,
        exp.paymentStatus,
      ].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(q)
    })
  }, [expenses, searchText, statusFilter, typeFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleExcelDownload = () => {
    if (!expenses.length) return toast.error("No expenses to export.")
    const header = ["Type", "Bill", "Vendor", "Recorded", "Paid", "Due", "Status"]
    const body = expenses.map((exp) => [
      exp.type,
      exp.billNumber ? `Bill ${exp.billNumber}` : exp.reason || exp.description || "Bill",
      exp.vendorName || "-",
      formatDate(exp.createdAt),
      exp.amountPaid,
      exp.remaining,
      exp.paymentStatus,
    ])
    const html = `<table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "site-expenses.xls"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Excel export downloaded.")
  }

  const handlePdfDownload = async () => {
    if (!exportRef.current) return toast.error("Nothing to export.")
    setIsPdfing(true)
    try {
      await exportElementToPdf(exportRef.current, "site-expenses.pdf")
      toast.success("PDF export downloaded.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF.")
    } finally {
      setIsPdfing(false)
    }
  }

  return (
    <>
      <div className="space-y-4" ref={exportRef}>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="border border-border bg-muted/10 px-4 py-3">
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-muted-foreground/55">Bills Recorded</p>
            <p className="mt-1 text-xl font-sans font-bold tracking-tight text-foreground">{formatINR(totalBilled)}</p>
          </div>
          <div className="border border-emerald-200 bg-emerald-50/40 px-4 py-3">
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-emerald-700/80">Paid</p>
            <p className="mt-1 text-xl font-sans font-bold tracking-tight text-emerald-700">{formatINR(totalPaid)}</p>
          </div>
          <div className="border border-rose-200 bg-rose-50/40 px-4 py-3">
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-rose-700/80">Outstanding</p>
            <p className="mt-1 text-xl font-sans font-bold tracking-tight text-rose-700">{formatINR(totalOutstanding)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full min-w-[220px] lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search expenses..."
                className="h-10 rounded-none border-border bg-background pl-10 text-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-wider text-foreground"
            >
              <option value="all">All Types</option>
              <option value="GENERAL">General</option>
              <option value="VENDOR">Vendor</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-wider text-foreground"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="COMPLETED">Paid</option>
            </select>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleExcelDownload}
            className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-4 rounded-none"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => void handlePdfDownload()}
            disabled={isPdfing}
            className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-4 rounded-none"
          >
            {isPdfing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-6"
          >
            <Plus className="w-4 h-4" /> Record Expense
          </Button>
          </div>
        </div>

        {/* Expense Table */}
        {filteredExpenses.length === 0 ? (
          <div className="border border-dashed border-border flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground italic">
              {expenses.length === 0 ? "No expenses recorded yet." : "No expenses match current filters."}
            </p>
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
            {filteredExpenses.map((exp) => (
              <div key={exp.id} className="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-muted/20 transition-colors items-center">

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
                    {exp.billNumber ? `Bill ${exp.billNumber}` : exp.reason || exp.description || "Bill"}
                  </p>
                  {exp.billNumber ? (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {exp.reason || exp.description || "Expense entry"}
                    </p>
                  ) : exp.reason && exp.description ? (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{exp.description}</p>
                  ) : null}
                  <p className="text-[10px] font-bold tracking-widest uppercase text-red-500 mt-1">{formatINR(exp.amount)}</p>
                </div>

                {/* Vendor */}
                <div className="col-span-2">
                  {exp.vendorName ? (
                    <div>
                      <button onClick={() => exp.vendorId && router.push(buildVendorWorkspacePath(exp.vendorId))} className="text-sm text-primary hover:underline text-left">{exp.vendorName}</button>
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
                    <span className="text-[9px] font-bold px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/20">PAID</span>
                  ) : exp.paymentStatus === 'PARTIAL' ? (
                    <button
                      onClick={() => setPayExpense(exp)}
                      title="View and record payment"
                      className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> PARTIAL
                    </button>
                  ) : (
                    <button
                      onClick={() => setPayExpense(exp)}
                      title="View and record payment"
                      className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> PENDING
                    </button>
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
          onSubmit={({ amount, note, paymentMode, referenceNumber, paymentDate }) => {
            updatePayment({ expenseId: payExpense.id, data: { amount, note, paymentMode, referenceNumber, paymentDate } })
          }}
        />
      )}
    </>
  )
}
