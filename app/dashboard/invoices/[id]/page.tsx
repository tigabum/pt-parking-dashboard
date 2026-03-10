"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { invoiceService } from "@/lib/services/invoice-service";
import { DetailLayout } from "@/components/layouts/detail-layout";
import { format } from "date-fns";
import {
    ChevronDown,
    ChevronUp,
    User,
    Building2,
    FileText,
    CreditCard,
    Link2,
    Cpu,
    Package,
    Loader2,
    ShieldCheck,
    Printer,
    Download,
    XCircle,
    CheckCircle2,
    AlertCircle,
    FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PrintableInvoice } from "@/components/invoices/printable-invoice";

// ─── Collapsible Section ──────────────────────────────────────────────────────
function CollapsibleSection({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-100 last:border-0">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
            >
                <span className="flex items-center gap-3 font-semibold text-sm text-slate-700">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {title}
                </span>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
            </button>
            {open && <div className="px-6 pb-5">{children}</div>}
        </div>
    );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0 gap-4">
            <span className="text-xs text-slate-500 font-medium shrink-0 w-32 md:w-40">{label}</span>
            <span className="text-xs font-bold text-slate-800 text-right break-all">
                {value ?? <span className="text-slate-300 font-normal">—</span>}
            </span>
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        REGISTERED: "bg-emerald-100 text-emerald-700",
        VERIFIED: "bg-indigo-100 text-indigo-700",
        CANCELLED: "bg-rose-100 text-rose-700",
        FAILED: "bg-amber-100 text-amber-700",
        RECEIPT_GENERATED: "bg-blue-100 text-blue-700",
        PENDING: "bg-slate-100 text-slate-600",
    };
    return (
        <span
            className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                map[status] ?? "bg-slate-100 text-slate-600"
            )}
        >
            {status}
        </span>
    );
}

export default function InvoiceDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const printableRef = useRef<HTMLDivElement>(null);

    const loadInvoice = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await invoiceService.getById(id);
            setInvoice(data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load invoice details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoice();
    }, [id]);

    const handleVerify = async () => {
        setProcessing(true);
        const loadingToast = toast.loading("Verifying with Ministry of Revenue...");
        try {
            await invoiceService.verifyInvoice(id);
            toast.success("Invoice VERIFIED successfully", { id: loadingToast });
            loadInvoice();
        } catch (error: any) {
            toast.error("Verification failed: " + (error.response?.data?.message || error.message), { id: loadingToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this invoice? This action is reported to MOR.")) return;
        setProcessing(true);
        const loadingToast = toast.loading("Cancelling invoice...");
        try {
            await invoiceService.cancelInvoice(id, "1"); // Reason Code 1: Incorrect Receipt
            toast.success("Invoice CANCELLED successfully", { id: loadingToast });
            loadInvoice();
        } catch (error: any) {
            toast.error("Cancellation failed: " + (error.response?.data?.message || error.message), { id: loadingToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleReceipt = async () => {
        setProcessing(true);
        const loadingToast = toast.loading("Generating sales receipt...");
        try {
            await invoiceService.generateReceipt(id, {
                ReceiptNumber: `REC${Date.now()}`,
                Reason: "Payment for parking service",
                ModeOfPayment: "CASH"
            });
            toast.success("Receipt generated successfully", { id: loadingToast });
            loadInvoice();
        } catch (error: any) {
            toast.error("Receipt generation failed: " + (error.response?.data?.message || error.message), { id: loadingToast });
        } finally {
            setProcessing(false);
        }
    };

    const downloadPDF = async () => {
        if (!printableRef.current) return;
        const loadingToast = toast.loading("Preparing formal PDF for download...");
        try {
            const element = printableRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: "a4"
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            // Center image on page
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 20;

            pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save(`Invoice_${invoice.invoiceCounter || id.substring(0, 8)}.pdf`);

            toast.success("Formal invoice downloaded!", { id: loadingToast });
        } catch (error) {
            console.error("PDF generation failed", error);
            toast.error("Failed to generate PDF", { id: loadingToast });
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full p-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-10 text-center text-slate-500 font-medium">
                Invoice not found.
            </div>
        );
    }

    const buyer = invoice.buyerDetails ?? {};
    const seller = invoice.sellerDetails ?? {};
    const doc = invoice.documentDetails ?? {};
    const payment = invoice.paymentDetails ?? {};
    const ref = invoice.referenceDetails ?? {};
    const src = invoice.sourceSystem ?? {};
    const val = invoice.valueDetails ?? {};
    const items: any[] = invoice.itemList ?? [];

    return (
        <DetailLayout
            title="Invoice Detail"
            backLink={{ label: "Invoice Report", href: "/dashboard/invoices" }}
        >
            <div className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleVerify}
                            disabled={processing || invoice.status !== "REGISTERED"}
                            variant="secondary"
                            className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-100 font-bold rounded-xl"
                        >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Verify MOR
                        </Button>
                        <Button
                            onClick={handleReceipt}
                            disabled={processing || (invoice.status !== "VERIFIED" && invoice.status !== "REGISTERED")}
                            variant="secondary"
                            className="bg-white hover:bg-blue-50 text-blue-700 border-blue-100 font-bold rounded-xl"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Generate Receipt
                        </Button>
                        <Button
                            onClick={handleCancel}
                            disabled={processing || invoice.status === "CANCELLED" || invoice.status === "FAILED"}
                            variant="secondary"
                            className="bg-white hover:bg-rose-50 text-rose-700 border-rose-100 font-bold rounded-xl"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Invoice
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => {
                            window.print();
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl"
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Formal
                    </Button>
                    <Button
                        onClick={downloadPDF}
                        disabled={processing}
                        className="bg-primary hover:opacity-90 font-black rounded-xl shadow-lg shadow-primary/20"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                    </Button>
                </div>

                <div ref={printRef} className="space-y-6 bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-50">
                    {/* Header Info */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">INVOICE</h1>
                                <StatusBadge status={invoice.status} />
                            </div>
                            <p className="text-sm font-medium text-slate-500">
                                Registration Number: <span className="font-mono text-slate-900">{invoice.irn || "NOT_ASSIGNED"}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            {invoice.qrCode && (
                                <div className="bg-white p-3 border border-slate-100 rounded-2xl shadow-sm inline-block">
                                    <img src={invoice.qrCode} alt="MOR QR Code" className="w-32 h-32" />
                                    <p className="text-[8px] font-black text-slate-400 mt-2 uppercase text-center tracking-widest">Signed by MOR</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Core Fields */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                General Information
                            </h2>
                            <DetailRow
                                label="Invoice ID"
                                value={<span className="font-mono">{invoice.invoiceCounter}</span>}
                            />
                            <DetailRow label="Seller TIN" value={invoice.sellerTin || seller.Tin} />
                            <DetailRow label="Buyer TIN" value={invoice.buyerTin || buyer.Tin} />
                            <DetailRow label="Transaction" value={invoice.transactionType} />
                            <DetailRow
                                label="Created At"
                                value={
                                    invoice.createdAt
                                        ? format(new Date(invoice.createdAt), "dd MMM yyyy, HH:mm")
                                        : "—"
                                }
                            />
                            {invoice.receipt?.receiptNumber && (
                                <DetailRow
                                    label="Receipt Ref"
                                    value={
                                        <div className="flex flex-col items-end">
                                            <span className="text-blue-600">{invoice.receipt.receiptNumber}</span>
                                            <span className="text-[10px] text-slate-400">{invoice.receipt.receiptDate}</span>
                                        </div>
                                    }
                                />
                            )}
                        </div>

                        {/* Summary Stats */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Financial Summary
                            </h2>
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Amount</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {val.TotalValue?.toLocaleString()} <span className="text-xs text-slate-400">{val.InvoiceCurrency}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tax (15%)</p>
                                    <p className="text-2xl font-black text-indigo-600">
                                        {val.TaxValue?.toLocaleString()} <span className="text-xs text-slate-400">{val.InvoiceCurrency}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <CollapsibleSection title="Buyer Details" icon={User} defaultOpen>
                            <div className="space-y-0 text-left">
                                <DetailRow label="Name" value={buyer.LegalName} />
                                <DetailRow label="TIN" value={buyer.Tin} />
                                <DetailRow label="VAT" value={buyer.VatNumber} />
                                <DetailRow label="Phone" value={buyer.Phone} />
                                <DetailRow label="Email" value={buyer.Email} />
                                <DetailRow label="Address" value={`${buyer.Region}, ${buyer.City}, ${buyer.Wereda}`} />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Seller Details" icon={Building2} defaultOpen>
                            <div className="space-y-0 text-left">
                                <DetailRow label="Name" value={seller.LegalName} />
                                <DetailRow label="TIN" value={seller.Tin} />
                                <DetailRow label="VAT" value={seller.VatNumber} />
                                <DetailRow label="Phone" value={seller.Phone} />
                                <DetailRow label="Email" value={seller.Email} />
                                <DetailRow label="Address" value={`${seller.Region}, ${seller.City}, ${seller.Wereda}`} />
                            </div>
                        </CollapsibleSection>
                    </div>

                    {/* Items Table */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-4 font-bold text-slate-700">{item.LineNumber}</td>
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-slate-900">{item.ProductDescription}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{item.ItemCode}</p>
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium">{item.Quantity} {item.Unit}</td>
                                        <td className="px-4 py-4 text-right font-medium">{item.UnitPrice?.toLocaleString()}</td>
                                        <td className="px-4 py-4 text-right font-bold text-indigo-500">{item.TaxAmount?.toLocaleString()}</td>
                                        <td className="px-4 py-4 text-right font-black text-slate-900">{item.TotalLineAmount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Notes */}
                    <div className="pt-8 flex justify-between items-end border-t border-slate-100">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Compliance</p>
                            <div className="flex items-center gap-2 text-emerald-500">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-xs font-bold">MOR Regulated Transaction</span>
                            </div>
                        </div>
                        <div className="text-right space-y-2">
                            <div className="flex items-center justify-end gap-10">
                                <span className="text-sm font-black text-slate-400 uppercase">Subtotal</span>
                                <span className="text-lg font-bold text-slate-700">{val.TotalValue - val.TaxValue}</span>
                            </div>
                            <div className="flex items-center justify-end gap-10">
                                <span className="text-sm font-black text-indigo-400 uppercase">Tax (15%)</span>
                                <span className="text-lg font-bold text-indigo-600">{val.TaxValue}</span>
                            </div>
                            <div className="flex items-center justify-end gap-10 pt-2 border-t border-slate-100">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Amount Due</span>
                                <span className="text-2xl font-black text-primary">{val.TotalValue?.toLocaleString()} {val.InvoiceCurrency}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hidden Printable Invoice for PDF generation and browser printing */}
                <div className="hidden-print" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <PrintableInvoice ref={printableRef} invoice={invoice} />
                </div>

                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .hidden-print, .hidden-print * {
                            visibility: visible;
                        }
                        .hidden-print {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: auto;
                            margin: 0;
                            padding: 0;
                        }
                    }
                `}</style>

                {/* Developer / Raw Data section (remains collapsible outside print) */}
                <div className="mt-8">
                    <CollapsibleSection title="Developer Tool: Raw Data" icon={Cpu}>
                        <div className="bg-slate-900 rounded-2xl p-6 overflow-x-auto">
                            <pre className="text-[10px] text-emerald-400 font-mono">
                                {JSON.stringify(invoice, null, 2)}
                            </pre>
                        </div>
                    </CollapsibleSection>
                </div>
            </div>
        </DetailLayout >
    );
}
