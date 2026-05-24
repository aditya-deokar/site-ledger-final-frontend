'use client';

import { Download, FileText, Printer, X } from 'lucide-react';
import { toast } from 'sonner';

import { useCompany } from '@/hooks/api/company.hooks';
import { resolveCompanyLogoUrl } from '@/lib/company-logo';
import { downloadVendorReceiptPDF } from '@/lib/pdf-generator';
import type { VendorReceipt } from '@/schemas/vendor.schema';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatINR(value: number) {
  return `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function getPaymentModeLabel(mode?: string | null) {
  switch (mode) {
    case 'CASH':
      return 'Cash';
    case 'CHEQUE':
      return 'Cheque';
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    case 'UPI':
      return 'UPI';
    default:
      return '';
  }
}

function buildInfoRow(label: string, value?: string | null) {
  if (!value) return '';
  return `
    <div style="margin-bottom:12px;">
      <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;color:#7a7a7a;">${escapeHtml(label)}</p>
      <p style="margin:4px 0 0;font-size:13px;line-height:1.45;color:#111827;">${escapeHtml(value)}</p>
    </div>
  `;
}

function buildSummaryCard(label: string, value: string) {
  return `
    <div style="border:1px solid #d4d4d4;border-radius:4px;background:#fafafa;padding:12px 14px;">
      <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;color:#7a7a7a;">${escapeHtml(label)}</p>
      <p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(value)}</p>
    </div>
  `;
}

function buildVendorReceiptInnerHtml(receipt: VendorReceipt, companyData?: any) {
  const companyName = companyData?.name || 'Company';
  const companyLogo =
    companyData?.receiptSettings?.showCompanyLogo !== false && companyData?.logo
      ? resolveCompanyLogoUrl(companyData.logo)
      : null;
  const companyAddress =
    companyData?.receiptSettings?.showCorporateAddress && companyData?.address
      ? companyData.address
      : receipt.siteAddress || null;
  const companyPhone =
    companyData?.receiptSettings?.showSupportContact && companyData?.phone
      ? companyData.phone
      : null;
  const companyGstin =
    companyData?.receiptSettings?.showGstin && companyData?.gstin
      ? companyData.gstin
      : null;
  const companyPan =
    companyData?.receiptSettings?.showPan && companyData?.pan
      ? companyData.pan
      : null;
  const companyRera =
    companyData?.receiptSettings?.showReraNumber && companyData?.reraNumber
      ? companyData.reraNumber
      : null;

  const complianceLine = [companyGstin ? `GSTIN: ${companyGstin}` : null, companyPan ? `PAN: ${companyPan}` : null, companyRera ? `RERA: ${companyRera}` : null]
    .filter(Boolean)
    .join(' • ');
  const pendingAgainstBill = Math.max(receipt.billAmount - receipt.amount, 0);
  const billParticulars = [
    receipt.billNumber ? `Bill ${receipt.billNumber}` : null,
    receipt.description,
    receipt.reason,
    receipt.siteName ? `Site: ${receipt.siteName}` : null,
  ]
    .filter(Boolean)
    .join(' • ');
  const paymentParticulars = [
    receipt.paymentMode ? `Paid via ${getPaymentModeLabel(receipt.paymentMode)}` : null,
    receipt.referenceNumber ? `Ref ${receipt.referenceNumber}` : null,
    receipt.note,
  ]
    .filter(Boolean)
    .join(' • ');

  return `
    <section style="font-family: Arial, Helvetica, sans-serif; color:#111827;">
      <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:16px;">
        <div style="display:flex;gap:16px;align-items:flex-start;">
          ${
            companyLogo
              ? `<div style="width:92px;height:62px;border:1px solid #d4d4d4;border-radius:4px;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="${escapeHtml(companyLogo)}" alt="Company logo" style="max-width:100%;max-height:100%;object-fit:contain;" /></div>`
              : ''
          }
          <div>
            <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.02em;">${escapeHtml(companyName.toUpperCase())}</h1>
            ${receipt.siteName ? `<p style="margin:8px 0 0;font-size:14px;color:#111827;">${escapeHtml(receipt.siteName)}</p>` : ''}
            ${companyAddress ? `<p style="margin:4px 0 0;font-size:13px;color:#7a4f00;">${escapeHtml(companyAddress)}</p>` : ''}
            ${companyPhone ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Support: ${escapeHtml(companyPhone)}</p>` : ''}
            ${complianceLine ? `<p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${escapeHtml(complianceLine)}</p>` : ''}
          </div>
        </div>

        <div style="min-width:220px;padding:12px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;color:#4b5563;">Payment Receipt</p>
          <p style="margin:8px 0 0;font-size:20px;font-weight:800;color:#111827;">${escapeHtml(receipt.receiptNumber)}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">${escapeHtml(formatShortDate(receipt.date))}</p>
        </div>
      </div>

      <div style="border-top:1px solid #d4d4d4;border-bottom:1px solid #d4d4d4;background:#fafafa;padding:16px 0;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:24px;">
        <div>
          <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;">Amount Paid</p>
          <p style="margin:8px 0 0;font-size:24px;font-weight:800;color:#111827;">${escapeHtml(formatINR(receipt.amount))}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Payment issued to ${escapeHtml(receipt.vendorName)}</p>
        </div>
        ${receipt.paymentMode ? `<div style="min-width:120px;border:1px solid #d4d4d4;border-radius:6px;background:#ffffff;padding:10px 16px;text-align:center;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(getPaymentModeLabel(receipt.paymentMode))}</div>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-bottom:20px;">
        <div style="padding:0 14px 0 0;border-right:1px solid #d4d4d4;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #d4d4d4;padding-bottom:4px;">Vendor</p>
          ${buildInfoRow('Name', receipt.vendorName)}
          ${buildInfoRow('Phone', receipt.vendorPhone)}
          ${buildInfoRow('Contact', receipt.contactPersonName)}
          ${buildInfoRow('GSTIN', receipt.vendorGstin)}
          ${buildInfoRow('Email', receipt.vendorEmail)}
        </div>
        <div style="padding:0 14px;border-right:1px solid #d4d4d4;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #d4d4d4;padding-bottom:4px;">Property</p>
          ${buildInfoRow('Project', receipt.siteName)}
          ${buildInfoRow('Bill No.', receipt.billNumber)}
          ${buildInfoRow('Bill Date', formatShortDate(receipt.billDate))}
          ${buildInfoRow('Due Date', receipt.dueDate ? formatShortDate(receipt.dueDate) : null)}
          ${buildInfoRow('Address', receipt.siteAddress || receipt.vendorAddress)}
        </div>
        <div style="padding:0 0 0 14px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #d4d4d4;padding-bottom:4px;">Transaction</p>
          ${buildInfoRow('Date', formatShortDate(receipt.date))}
          ${receipt.paymentMode ? buildInfoRow('Mode', getPaymentModeLabel(receipt.paymentMode)) : ''}
          ${receipt.referenceNumber ? buildInfoRow('Reference', receipt.referenceNumber) : ''}
          ${buildInfoRow('Note', receipt.note)}
        </div>
      </div>

      <div style="border-top:1px solid #d4d4d4;padding-top:10px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;color:#4b5563;">Account Position</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          ${buildSummaryCard('Bill Amount', formatINR(receipt.billAmount))}
          ${buildSummaryCard('Total Paid', formatINR(receipt.amount))}
          ${buildSummaryCard('Balance Due', formatINR(pendingAgainstBill))}
        </div>
      </div>

      <div style="border-top:1px solid #d4d4d4;padding-top:10px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;color:#4b5563;">Bill Line Items</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1f1f1f;color:#ffffff;">
              <th style="padding:8px 10px;font-size:12px;text-align:left;">DATE</th>
              <th style="padding:8px 10px;font-size:12px;text-align:left;">TYPE</th>
              <th style="padding:8px 10px;font-size:12px;text-align:left;">PARTICULARS</th>
              <th style="padding:8px 10px;font-size:12px;text-align:right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:10px;font-size:12px;">${escapeHtml(formatShortDate(receipt.billDate))}</td>
              <td style="padding:10px;font-size:12px;">Bill</td>
              <td style="padding:10px;font-size:12px;">${escapeHtml(billParticulars || 'Vendor bill')}</td>
              <td style="padding:10px;font-size:12px;text-align:right;">${escapeHtml(formatINR(receipt.billAmount))}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;background:#fafafa;">
              <td style="padding:10px;font-size:12px;">${escapeHtml(formatShortDate(receipt.date))}</td>
              <td style="padding:10px;font-size:12px;">Payment</td>
              <td style="padding:10px;font-size:12px;">${escapeHtml(paymentParticulars || 'Vendor payment')}</td>
              <td style="padding:10px;font-size:12px;text-align:right;">${escapeHtml(formatINR(receipt.amount))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:48px;">
        <div style="width:220px;border-top:1px solid #9ca3af;padding-top:14px;font-size:12px;color:#6b7280;">Vendor Signature</div>
        <div style="width:220px;border-top:1px solid #9ca3af;padding-top:14px;font-size:12px;color:#6b7280;text-align:right;">Authorised Signatory</div>
      </div>

      <p style="margin:20px 0 0;font-size:11px;color:#6b7280;text-align:center;">
        Generated on ${escapeHtml(formatDate(receipt.createdAt || receipt.date))} • ${escapeHtml(receipt.receiptNumber)}
      </p>
    </section>
  `;
}

export function printVendorReceipt(receipt: VendorReceipt, companyData?: any) {
  const popup = window.open('', '_blank', 'width=960,height=720');
  if (!popup) {
    toast.error('Pop-up was blocked. Allow pop-ups to print this receipt.');
    return;
  }

  popup.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Vendor Receipt ${escapeHtml(receipt.receiptNumber)}</title>
        <style>
          body { margin: 0; padding: 24px; background: #f3f4f6; }
          .wrap { max-width: 980px; margin: 0 auto; background: white; padding: 36px; }
          @media print { body { padding: 0; background: white; } .wrap { max-width: none; padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="wrap">${buildVendorReceiptInnerHtml(receipt, companyData)}</div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

export function VendorReceiptModal({
  receipt,
  onClose,
}: {
  receipt: VendorReceipt;
  onClose: () => void;
}) {
  const { data: companyResponse } = useCompany();
  const companyData = companyResponse?.data?.company;

  const handleDownload = async () => {
    try {
      await downloadVendorReceiptPDF(receipt, companyData);
      toast.success('Receipt downloaded successfully.');
    } catch (error) {
      console.error('Vendor receipt PDF error:', error);
      toast.error('Failed to export receipt as PDF.');
    }
  };

  const handlePrint = () => {
    printVendorReceipt(receipt, companyData);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Vendor Receipt</p>
            <h3 className="mt-1 text-xl font-serif text-foreground">{receipt.receiptNumber}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-6 py-6">
          <div
            className="mx-auto max-w-5xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm"
            dangerouslySetInnerHTML={{ __html: buildVendorReceiptInnerHtml(receipt, companyData) }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={() => void handleDownload()}
            className="inline-flex h-10 items-center gap-2 border border-border px-4 text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex h-10 items-center gap-2 border border-border px-4 text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
