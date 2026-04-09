"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRecordCustomerPayment } from "@/hooks/api/customer.hooks"
import { Customer } from "@/schemas/customer.schema"
import { Download, X, Plus, Trash2, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"
import { RecordPaymentModal } from "./record-payment-modal"

// Simple Indian number to words converter
const convertToIndianWords = (num: number): string => {
  if (num === 0) return 'Zero Rupees Only'
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanOneThousand(n % 100) : '')
  }
  
  const convert = (n: number): string => {
    if (n === 0) return ''
    if (n < 1000) return convertLessThanOneThousand(n)
    if (n < 100000) return convertLessThanOneThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertLessThanOneThousand(n % 1000) : '')
    if (n < 10000000) return convertLessThanOneThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convertLessThanOneThousand(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  
  const wholePart = Math.floor(num)
  const decimalPart = Math.round((num - wholePart) * 100)
  
  let result = convert(wholePart) + ' Rupees'
  if (decimalPart > 0) {
    result += ' and ' + convertLessThanOneThousand(decimalPart) + ' Paise'
  }
  result += ' Only'
  
  return result
}

const buildReceiptNumber = (customerId: string, createdAt: string) => {
  const dateToken = createdAt.slice(2, 10).replace(/-/g, '')
  const customerToken = customerId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
  return `RCP-${dateToken}-${customerToken}`
}

const createEditorRowId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface ReceiptData {
  receiptNumber: string
  receiptDate: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerPan: string
  projectName: string
  siteAddress: string
  flatNumber: string
  floorNumber: string
  area: string
  rate: string
  totalAmount: number
  amountInWords: string
  registrationDate: string
  payments: Array<{
    id: string
    date: string
    amount: number
    mode: string
    note: string
  }>
  taxes: Array<{
    id: string
    name: string
    type: 'percentage' | 'amount'
    value: number
    calculatedAmount: number
  }>
}

interface ReceiptEditorProps {
  customer: Customer & {
    siteName?: string | null
    address?: string | null
    panNumber?: string | null
    carpetArea?: string | null
    ratePerSqft?: string | null
  }
  siteAddress?: string
  payments: Array<{
    id: string
    amount: number
    note: string | null
    createdAt: string
  }>
  onClose: () => void
}

export function ReceiptEditor({ customer, siteAddress, payments, onClose }: ReceiptEditorProps) {
  const stableReceiptNumber = buildReceiptNumber(customer.id, customer.createdAt)
  const [isLedgerPaymentModalOpen, setIsLedgerPaymentModalOpen] = useState(false)
  const {
    mutate: recordPayment,
    isPending: isRecordingPayment,
    error: paymentError,
    reset: resetPaymentState,
  } = useRecordCustomerPayment()
  const { register, handleSubmit, watch, setValue } = useForm<ReceiptData>({
    defaultValues: {
      receiptNumber: stableReceiptNumber,
      receiptDate: new Date().toISOString().slice(0, 10),
      customerName: customer.name,
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      customerPan: customer.panNumber || '',
      projectName: customer.siteName || '',
      siteAddress: siteAddress || '',
      flatNumber: customer.customFlatId || String(customer.flatNumber),
      floorNumber: customer.floorName || `Floor ${customer.floorNumber}`,
      area: customer.carpetArea || '',
      rate: customer.ratePerSqft || '',
      totalAmount: customer.sellingPrice,
      amountInWords: convertToIndianWords(customer.sellingPrice),
      registrationDate: customer.createdAt.split('T')[0],
      payments: payments.map(p => ({
        id: p.id,
        date: p.createdAt.split('T')[0],
        amount: p.amount,
        mode: 'CASH', // Default mode
        note: p.note || ''
      })),
      taxes: [] // Start with no taxes
    }
  })

  const watchedPayments = watch('payments')
  const watchedTotalAmount = watch('totalAmount')
  const watchedTaxes = watch('taxes')
  const watchedCustomerName = watch('customerName')
  const watchedProjectName = watch('projectName')
  const watchedFlatNumber = watch('flatNumber')
  const watchedSiteAddress = watch('siteAddress')

  // Calculate total tax amount
  const totalTaxAmount = watchedTaxes.reduce((sum, tax) => sum + tax.calculatedAmount, 0)
  const totalWithTax = watchedTotalAmount + totalTaxAmount
  const totalPaid = watchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const rawBalance = totalWithTax - totalPaid
  const balance = Math.max(rawBalance, 0)
  const overCollected = Math.max(totalPaid - totalWithTax, 0)
  const ledgerRemaining = Math.max(customer.sellingPrice - totalPaid, 0)

  // Auto-update amount in words when total amount changes
  useEffect(() => {
    setValue('amountInWords', convertToIndianWords(Math.max(totalWithTax, 0)))
  }, [totalWithTax, setValue, watchedTotalAmount, watchedTaxes])

  useEffect(() => {
    const syncedPayments = payments.map((payment) => ({
      id: payment.id,
      date: payment.createdAt.split('T')[0],
      amount: payment.amount,
      mode: 'CASH',
      note: payment.note || '',
    }))

    const needsSync =
      syncedPayments.length !== watchedPayments.length ||
      syncedPayments.some((payment, index) => {
        const current = watchedPayments[index]
        return (
          !current ||
          current.id !== payment.id ||
          current.date !== payment.date ||
          current.amount !== payment.amount ||
          current.note !== payment.note
        )
      })

    if (needsSync) {
      setValue('payments', syncedPayments)
    }
  }, [payments, watchedPayments, setValue])

  useEffect(() => {
    if (siteAddress && !watchedSiteAddress) {
      setValue('siteAddress', siteAddress)
    }
  }, [siteAddress, watchedSiteAddress, setValue])

  const updatePaymentMode = (id: string, value: string) => {
    setValue('payments', watchedPayments.map((payment) =>
      payment.id === id ? { ...payment, mode: value } : payment,
    ))
  }

  const addTaxRow = () => {
    const newTax = {
      id: createEditorRowId('tax'),
      name: '',
      type: 'percentage' as const,
      value: 0,
      calculatedAmount: 0
    }
    setValue('taxes', [...watchedTaxes, newTax])
  }

  const removeTaxRow = (id: string) => {
    setValue('taxes', watchedTaxes.filter(t => t.id !== id))
  }

  const updateTax = (id: string, field: string, value: any) => {
    const updatedTaxes = watchedTaxes.map(tax => {
      if (tax.id !== id) return tax
      
      const updatedTax = { ...tax, [field]: value }
      
      // Recalculate tax amount
      if (field === 'value' || field === 'type') {
        if (updatedTax.type === 'percentage') {
          updatedTax.calculatedAmount = (watchedTotalAmount * updatedTax.value) / 100
        } else {
          updatedTax.calculatedAmount = updatedTax.value
        }
      }
      
      return updatedTax
    })
    
    setValue('taxes', updatedTaxes)
  }

  const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

  const appendLedgerPaymentRow = (payment: { id: string; amount: number; createdAt: string; note?: string | null }) => {
    setValue('payments', [
      ...watchedPayments,
      {
        id: payment.id,
        date: payment.createdAt.split('T')[0],
        amount: payment.amount,
        mode: 'CASH',
        note: payment.note || '',
      },
    ])
  }

  const generateReceiptHTML = (data: ReceiptData) => {
    const receiptTotalTaxAmount = data.taxes.reduce((sum, tax) => sum + tax.calculatedAmount, 0)
    const receiptTotalWithTax = data.totalAmount + receiptTotalTaxAmount
    const receiptTotalPaid = data.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
    const receiptBalance = Math.max(receiptTotalWithTax - receiptTotalPaid, 0)
    const receiptOverCollected = Math.max(receiptTotalPaid - receiptTotalWithTax, 0)
    const paymentsHTML = data.payments.map((payment, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${payment.date}</td>
        <td style="text-align: right;">${formatINR(payment.amount)}</td>
        <td>${payment.mode}</td>
        <td>${payment.note || '-'}</td>
      </tr>
    `).join('')

    const taxesHTML = data.taxes.length > 0 ? data.taxes.map((tax, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${tax.name}</td>
        <td>${tax.type === 'percentage' ? `${tax.value}%` : formatINR(tax.value)}</td>
        <td style="text-align: right;">${formatINR(tax.calculatedAmount)}</td>
      </tr>
    `).join('') : '<tr><td colspan="4">No taxes applicable</td></tr>'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${data.customerName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1a1a1a; margin: 0; }
          .receipt-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; margin-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item { margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .text-right { text-align: right; }
          .signature { margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYMENT RECEIPT</h1>
          <p>Receipt No: ${data.receiptNumber}</p>
        </div>

        <div class="receipt-info">
          <div>
            <strong>Receipt Date:</strong><br>
            ${data.receiptDate}
          </div>
          <div>
            <strong>Registration Date:</strong><br>
            ${data.registrationDate}
          </div>
          <div>
            <strong>Project:</strong><br>
            ${data.projectName}
          </div>
        </div>

        <div class="section">
          <h3>Customer Details</h3>
          <div class="info-grid">
            <div class="info-item"><strong>Name:</strong> ${data.customerName}</div>
            <div class="info-item"><strong>Phone:</strong> ${data.customerPhone}</div>
            <div class="info-item"><strong>Address:</strong> ${data.customerAddress}</div>
            <div class="info-item"><strong>PAN:</strong> ${data.customerPan}</div>
          </div>
        </div>

        <div class="section">
          <h3>Property Details</h3>
          <div class="info-grid">
            <div class="info-item"><strong>Flat Number:</strong> ${data.flatNumber}</div>
            <div class="info-item"><strong>Floor:</strong> ${data.floorNumber}</div>
            <div class="info-item"><strong>Area:</strong> ${data.area}</div>
            <div class="info-item"><strong>Rate:</strong> ${data.rate}</div>
            <div class="info-item"><strong>Site Address:</strong> ${data.siteAddress}</div>
            <div class="info-item"><strong>Total Amount:</strong> ${formatINR(data.totalAmount)}</div>
          </div>
        </div>

        <div class="section">
          <h3>Payment Details</h3>
          <table>
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsHTML}
              <tr class="total-row">
                <td colspan="2"><strong>Total Paid:</strong></td>
                <td style="text-align: right;"><strong>${formatINR(receiptTotalPaid)}</strong></td>
                <td colspan="2"></td>
              </tr>
              <tr class="total-row">
                <td colspan="2"><strong>Balance:</strong></td>
                <td style="text-align: right;"><strong>${formatINR(receiptBalance)}</strong></td>
                <td colspan="2"></td>
              </tr>
              ${receiptOverCollected > 0 ? `
              <tr class="total-row">
                <td colspan="2"><strong>Over Collected:</strong></td>
                <td style="text-align: right;"><strong>${formatINR(receiptOverCollected)}</strong></td>
                <td colspan="2"></td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Tax Details</h3>
          <table>
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Tax Name</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${taxesHTML}
              <tr class="total-row">
                <td colspan="2"><strong>Total Tax:</strong></td>
                <td style="text-align: right;"><strong>${formatINR(receiptTotalTaxAmount)}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="2"><strong>Total with Tax:</strong></td>
                <td style="text-align: right;"><strong>${formatINR(receiptTotalWithTax)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Amount in Words</h3>
          <p>${data.amountInWords}</p>
        </div>

        <div class="signature">
          <p>_________________________</p>
          <p>Authorized Signature</p>
        </div>
      </body>
      </html>
    `
  }

  const handleDownload = (data: ReceiptData) => {
    const html = generateReceiptHTML(data)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Receipt-${data.customerName.replace(/\s+/g, '-')}-${data.receiptNumber}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden border border-border bg-background sm:h-auto sm:max-h-[92vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-6 backdrop-blur flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif text-foreground">Receipt Workspace</h2>
            <p className="text-sm text-muted-foreground">Customer, project, and site details are prefilled from the current booking wherever available.</p>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 border-border hover:bg-muted"
          >
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSubmit(handleDownload)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Receipt Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50">Customer</p>
                  <p className="mt-2 text-base font-serif text-foreground">{watchedCustomerName || 'Pending name'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50">Project</p>
                  <p className="mt-2 text-base font-serif text-foreground">{watchedProjectName || 'Pending project'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50">Flat</p>
                  <p className="mt-2 text-base font-serif text-foreground">{watchedFlatNumber || 'Pending flat'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50">Receipt Total</p>
                  <p className="mt-2 text-base font-serif text-foreground">{formatINR(totalWithTax)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Collection Status</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Paid</Label>
                  <div className="mt-2 text-2xl font-bold text-emerald-600">{formatINR(totalPaid)}</div>
                </div>
                <div>
                  <Label>Balance</Label>
                  <div className={cn("mt-2 text-2xl font-bold", balance > 0 ? "text-red-500" : "text-emerald-600")}>
                    {formatINR(balance)}
                  </div>
                  {overCollected > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Payments exceed receipt total by {formatINR(overCollected)}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipt Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="receiptNumber">Receipt Number</Label>
                  <Input {...register('receiptNumber')} readOnly className="bg-muted cursor-not-allowed" />
                </div>
                <div>
                  <Label htmlFor="receiptDate">Receipt Date</Label>
                  <Input type="date" {...register('receiptDate')} />
                </div>
                <div>
                  <Label htmlFor="registrationDate">Registration Date</Label>
                  <Input type="date" {...register('registrationDate')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input {...register('customerName', { required: true })} />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input {...register('customerPhone')} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="customerAddress">Address</Label>
                  <Input {...register('customerAddress')} />
                </div>
                <div>
                  <Label htmlFor="customerPan">PAN Number</Label>
                  <Input {...register('customerPan')} />
                </div>
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input {...register('projectName')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property & Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="flatNumber">Flat Number</Label>
                  <Input {...register('flatNumber')} />
                </div>
                <div>
                  <Label htmlFor="floorNumber">Floor</Label>
                  <Input {...register('floorNumber')} />
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input {...register('area')} />
                </div>
                <div>
                  <Label htmlFor="rate">Rate per Sqft</Label>
                  <Input {...register('rate')} />
                </div>
                <div>
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <Input type="number" {...register('totalAmount', { required: true, valueAsNumber: true })} />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="siteAddress">Site Address</Label>
                  <Input {...register('siteAddress')} />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="amountInWords">Amount in Words</Label>
                  <Input 
                    {...register('amountInWords')} 
                    readOnly 
                    className="bg-muted cursor-not-allowed"
                    placeholder="Auto-generated from total amount"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                If the site name or address looks wrong, update the receipt fields here for download. A dedicated site settings save flow is not available in the current frontend API yet.
              </p>
            </CardContent>
          </Card>

          {/* Tax Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tax Details</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addTaxRow}>
                  <Plus className="mr-2 w-4 h-4" />Add Tax
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {watchedTaxes.map((tax, index) => (
                <div key={tax.id} className="grid grid-cols-1 gap-2 border border-border/60 p-3 md:grid-cols-[auto_minmax(0,1.3fr)_180px_160px_auto_auto] md:items-center">
                  <div className="text-sm text-muted-foreground font-medium">#{index + 1}</div>
                  <Input 
                    value={tax.name} 
                    onChange={(e) => updateTax(tax.id, 'name', e.target.value)} 
                    placeholder="Tax Name (e.g., GST, VAT)" 
                  />
                  <select 
                    value={tax.type} 
                    onChange={(e) => updateTax(tax.id, 'type', e.target.value)} 
                    className="h-10 bg-muted border-none rounded-none text-sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                  <Input 
                    type="number" 
                    value={tax.value} 
                    onChange={(e) => updateTax(tax.id, 'value', Number(e.target.value) || 0)} 
                    placeholder={tax.type === 'percentage' ? 'e.g., 18' : 'e.g., 5000'}
                  />
                  <div className="text-sm font-bold text-primary">
                    {formatINR(tax.calculatedAmount)}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeTaxRow(tax.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {watchedTaxes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Total Tax Amount</Label>
                    <div className="text-lg font-bold text-orange-600">{formatINR(totalTaxAmount)}</div>
                  </div>
                  <div>
                    <Label>Total with Tax</Label>
                    <div className="text-lg font-bold text-primary">{formatINR(totalWithTax)}</div>
                  </div>
                </div>
              )}
              
              {watchedTaxes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No taxes added</p>
                  <p className="text-xs mt-1">Click "Add Tax" to include GST, VAT, or other applicable taxes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Payment Details</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetPaymentState()
                    setIsLedgerPaymentModalOpen(true)
                  }}
                  disabled={ledgerRemaining <= 0}
                >
                  <IndianRupee className="mr-2 w-4 h-4" />
                  {ledgerRemaining > 0 ? 'Record Ledger Payment' : 'Fully Paid'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Receipt payment rows now mirror the customer ledger. Dates, amounts, and notes stay read-only here so the receipt always matches accounting. Use Record Ledger Payment to add a real payment first, then download the updated receipt.
              </p>
              <p className="text-xs text-muted-foreground">
                Tax rows are still print-only in this version. Ledger payments continue to apply against the booking value only.
              </p>
              {paymentError && (
                <div className="border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-600">
                  {typeof paymentError === 'string'
                    ? paymentError
                    : typeof paymentError === 'object' && paymentError !== null && 'error' in paymentError && typeof paymentError.error === 'string'
                      ? paymentError.error
                      : 'Payment could not be recorded from the receipt workspace.'}
                </div>
              )}
              {watchedPayments.map((payment, index) => (
                <div key={payment.id} className="grid grid-cols-1 gap-2 border border-border/60 p-3 md:grid-cols-[auto_170px_140px_140px_minmax(0,1fr)_90px] md:items-center">
                  <div className="text-sm text-muted-foreground font-medium">#{index + 1}</div>
                  <Input type="date" value={payment.date} readOnly className="bg-muted/60 cursor-not-allowed" />
                  <Input type="number" value={payment.amount} readOnly className="bg-muted/60 cursor-not-allowed" />
                  <Input value={payment.mode} onChange={(e) => updatePaymentMode(payment.id, e.target.value)} placeholder="Mode" />
                  <Input value={payment.note} readOnly className="bg-muted/60 cursor-not-allowed" />
                  <div className="text-right text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    Ledger
                  </div>
                </div>
              ))}
              {watchedPayments.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No ledger payments recorded yet. Use Record Ledger Payment to add the first collection before downloading a receipt.
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Total Paid</Label>
                  <div className="text-lg font-bold text-green-600">{formatINR(totalPaid)}</div>
                </div>
                <div>
                  <Label>Balance</Label>
                  <div className={cn("text-lg font-bold", balance > 0 ? "text-red-500" : "text-green-600")}>
                    {formatINR(balance)}
                  </div>
                  {overCollected > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Over collected: {formatINR(overCollected)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="sticky bottom-0 flex justify-end gap-4 border-t bg-background/95 p-4 backdrop-blur">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Download className="w-4 h-4" />
              Download Receipt
            </Button>
          </div>
        </form>
      </div>

      {isLedgerPaymentModalOpen && (
        <RecordPaymentModal
          title={`Customer: ${customer.name}`}
          totalAmount={customer.sellingPrice}
          currentlyPaid={totalPaid}
          entityType="customer-booking"
          entityId={customer.id}
          isPending={isRecordingPayment}
          onClose={() => {
            setIsLedgerPaymentModalOpen(false)
            resetPaymentState()
          }}
          onSubmit={(amount, note) => {
            recordPayment(
              { customerId: customer.id, data: { amount, note } },
              {
                onSuccess: (response: any) => {
                  const payment = response?.data?.payment
                  if (payment) {
                    appendLedgerPaymentRow({
                      id: payment.id,
                      amount: payment.amount,
                      createdAt: payment.createdAt,
                      note: note || '',
                    })
                  }
                  setIsLedgerPaymentModalOpen(false)
                  resetPaymentState()
                },
              },
            )
          }}
        />
      )}
    </div>
  )
}
