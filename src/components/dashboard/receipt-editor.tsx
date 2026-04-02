"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Customer } from "@/schemas/customer.schema"
import { Download, X, Plus, Trash2, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"

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
  customer: Customer & { siteName?: string | null }
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
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReceiptData>({
    defaultValues: {
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      receiptDate: new Date().toISOString().slice(0, 10),
      customerName: customer.name,
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      customerPan: customer.panNumber || '',
      projectName: customer.siteName || '',
      siteAddress: siteAddress || '',
      flatNumber: customer.flatNumber,
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

  // Calculate total tax amount
  const totalTaxAmount = watchedTaxes.reduce((sum, tax) => sum + tax.calculatedAmount, 0)
  const totalWithTax = watchedTotalAmount + totalTaxAmount
  const totalPaid = watchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const balance = totalWithTax - totalPaid

  // Auto-update amount in words when total amount changes
  useEffect(() => {
    if (totalWithTax && totalWithTax > 0) {
      const amountInWords = convertToIndianWords(totalWithTax)
      setValue('amountInWords', amountInWords)
    }
  }, [totalWithTax, setValue, watchedTotalAmount, watchedTaxes])

  const addPaymentRow = () => {
    const newPayment = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      mode: 'CASH',
      note: ''
    }
    setValue('payments', [...watchedPayments, newPayment])
  }

  const removePaymentRow = (id: string) => {
    setValue('payments', watchedPayments.filter(p => p.id !== id))
  }

  const updatePayment = (id: string, field: string, value: any) => {
    setValue('payments', watchedPayments.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const addTaxRow = () => {
    const newTax = {
      id: Date.now().toString(),
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

  const generateReceiptHTML = (data: ReceiptData) => {
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
                <td style="text-align: right;"><strong>${formatINR(totalPaid)}</strong></td>
                <td colspan="2"></td>
              </tr>
              <tr class="total-row">
                <td colspan="2"><strong>Balance:</strong></td>
                <td style="text-align: right;"><strong>${formatINR(balance)}</strong></td>
                <td colspan="2"></td>
              </tr>
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
                <td style="text-align: right;"><strong>${formatINR(totalTaxAmount)}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="2"><strong>Total with Tax:</strong></td>
                <td style="text-align: right;"><strong>${formatINR(totalWithTax)}</strong></td>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif text-foreground">Receipt Editor</h2>
            <p className="text-sm text-muted-foreground">Edit receipt details before downloading</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(handleDownload)} className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="receiptNumber">Receipt Number</Label>
                  <Input {...register('receiptNumber')} />
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
              <CardTitle className="text-lg">Property Details</CardTitle>
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
            </CardContent>
          </Card>

          {/* Tax Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tax Details</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addTaxRow}>
                  <Plus className="w-4 h-4 mr-2" />Add Tax
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {watchedTaxes.map((tax, index) => (
                <div key={tax.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
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
                <Button type="button" variant="outline" size="sm" onClick={addPaymentRow}>
                  <Plus className="w-4 h-4 mr-2" />Add Payment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {watchedPayments.map((payment, index) => (
                <div key={payment.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <div className="text-sm text-muted-foreground font-medium">#{index + 1}</div>
                  <Input type="date" value={payment.date} onChange={(e) => updatePayment(payment.id, 'date', e.target.value)} />
                  <Input type="number" value={payment.amount} onChange={(e) => updatePayment(payment.id, 'amount', Number(e.target.value) || 0)} placeholder="Amount" />
                  <Input value={payment.mode} onChange={(e) => updatePayment(payment.id, 'mode', e.target.value)} placeholder="Mode" />
                  <Input value={payment.note} onChange={(e) => updatePayment(payment.id, 'note', e.target.value)} placeholder="Note" />
                  <Button type="button" variant="outline" size="sm" onClick={() => removePaymentRow(payment.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4 sticky bottom-0 bg-background p-4 border-t">
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
    </div>
  )
}
