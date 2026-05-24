'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  CircleDot,
  Download,
  Eye,
  FileUp,
  Landmark,
  Loader2,
  MapPin,
  Printer,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useCreateVendorDocument,
  useDeleteVendorDocument,
  usePatchVendorStatus,
  useVendor,
  useVendorBills,
  useVendorDocuments,
  useVendorPayments,
  useVendorReceipts,
  useVendorStatement,
} from '@/hooks/api/vendor.hooks';
import { useSites, useUpdateExpensePayment } from '@/hooks/api/site.hooks';
import { vendorService } from '@/services/vendor.service';
import {
  type VendorBill,
  type VendorDocument,
  type VendorPayment,
  type VendorReceipt,
  type VendorStatus,
  type VendorSummary,
} from '@/schemas/vendor.schema';
import { RecordPaymentModal } from '@/components/dashboard/record-payment-modal';
import {
  printVendorReceipt,
  VendorReceiptModal,
} from '@/components/dashboard/vendor-receipt-modal';
import { downloadVendorReceiptPDF } from '@/lib/pdf-generator';
import { useCompany } from '@/hooks/api/company.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { VendorWorkspaceTab } from '@/lib/vendor-workspace';
import { cn } from '@/lib/utils';

function formatINR(value: number) {
  return `Rs. ${value.toLocaleString('en-IN')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function statusTone(status: VendorStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
    case 'INACTIVE':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-700';
    case 'BLOCKED':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
    case 'ARCHIVED':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-700';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

function DetailPair({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-1 border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || '-'}</p>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <p className={cn('mt-2 text-2xl font-serif text-foreground', tone)}>{value}</p>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 border border-border/60 bg-background/80 px-3 py-2">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center border border-border/60 bg-muted/40 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value || '-'}</p>
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export type VendorProfileTab = VendorWorkspaceTab;

function normalizeVendorProfileTab(tab?: VendorProfileTab | null): VendorProfileTab {
  return tab ?? 'overview';
}

function downloadFile(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function PaymentBridge({
  bill,
  onClose,
}: {
  bill: VendorBill;
  onClose: () => void;
}) {
  const { mutate: updatePayment, isPending } = useUpdateExpensePayment(bill.siteId, { onSuccess: onClose });

  return (
    <RecordPaymentModal
      title={bill.description || bill.reason || bill.billNumber || 'Vendor bill payment'}
      contextNote={`${bill.siteName} / ${bill.billNumber || 'Bill'}`}
      totalAmount={bill.amount}
      currentlyPaid={bill.amountPaid}
      entityType="expense"
      entityId={bill.id}
      siteId={bill.siteId}
      isPending={isPending}
      onClose={onClose}
      onSubmit={({ amount, note, paymentMode, referenceNumber, paymentDate }) => {
        updatePayment({
          expenseId: bill.id,
          data: {
            amount,
            note,
            paymentMode,
            referenceNumber,
            paymentDate,
          },
        });
      }}
    />
  );
}

export function VendorProfile({
  vendorId,
  vendorName,
  initialTab = 'overview',
  onClose,
}: {
  vendorId: string;
  vendorName?: string;
  initialTab?: VendorProfileTab;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<VendorProfileTab>(normalizeVendorProfileTab(initialTab));
  const [documentType, setDocumentType] = useState('KYC');
  const [documentName, setDocumentName] = useState('');
  const [documentNote, setDocumentNote] = useState('');
  const [documentSiteId, setDocumentSiteId] = useState('');
  const [documentExpenseId, setDocumentExpenseId] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [payBill, setPayBill] = useState<VendorBill | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<VendorReceipt | null>(null);

  const { data: vendorData, isLoading: vendorLoading } = useVendor(vendorId);
  const { data: companyResponse } = useCompany();
  const companyData = companyResponse?.data?.company;
  const { data: billsData, isLoading: billsLoading } = useVendorBills(vendorId, { page: 1, size: 200 });
  const { data: paymentsData, isLoading: paymentsLoading } = useVendorPayments(vendorId, { page: 1, size: 200 });
  const { data: receiptsData, isLoading: receiptsLoading } = useVendorReceipts(vendorId, { page: 1, size: 200 });
  const { data: statementData, isLoading: statementLoading } = useVendorStatement(vendorId, { page: 1, size: 500 });
  const { data: documentsData, isLoading: documentsLoading } = useVendorDocuments(vendorId);
  const { data: sitesData } = useSites();
  const { mutate: patchVendorStatus, isPending: isPatchingStatus } = usePatchVendorStatus();
  const { mutateAsync: createVendorDocument, isPending: isCreatingDocument } = useCreateVendorDocument();
  const { mutate: deleteVendorDocument, isPending: isDeletingDocument } = useDeleteVendorDocument();

  const vendor: VendorSummary | undefined = vendorData?.data?.vendor;
  const bills = billsData?.data?.transactions ?? [];
  const payments = paymentsData?.data?.payments ?? [];
  const receipts = receiptsData?.data?.receipts ?? [];
  const statement = statementData?.data?.statement ?? [];
  const documents = documentsData?.data?.documents ?? [];
  const sites = sitesData?.data?.sites ?? [];
  const documentsByExpenseId = useMemo(() => {
    const map = new Map<string, VendorDocument[]>();

    for (const document of documents) {
      if (!document.expenseId) continue;
      const group = map.get(document.expenseId) ?? [];
      group.push(document);
      map.set(document.expenseId, group);
    }

    return map;
  }, [documents]);

  const billOptions = useMemo(
    () => bills.map((bill) => ({ id: bill.id, label: `${bill.billNumber || bill.description || 'Vendor bill'} / ${bill.siteName}` })),
    [bills],
  );

  const isLoadingCurrentTab =
    vendorLoading ||
    (activeTab === 'bills' && billsLoading) ||
    (activeTab === 'payments' && paymentsLoading) ||
    (activeTab === 'receipts' && receiptsLoading) ||
    (activeTab === 'documents' && documentsLoading) ||
    (activeTab === 'statement' && statementLoading);

  useEffect(() => {
    setActiveTab(normalizeVendorProfileTab(initialTab));
  }, [initialTab, vendorId]);

  const handleDocumentUpload = async () => {
    if (!documentFile) {
      toast.error('Choose a file to upload.');
      return;
    }

    if (!documentType.trim()) {
      toast.error('Document type is required.');
      return;
    }

    setIsUploadingDocument(true);
    try {
      const fileUrl = await vendorService.uploadVendorDocumentToS3(documentFile);
      await createVendorDocument({
        vendorId,
        data: {
          documentType: documentType.trim(),
          documentName: (documentName.trim() || documentFile.name),
          fileUrl,
          note: documentNote.trim() || undefined,
          siteId: documentSiteId || undefined,
          expenseId: documentExpenseId || undefined,
        },
      });

      setDocumentName('');
      setDocumentNote('');
      setDocumentSiteId('');
      setDocumentExpenseId('');
      setDocumentFile(null);
      toast.success('Vendor document uploaded');
    } catch (error) {
      toast.error((error as { error?: string })?.error || 'Failed to upload document.');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const displayVendorName = vendor?.name || vendorName || 'Vendor';
  const activeAssignments = vendor?.assignments?.filter((assignment) => assignment.status === 'ACTIVE') ?? [];

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="border border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.5fr)_23rem]">
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Vendor Workspace</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h3 className="text-3xl font-serif leading-none text-foreground sm:text-4xl">{displayVendorName}</h3>
                    {vendor && (
                      <span className={cn('border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest', statusTone(vendor.status))}>
                        {vendor.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {vendor?.notes?.trim()
                      ? vendor.notes
                      : 'A compact view of vendor identity, contact details, banking information, active sites, and payment health.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  <span className="border border-border bg-muted/30 px-2.5 py-1">{vendor?.type || 'Unclassified vendor'}</span>
                  <span className="border border-border bg-muted/30 px-2.5 py-1">{vendor?.contactPersonName || 'No contact name'}</span>
                  <span className="border border-border bg-muted/30 px-2.5 py-1">{vendor?.paymentTermsDays ? `${vendor.paymentTermsDays} day terms` : 'Terms not set'}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <InfoPill icon={CircleDot} label="Primary Contact" value={vendor?.contactPersonName || vendor?.phone} />
                  <InfoPill icon={MapPin} label="Location" value={vendor?.address} />
                  <InfoPill icon={Landmark} label="Banking" value={vendor?.bankName || vendor?.upiId} />
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-muted/20 p-6 lg:border-l lg:border-t-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/60">Financial Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="border border-border bg-background px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Outstanding</p>
                  <p className={cn('mt-2 text-3xl font-serif', vendor && vendor.totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                    {formatINR(vendor?.totalOutstanding ?? 0)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border bg-background px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Billed</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{formatINR(vendor?.totalBilled ?? 0)}</p>
                  </div>
                  <div className="border border-border bg-background px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Paid</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-700">{formatINR(vendor?.totalPaid ?? 0)}</p>
                  </div>
                  <div className="border border-border bg-background px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Overdue</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{vendor?.overdueBillCount ?? 0}</p>
                  </div>
                  <div className="border border-border bg-background px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Documents</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{vendor?.documentCount ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {vendor && (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <SummaryCard label="Active Sites" value={String(activeAssignments.length || vendor.siteCount || 0)} />
            <SummaryCard label="Bills Logged" value={String(vendor.billCount)} />
            <SummaryCard label="Payments Logged" value={String(vendor.paymentCount)} tone="text-emerald-700" />
            <SummaryCard label="Documents" value={String(vendor.documentCount)} />
            <SummaryCard label="Total Billed" value={formatINR(vendor.totalBilled)} />
          </div>
        )}

        <div className="border border-border bg-card">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="min-h-0">
            <div className="border-b border-border px-6 py-3">
              <TabsList variant="line" className="flex-wrap gap-3">
                {[
                  ['overview', 'Overview'],
                  ['bills', 'Bills'],
                  ['payments', 'Payments'],
                  ['receipts', 'Receipts'],
                  ['documents', 'Documents'],
                  ['statement', 'Statement'],
                ].map(([key, label]) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="min-h-0 px-6 py-6">
              {isLoadingCurrentTab ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <TabsContent value="overview" className="space-y-6">
                    {vendor ? (
                      <>
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.9fr)]">
                          <div className="space-y-6">
                            <ProfileSection
                              title="Identity & Contact"
                              description="Core profile details for day-to-day communication."
                            >
                              <div className="grid gap-3 sm:grid-cols-2">
                                <DetailPair label="Vendor Name" value={vendor.name} />
                                <DetailPair label="Category" value={vendor.type} />
                                <DetailPair label="Contact Person" value={vendor.contactPersonName} />
                                <DetailPair label="Phone" value={vendor.phone} />
                                <DetailPair label="Email" value={vendor.email} />
                                <DetailPair label="Address" value={vendor.address} />
                              </div>
                            </ProfileSection>

                            <ProfileSection
                              title="Compliance & Payout"
                              description="Tax and payment rails grouped together for faster verification."
                            >
                              <div className="grid gap-3 sm:grid-cols-2">
                                <DetailPair label="GSTIN" value={vendor.gstin} />
                                <DetailPair label="PAN" value={vendor.pan} />
                                <DetailPair label="Bank Name" value={vendor.bankName} />
                                <DetailPair label="Bank Account Name" value={vendor.bankAccountName} />
                                <DetailPair label="Account Number" value={vendor.accountNumber} />
                                <DetailPair label="IFSC Code" value={vendor.ifscCode} />
                                <DetailPair label="UPI ID" value={vendor.upiId} />
                                <DetailPair label="Payment Terms" value={vendor.paymentTermsDays ? `${vendor.paymentTermsDays} days` : '-'} />
                              </div>
                            </ProfileSection>
                          </div>

                          <div className="space-y-6">
                            <ProfileSection
                              title="Operational Snapshot"
                              description="Current status, activity dates, and where this vendor is active."
                            >
                              <div className="grid gap-3">
                                <DetailPair label="Current Status" value={vendor.status} />
                                <DetailPair label="Last Bill Date" value={formatDate(vendor.lastBillDate)} />
                                <DetailPair label="Last Payment Date" value={formatDate(vendor.lastPaymentDate)} />
                                <DetailPair label="Documents on File" value={vendor.documentCount} />
                                <DetailPair label="Assigned Sites" value={vendor.siteCount} />
                              </div>

                              <div className="mt-4 border-t border-border pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Active Site Coverage</p>
                                {activeAssignments.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {activeAssignments.map((assignment) => (
                                      <span key={assignment.id} className="border border-border bg-muted/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/70">
                                        {assignment.siteName}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-3 text-sm text-muted-foreground">No active site assignments recorded.</p>
                                )}
                              </div>
                            </ProfileSection>

                            <ProfileSection
                              title="Notes"
                              description="Operational reminders and context for this vendor."
                            >
                              <p className="text-sm leading-7 text-foreground">{vendor.notes || 'No vendor notes recorded yet.'}</p>
                            </ProfileSection>
                          </div>
                        </div>

                        <div className="space-y-3 border border-border bg-muted/20 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Status Controls</p>
                              <p className="mt-1 text-sm text-muted-foreground">Archive, block, or inactivate this vendor without losing history.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(['ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED'] as VendorStatus[]).map((status) => (
                                <Button
                                  key={status}
                                  type="button"
                                  variant={vendor.status === status ? 'default' : 'outline'}
                                  disabled={isPatchingStatus}
                                  onClick={() => patchVendorStatus({ id: vendor.id, status })}
                                  className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest"
                                >
                                  {status}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Vendor details are unavailable.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="bills" className="space-y-4">
                    {bills.length === 0 ? (
                      <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No vendor bills recorded yet.
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-border">
                        <div className="grid grid-cols-[9rem_minmax(0,1.6fr)_8rem_8rem_8rem_8rem_8rem] gap-4 bg-muted/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          <span>Date</span>
                          <span>Bill</span>
                          <span>Site</span>
                          <span>Billed</span>
                          <span>Paid</span>
                          <span>Due</span>
                          <span className="text-right">Action</span>
                        </div>
                        {bills.map((bill) => (
                          <div key={bill.id} className="grid grid-cols-[9rem_minmax(0,1.6fr)_8rem_8rem_8rem_8rem_8rem] items-center gap-4 border-t border-border px-4 py-4 text-sm">
                            <span className="font-semibold text-muted-foreground">{formatDate(bill.billDate)}</span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{bill.billNumber || bill.description || bill.reason || 'Vendor bill'}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Due {formatDate(bill.dueDate)} {bill.isOverdue ? '/ OVERDUE' : ''} / {bill.documentCount} docs
                              </p>
                              {(() => {
                                const billDocuments = documentsByExpenseId.get(bill.id) ?? [];
                                if (billDocuments.length === 0) return null;

                                const primaryDocument = billDocuments[0];
                                return (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => window.open(primaryDocument.fileUrl, '_blank', 'noopener,noreferrer')}
                                      className="h-7 rounded-none px-2 text-[9px] font-bold uppercase tracking-widest"
                                    >
                                      <Eye className="mr-1 h-3.5 w-3.5" />
                                      View Bill
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => downloadFile(primaryDocument.fileUrl, primaryDocument.documentName)}
                                      className="h-7 rounded-none px-2 text-[9px] font-bold uppercase tracking-widest"
                                    >
                                      <Download className="mr-1 h-3.5 w-3.5" />
                                      Download Bill
                                    </Button>
                                  </div>
                                );
                              })()}
                            </div>
                            <span className="truncate text-muted-foreground">{bill.siteName}</span>
                            <span className="font-semibold text-foreground">{formatINR(bill.amount)}</span>
                            <span className="font-semibold text-emerald-700">{formatINR(bill.amountPaid)}</span>
                            <span className={cn('font-semibold', bill.remaining > 0 ? 'text-rose-600' : 'text-emerald-700')}>{formatINR(bill.remaining)}</span>
                            <div className="flex justify-end">
                              {bill.remaining <= 0 || bill.amountPaid >= bill.amount || bill.paymentStatus === 'COMPLETED' ? (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Settled</span>
                              ) : (
                                <Button type="button" onClick={() => setPayBill(bill)} className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest">
                                  Pay
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="payments" className="space-y-4">
                    {payments.length === 0 ? (
                      <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No payments recorded for this vendor yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {payments.map((payment: VendorPayment) => (
                          <div key={payment.id} className="grid gap-4 border border-border bg-background p-4 lg:grid-cols-[10rem_minmax(0,1fr)_10rem_10rem_12rem]">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Payment Date</p>
                              <p className="mt-2 font-semibold text-foreground">{formatDate(payment.paymentDate)}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{payment.billNumber || payment.description || payment.reason || 'Vendor payment'}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {payment.siteName || '-'} / {payment.paymentMode || 'Mode not captured'} / {payment.referenceNumber || 'No reference'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount</p>
                              <p className="mt-2 font-semibold text-emerald-700">{formatINR(payment.amount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Receipt</p>
                              <p className="mt-2 font-semibold text-foreground">{payment.receipt?.receiptNumber || 'Pending'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Note</p>
                              <p className="mt-2 text-sm text-muted-foreground">{payment.note || '-'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="receipts" className="space-y-4">
                    {receipts.length === 0 ? (
                      <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No persisted receipts available yet for this vendor.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {receipts.map((receipt) => (
                          <div key={receipt.id} className="grid gap-4 border border-border bg-background p-4 lg:grid-cols-[15rem_9rem_minmax(0,1fr)_10rem_13rem]">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Receipt</p>
                              <p className="mt-2 font-semibold text-foreground">{receipt.receiptNumber}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{receipt.status}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</p>
                              <p className="mt-2 font-semibold text-foreground">{formatDate(receipt.date)}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{receipt.billNumber || 'Vendor payment receipt'}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {receipt.siteName || '-'} / {receipt.paymentMode || 'Mode not captured'} / {receipt.referenceNumber || 'No reference'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount</p>
                              <p className="mt-2 font-semibold text-emerald-700">{formatINR(receipt.amount)}</p>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setPreviewReceipt(receipt)} className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest">
                                <Eye className="mr-1 h-4 w-4" />
                                View
                              </Button>
                              <Button type="button" variant="outline" onClick={() => void downloadVendorReceiptPDF(receipt, companyData)} className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest">
                                <Download className="mr-1 h-4 w-4" />
                                PDF
                              </Button>
                              <Button type="button" variant="outline" onClick={() => printVendorReceipt(receipt, companyData)} className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest">
                                <Printer className="mr-1 h-4 w-4" />
                                Print
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
                      <div className="space-y-4 border border-border bg-muted/20 p-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Upload Document</p>
                          <p className="mt-1 text-sm text-muted-foreground">Store KYC files or attach invoice documents to vendor bills.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Document Type</Label>
                          <Input value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="h-11 rounded-none" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Document Name</Label>
                          <Input value={documentName} onChange={(event) => setDocumentName(event.target.value)} className="h-11 rounded-none" placeholder="Auto-fills from file name if left blank" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Attach to Site</Label>
                          <select value={documentSiteId} onChange={(event) => setDocumentSiteId(event.target.value)} className="h-11 w-full border border-border bg-background px-3 text-sm text-foreground">
                            <option value="">No site scope</option>
                            {sites.map((site) => (
                              <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Attach to Bill</Label>
                          <select value={documentExpenseId} onChange={(event) => setDocumentExpenseId(event.target.value)} className="h-11 w-full border border-border bg-background px-3 text-sm text-foreground">
                            <option value="">No bill attachment</option>
                            {billOptions.map((billOption) => (
                              <option key={billOption.id} value={billOption.id}>{billOption.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Notes</Label>
                          <Textarea value={documentNote} onChange={(event) => setDocumentNote(event.target.value)} className="min-h-20 rounded-none" placeholder="Optional remarks" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">File</Label>
                          <label className="flex h-20 cursor-pointer items-center justify-center border border-dashed border-border bg-background text-center text-sm text-muted-foreground">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,image/png,image/jpeg,image/webp"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setDocumentFile(file);
                                if (file && !documentName.trim()) setDocumentName(file.name);
                              }}
                            />
                            {documentFile ? documentFile.name : 'Choose PDF or image'}
                          </label>
                        </div>

                        <Button
                          type="button"
                          onClick={() => void handleDocumentUpload()}
                          disabled={isUploadingDocument || isCreatingDocument}
                          className="h-10 w-full rounded-none text-[10px] font-bold uppercase tracking-widest"
                        >
                          {isUploadingDocument || isCreatingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                          Upload Document
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {documents.length === 0 ? (
                          <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                            No vendor documents have been uploaded yet.
                          </div>
                        ) : (
                          documents.map((document: VendorDocument) => (
                            <div key={document.id} className="grid gap-4 border border-border bg-background p-4 lg:grid-cols-[14rem_minmax(0,1fr)_10rem]">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{document.documentType}</p>
                                <p className="mt-2 font-semibold text-foreground">{document.documentName}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{formatDate(document.uploadedAt)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">
                                  {document.siteName || 'Company-wide'} {document.billNumber ? `/ ${document.billNumber}` : ''}
                                </p>
                                <p className="mt-2 text-sm text-foreground">{document.note || 'No notes'}</p>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => window.open(document.fileUrl, '_blank', 'noopener,noreferrer')} className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest">
                                  Open
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isDeletingDocument}
                                  onClick={() => deleteVendorDocument({ vendorId, documentId: document.id })}
                                  className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest text-rose-600"
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="statement" className="space-y-4">
                    {statement.length === 0 ? (
                      <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No statement entries recorded yet.
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-border">
                        <div className="grid grid-cols-[9rem_8rem_8rem_8rem_8rem_10rem_minmax(0,1fr)] gap-4 bg-muted/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          <span>Date</span>
                          <span>Entry</span>
                          <span>Site</span>
                          <span>Bill</span>
                          <span>Payment</span>
                          <span>Balance</span>
                          <span>Details</span>
                        </div>
                        {statement.map((entry) => (
                          <div key={entry.id} className="grid grid-cols-[9rem_8rem_8rem_8rem_8rem_10rem_minmax(0,1fr)] items-center gap-4 border-t border-border px-4 py-4 text-sm">
                            <span className="font-semibold text-muted-foreground">{formatDate(entry.date)}</span>
                            <span className={cn('w-fit border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', entry.entryType === 'PAYMENT' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : entry.entryType === 'OPENING_BALANCE' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-rose-500/30 bg-rose-500/10 text-rose-700')}>
                              {entry.entryType}
                            </span>
                            <span className="truncate text-muted-foreground">{entry.siteName || '-'}</span>
                            <span className="font-semibold text-foreground">{entry.billAmount ? formatINR(entry.billAmount) : '-'}</span>
                            <span className="font-semibold text-emerald-700">{entry.paymentAmount ? formatINR(entry.paymentAmount) : '-'}</span>
                            <span className="font-semibold text-foreground">{formatINR(entry.balance)}</span>
                            <div className="min-w-0">
                              <p className="truncate text-foreground">{entry.billNumber || entry.description || entry.reason || 'Statement entry'}</p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {entry.paymentMode || '-'} {entry.referenceNumber ? `/ ${entry.referenceNumber}` : ''} {entry.dueDate ? `/ Due ${formatDate(entry.dueDate)}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      {payBill && <PaymentBridge bill={payBill} onClose={() => setPayBill(null)} />}
      {previewReceipt && <VendorReceiptModal receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />}
    </>
  );
}
