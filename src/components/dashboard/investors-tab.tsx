"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSiteInvestors, useCreateInvestor, useUpdateInvestor, useTransactions, useAddTransaction, usePayInterest, useUpdateInvestorPayment } from "@/hooks/api/investor.hooks"
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal"
import { useSite } from "@/hooks/api/site.hooks"
import { createInvestorSchema, CreateInvestorInput, updateInvestorSchema, UpdateInvestorInput, transactionSchema, TransactionInput, Transaction } from "@/schemas/investor.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Loader2, Plus, X, Phone, ArrowDownLeft, ArrowUpRight } from "lucide-react"

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN") }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() }
function getCurrentDateTimeLocalInput() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const COLORS = ["bg-teal-600","bg-blue-600","bg-amber-500","bg-rose-600","bg-violet-600","bg-emerald-600"]
function ac(n: string) { return COLORS[(n.charCodeAt(0) + (n.charCodeAt(1) || 0)) % COLORS.length] }
function ini(n: string) { const p = n.trim().split(" "); return (p[0][0] + (p[1]?.[0] || "")).toUpperCase() }
function formatTransactionKind(kind: Transaction["kind"]) {
  switch (kind) {
    case "PRINCIPAL_IN":
      return "Principal In"
    case "PRINCIPAL_OUT":
      return "Capital Return"
    case "INTEREST":
      return "Profit Share"
    default:
      return kind
  }
}

type SiteInvestor = { id: string; name: string; phone: string | null; equityPercentage: number | null; totalInvested: number; totalReturned: number; isClosed: boolean; createdAt: string }

// ── Transaction Modal ──────────────────────────────
function TxModal({ investor, onClose, totalProfit }: { investor: SiteInvestor; onClose: () => void; totalProfit?: number }) {
  const { data, isLoading } = useTransactions(investor.id)
  const [mode, setMode] = useState<"invest" | "profit" | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const { mutate: addTx, isPending: adding } = useAddTransaction({ onSuccess: () => { setMode(null); setApiError(null) } })
  const { mutate: payProfit, isPending: payingProfit } = usePayInterest({ onSuccess: () => { setMode(null); setApiError(null) } })
  const [payTx, setPayTx] = useState<Transaction | null>(null)
  const { mutate: updatePayment, isPending: updatingPay } = useUpdateInvestorPayment(investor.id, { onSuccess: () => setPayTx(null) })
  const getTxDefaults = (): Partial<TransactionInput> => ({
    amount: 0,
    amountPaid: 0,
    paymentDate: getCurrentDateTimeLocalInput(),
    note: "",
  })
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: getTxDefaults(),
  })

  const txs: Transaction[] = data?.data?.transactions ?? []
  const total = data?.data?.totalInvested ?? investor.totalInvested
  const profitShareTxs = txs.filter((tx) => tx.kind === "INTEREST")
  const profitPaid = profitShareTxs.reduce((sum, tx) => sum + tx.amountPaid, 0)
  const recordedProfitShare = profitShareTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const pendingProfitShare = profitShareTxs.reduce((sum, tx) => sum + Math.max(tx.remaining, 0), 0)
  const hasOpenProfitShare = profitShareTxs.some((tx) => tx.paymentStatus !== "COMPLETED")
  const hasInvestedCapital = total > 0

  const equityPct = investor.equityPercentage ?? 0
  const siteProfit = Math.max(totalProfit ?? 0, 0)
  const estimatedProfitShare = equityPct > 0 ? Math.round((equityPct / 100) * siteProfit) : 0
  const availableProfitShareToRecord = Math.max(estimatedProfitShare - recordedProfitShare, 0)
  const canRecordProfitShare = !isLoading && hasInvestedCapital && availableProfitShareToRecord > 0 && !hasOpenProfitShare

  const handleSetMode = (m: "invest" | "profit") => {
    if (m === "profit" && !canRecordProfitShare) return
    reset(getTxDefaults())
    setMode(m)
    if (m === "profit" && availableProfitShareToRecord > 0) {
      setTimeout(() => setValue("amount", availableProfitShareToRecord), 0)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-background border border-border w-full max-w-[1100px] min-h-[72vh] max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-8 pt-8 pb-4 border-b border-border flex justify-between items-start gap-4">
          <div>
            <h3 className="text-xl font-serif text-foreground">Investor Ledger & Actions: {investor.name}</h3>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Add capital for new money coming in. Equity investors are paid through profit share against projected site profit, not capital return.
            </p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground/40 hover:text-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : txs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No transactions yet.</p>
          ) : (
            <div className="border border-border divide-y divide-border">
              <div className="grid grid-cols-6 gap-4 px-4 py-2 bg-muted/30">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Date</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Kind</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Amount</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Paid / Due</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Payment Status</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Note</span>
              </div>
              {txs.map(t => (
                <div key={t.id} className="grid grid-cols-6 gap-4 px-4 py-3 items-center">
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(t.createdAt)}</span>
                  <span className={cn(
                    "inline-flex w-fit px-2 py-1 text-[8px] font-bold tracking-widest uppercase border",
                    t.kind === "PRINCIPAL_IN"
                      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                      : t.kind === "INTEREST"
                        ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
                        : "text-red-500 bg-red-500/10 border-red-500/20"
                  )}>
                    {formatTransactionKind(t.kind)}
                  </span>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-sans font-bold", t.kind === "PRINCIPAL_IN" ? "text-emerald-600" : t.kind === "INTEREST" ? "text-amber-600" : "text-red-500")}>{formatINR(Math.abs(t.amount))}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-emerald-600">{formatINR(t.amountPaid)}</span>
                    <span className="text-[10px] text-red-500/80">Due {formatINR(t.remaining)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.paymentStatus === 'COMPLETED' ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20">PAID</span>
                    ) : t.paymentStatus === 'PARTIAL' ? (
                      <button onClick={() => setPayTx(t)} className="text-[8px] font-bold px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer">PARTIAL</button>
                    ) : (
                      <button onClick={() => setPayTx(t)} className="text-[8px] font-bold px-1.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer">PENDING</button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{t.note || "—"}</span>
                </div>
              ))}
            </div>
          )}
          {mode && (
            <form onSubmit={handleSubmit(d => {
              setApiError(null)
              const onError = (err: any) => setApiError(err?.error || err?.message || "Request failed")
              const payload = {
                ...d,
                amountPaid: isNaN(d.amountPaid as number) ? 0 : d.amountPaid,
                paymentDate: d.paymentDate ? new Date(d.paymentDate).toISOString() : undefined,
              }
              if (mode === "invest") addTx({ investorId: investor.id, data: payload }, { onError })
              else payProfit({ investorId: investor.id, data: payload }, { onError })
            })} className="mt-4 border border-border p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">{mode === "invest" ? "New Investment" : "Profit Share Payout"}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setMode(null); reset(getTxDefaults()) }} className="h-8 px-2 text-[9px] font-bold tracking-widest uppercase">
                  Back
                </Button>
              </div>

              {apiError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 text-[10px] font-bold text-red-500">
                  {apiError}
                </div>
              )}

                {mode === "profit" && (
                  <div className="bg-primary/5 border border-primary/10 p-3 text-[10px] text-muted-foreground flex flex-col gap-1.5">
                    <div>
                      <span className="font-bold text-foreground">{equityPct}%</span> of projected site profit (<span className="font-bold text-foreground">{formatINR(siteProfit)}</span>) = <span className="font-bold text-primary">{formatINR(estimatedProfitShare)}</span>
                      {availableProfitShareToRecord > 0 && (
                        <button type="button" onClick={() => setValue("amount", availableProfitShareToRecord)} className="ml-2 text-primary font-bold underline">Use available amount</button>
                      )}
                    </div>
                  <div>
                    Recorded <span className="font-bold text-foreground">{formatINR(recordedProfitShare)}</span> · Paid <span className="font-bold text-foreground">{formatINR(profitPaid)}</span> · Pending <span className="font-bold text-primary">{formatINR(pendingProfitShare)}</span>
                  </div>
                  {!hasInvestedCapital && (
                    <div>Profit share stays disabled until this investor's capital has actually been paid into the site.</div>
                  )}
                  {hasOpenProfitShare && (
                    <div>There is already an open profit-share row. Use the existing Partial/Pending row to record the remaining payment.</div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-1 block">
                    {mode === "invest" ? "Capital Amount" : "Profit Share Amount"}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder={mode === "invest" ? "Capital amount" : "Profit payout amount"}
                      className="h-10 pl-8 bg-muted border-none rounded-none text-sm"
                      {...register("amount", { valueAsNumber: true })}
                    />
                  </div>
                  {errors.amount && <p className="text-[10px] text-destructive mt-1">{errors.amount.message}</p>}
                </div>
                <div>
                  <Label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-1 block">Paid Now (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input type="number" min={0} placeholder="0" className="h-10 pl-8 bg-muted border-none rounded-none text-sm" {...register("amountPaid", { valueAsNumber: true })} />
                  </div>
                  {errors.amountPaid && <p className="text-[10px] text-destructive mt-1">{errors.amountPaid.message}</p>}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Leave Paid Now at 0 if you only want to create the ledger entry and settle it later from the row status button.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-1 block">Initial Payment Date</Label>
                  <Input type="datetime-local" className="h-10 bg-muted border-none rounded-none text-sm uppercase tracking-widest" {...register("paymentDate")} />
                </div>
                <div>
                  <Label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-1 block">Note / Ref</Label>
                  <Input placeholder="Note" className="h-10 bg-muted border-none rounded-none text-sm" {...register("note")} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={adding || payingProfit} size="sm" className={cn("flex-1 h-9 rounded-none font-bold text-[9px] tracking-widest uppercase", mode === "profit" ? "bg-amber-500 hover:bg-amber-600" : "")}>
                  {(adding || payingProfit) ? <Loader2 className="w-3 h-3 animate-spin" /> : mode === "invest" ? "Add Capital" : "Record Profit Share"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setMode(null); reset(getTxDefaults()) }} className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase px-4">Cancel</Button>
              </div>
            </form>
          )}
        </div>
        <div className="px-8 py-4 border-t border-border flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Total Invested</p>
              <p className="text-lg font-serif text-primary">{formatINR(total)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest uppercase text-amber-600/70">Profit Paid</p>
              <p className="text-lg font-serif text-amber-600">{formatINR(profitPaid)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">{hasOpenProfitShare ? "Pending Payout" : "Available To Record"}</p>
              <p className="text-lg font-serif text-foreground">{formatINR(hasOpenProfitShare ? pendingProfitShare : availableProfitShareToRecord)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
              {!mode && !investor.isClosed && (
                <p className="max-w-xs text-right text-[10px] leading-relaxed text-muted-foreground">
                  Use Add Capital for incoming equity. Profit Share turns on only after invested capital is actually paid in, and the amount is capped from projected site profit after expenses.
                </p>
              )}
            <div className="flex gap-2">
              {!mode && !investor.isClosed && (
                <>
                  <Button size="sm" onClick={() => handleSetMode("invest")} className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4"><ArrowDownLeft className="w-3 h-3" /> Add Capital</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canRecordProfitShare}
                    onClick={() => handleSetMode("profit")}
                    className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4 text-amber-600 border-amber-500/30 hover:bg-amber-500/5 disabled:text-muted-foreground/40 disabled:border-border disabled:hover:bg-transparent"
                  >
                    <ArrowUpRight className="w-3 h-3" /> Record Profit Share
                  </Button>
                </>
              )}
              {!mode && investor.isClosed && (
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 px-2">Account Closed</span>
              )}
              <Button size="sm" variant="outline" onClick={onClose} className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase px-4">Close</Button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {payTx && (
        <RecordPaymentModal
          title={`${investor.name} — ${formatTransactionKind(payTx.kind)}`}
          totalAmount={Math.abs(payTx.amount)}
          currentlyPaid={payTx.amountPaid}
          entityType="investor-transaction"
          entityId={payTx.id}
          investorId={investor.id}
          isPending={updatingPay}
          onClose={() => setPayTx(null)}
          onSubmit={({ amount, note }) => {
            updatePayment({ transactionId: payTx.id, data: { amount, note } })
          }}
        />
      )}
    </>
  )
}

// ── Add Investor Panel ─────────────────────────────
function AddPanel({ siteId, siteName, onClose }: { siteId: string; siteName: string; onClose: () => void }) {
  const { mutate: create, isPending } = useCreateInvestor({ onSuccess: onClose })
  const { register, handleSubmit, formState: { errors } } = useForm<CreateInvestorInput>({
    resolver: zodResolver(createInvestorSchema),
    defaultValues: { name: '', phone: '', type: "EQUITY" as const, siteId, equityPercentage: 0 },
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-serif tracking-tight text-foreground">Add Equity Investor</h2>
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40 mt-1">For {siteName}</p>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground/40 hover:text-foreground" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit((data) => create({ ...data, type: "EQUITY", siteId }))} className="px-8 py-6 flex flex-col gap-5 flex-1">
          <input type="hidden" {...register("type")} />
          <input type="hidden" {...register("siteId")} />
          <div className="border border-primary/20 bg-primary/5 p-4 text-[11px] leading-relaxed text-muted-foreground">
            This creates the investor profile for <strong className="text-foreground">{siteName}</strong>. Use Ledger & Actions later whenever you want to add more capital or record profit share.
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Investor Full Name</Label>
            <Input placeholder="e.g. Satej Patil" className="h-11 bg-muted border-none rounded-none text-sm" {...register("name")} />
            {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Contact Number</Label>
            <Input placeholder="+91 XXXXX XXXXX" className="h-11 bg-muted border-none rounded-none text-sm" {...register("phone")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Equity Percentage (%)</Label>
            <div className="relative">
              <Input type="number" step="0.01" min={0} max={100} className="h-11 bg-muted border-none rounded-none text-sm pr-8" {...register("equityPercentage", { valueAsNumber: true })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/10 p-4 text-[10px] text-muted-foreground">
            This investor will be automatically linked to <strong className="text-foreground">{siteName}</strong> and their investment will be added to the site&apos;s allocated fund.
          </div>
          <Button type="submit" disabled={isPending} className="h-14 rounded-none font-bold text-[11px] tracking-[0.2em] uppercase gap-2 mt-auto">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Investor"}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Main Export ─────────────────────────────────────
export function InvestorsTab({ siteId, siteName }: { siteId: string; siteName: string }) {
  const { data, isLoading } = useSiteInvestors(siteId)
  const { data: siteData } = useSite(siteId)
  const [addOpen, setAddOpen] = useState(false)
  const [txInvestor, setTxInvestor] = useState<SiteInvestor | null>(null)
  const totalProfit = siteData?.data?.site?.totalProfit

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  const investors: SiteInvestor[] = data?.data?.investors ?? []
  const totalInvested = data?.data?.totalInvested ?? 0

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-1">Total Capital Committed</p>
            <p className="text-3xl font-serif text-foreground tracking-tight">{formatINR(totalInvested)}</p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Create the investor once, then use Ledger & Actions to add more capital or record profit share without opening another investor record.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-6">
            <Plus className="w-4 h-4" /> Add Investor
          </Button>
        </div>

        {/* Investor List */}
        {investors.length === 0 ? (
          <div className="border border-dashed border-border flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground italic">No equity investors for this site yet.</p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/30">
              <div className="col-span-4 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Investor Detail</div>
              <div className="col-span-2 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Equity Share</div>
              <div className="col-span-3 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Total Invested</div>
              <div className="col-span-3 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Actions</div>
            </div>
            {investors.map((inv) => (
              <div key={inv.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center">
                <div className="col-span-4 flex items-center gap-3">
                  <div className={cn("w-10 h-10 flex items-center justify-center text-white text-[11px] font-bold tracking-widest shrink-0", ac(inv.name))}>
                    {ini(inv.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-sm tracking-tight text-foreground truncate">{inv.name}</p>
                    {inv.phone && <span className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5"><Phone className="w-2.5 h-2.5" /> {inv.phone}</span>}
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold tracking-widest">
                    {inv.equityPercentage ?? 0}%
                  </span>
                  {inv.isClosed && (
                    <span className="inline-block px-2 py-0.5 bg-muted text-[8px] font-bold tracking-widest uppercase text-muted-foreground">Closed</span>
                  )}
                </div>
                <div className="col-span-3">
                  <p className="font-serif text-sm tracking-tight text-foreground">{formatINR(inv.totalInvested)}</p>
                  <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">Invested</p>
                  {inv.totalReturned > 0 && (
                    <p className="text-[9px] text-amber-600 uppercase tracking-widest mt-0.5">Profit Paid: {formatINR(inv.totalReturned)}</p>
                  )}
                </div>
                <div className="col-span-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setTxInvestor(inv)}
                    className="h-8 text-[9px] font-bold tracking-widest uppercase gap-1 text-primary border-primary/30 hover:text-primary hover:bg-primary/5"
                  >Ledger & Actions</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && <AddPanel siteId={siteId} siteName={siteName} onClose={() => setAddOpen(false)} />}
      {txInvestor && <TxModal investor={txInvestor} onClose={() => setTxInvestor(null)} totalProfit={totalProfit} />}
    </>
  )
}
