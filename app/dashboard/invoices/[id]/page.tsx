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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const data = await invoiceService.getById(id);
                setInvoice(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

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
                {/* Top Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Core Fields */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-3">
                        <h2 className="text-base font-black text-slate-800 mb-4">Invoice Details</h2>
                        <DetailRow
                            label="Invoice Registration Number"
                            value={
                                <span className="font-mono text-[11px] break-all text-slate-700">
                                    {invoice.irn ?? "—"}
                                </span>
                            }
                        />
                        <DetailRow label="Seller TIN" value={invoice.sellerTin ?? seller.Tin ?? "—"} />
                        <DetailRow label="Buyer TIN" value={invoice.buyerTin ?? buyer.Tin ?? "—"} />
                        <DetailRow
                            label="Status"
                            value={<StatusBadge status={invoice.status} />}
                        />
                        <DetailRow
                            label="Marked"
                            value={invoice.irn ? "Yes" : "No"}
                        />
                        <DetailRow
                            label="Transaction Type"
                            value={invoice.transactionType}
                        />
                        <DetailRow
                            label="Invoice Counter"
                            value={invoice.invoiceCounter}
                        />
                        <DetailRow
                            label="Created At"
                            value={
                                invoice.createdAt
                                    ? format(new Date(invoice.createdAt), "dd MMM yyyy, HH:mm")
                                    : "—"
                            }
                        />
                        {invoice.receiptNumber && (
                            <DetailRow label="Receipt Number" value={invoice.receiptNumber} />
                        )}
                    </div>

                    {/* Right: Collapsible Sections */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                        <CollapsibleSection title="Buyer Detail" icon={User}>
                            <div className="space-y-0">
                                <DetailRow label="Legal Name" value={buyer.LegalName} />
                                <DetailRow label="TIN" value={buyer.Tin} />
                                <DetailRow label="VAT Number" value={buyer.VatNumber} />
                                <DetailRow label="Phone" value={buyer.Phone} />
                                <DetailRow label="Email" value={buyer.Email} />
                                <DetailRow label="Region" value={buyer.Region} />
                                <DetailRow label="City" value={buyer.City} />
                                <DetailRow label="Wereda" value={buyer.Wereda} />
                                <DetailRow label="House Number" value={buyer.HouseNumber} />
                                <DetailRow label="Sub City" value={buyer.SubCity} />
                                <DetailRow label="Locality" value={buyer.Locality} />
                                <DetailRow label="ID Type" value={buyer.IdType} />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Seller Detail" icon={Building2} defaultOpen>
                            <div className="space-y-0">
                                <DetailRow label="Legal Name" value={seller.LegalName} />
                                <DetailRow label="TIN" value={seller.Tin} />
                                <DetailRow label="VAT Number" value={seller.VatNumber} />
                                <DetailRow label="Phone" value={seller.Phone} />
                                <DetailRow label="Email" value={seller.Email} />
                                <DetailRow label="Region" value={seller.Region} />
                                <DetailRow label="City" value={seller.City} />
                                <DetailRow label="Wereda" value={seller.Wereda} />
                                <DetailRow label="House Number" value={seller.HouseNumber} />
                                <DetailRow label="Sub City" value={seller.SubCity} />
                                <DetailRow label="Locality" value={seller.Locality} />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Documents Detail" icon={FileText}>
                            <div className="space-y-0">
                                <DetailRow label="Document Number" value={doc.DocumentNumber} />
                                <DetailRow label="Date" value={doc.Date} />
                                <DetailRow label="Type" value={doc.Type} />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Payment Detail" icon={CreditCard}>
                            <div className="space-y-0">
                                <DetailRow label="Mode" value={payment.Mode} />
                                <DetailRow label="Payment Term" value={payment.PaymentTerm} />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Reference Detail" icon={Link2}>
                            <div className="space-y-0">
                                <DetailRow label="Previous IRN" value={ref.PreviousIrn || "—"} />
                                <DetailRow
                                    label="Related Document"
                                    value={
                                        ref.RelatedDocument
                                            ? JSON.stringify(ref.RelatedDocument)
                                            : "—"
                                    }
                                />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Source System Details" icon={Cpu}>
                            <div className="space-y-0">
                                <DetailRow label="System Number" value={src.SystemNumber} />
                                <DetailRow label="System Type" value={src.SystemType} />
                                <DetailRow label="Invoice Counter" value={src.InvoiceCounter} />
                                <DetailRow label="Cashier Name" value={src.CashierName} />
                                <DetailRow label="Sales Person" value={src.SalesPersonName} />
                            </div>
                        </CollapsibleSection>
                    </div>
                </div>

                {/* Value Summary */}
                {Object.keys(val).length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                        <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-slate-400" />
                            Value Details
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Total Value", value: val.TotalValue, currency: val.InvoiceCurrency },
                                { label: "Tax Value", value: val.TaxValue, currency: val.InvoiceCurrency },
                                { label: "Excise Value", value: val.ExciseValue, currency: val.InvoiceCurrency },
                                { label: "Income Withhold", value: val.IncomeWithholdValue, currency: val.InvoiceCurrency },
                                { label: "Txn Withhold", value: val.TransactionWithholdValue, currency: val.InvoiceCurrency },
                                { label: "Discount", value: val.Discount, currency: val.InvoiceCurrency },
                                { label: "Currency", value: val.InvoiceCurrency },
                            ].map((item) => (
                                <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className="text-lg font-black text-slate-900">
                                        {item.currency && item.value !== undefined
                                            ? `${item.currency} ${Number(item.value ?? 0).toLocaleString()}`
                                            : item.value ?? "—"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Items Table */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-400" />
                            Items
                        </h2>
                        <span className="text-xs text-slate-400 font-medium">{items.length} item(s)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    {[
                                        "Serial No",
                                        "Harmonization Code",
                                        "Nature of Supplies",
                                        "Product Description",
                                        "Item Code",
                                        "Unit",
                                        "Quantity",
                                        "Unit Price",
                                        "Pre Tax Value",
                                        "Tax Code",
                                        "Tax Amount",
                                        "Discount",
                                        "Excise Tax Amount",
                                        "Total Amount",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-100"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="px-6 py-10 text-center text-sm text-slate-400 italic">
                                            No items
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.LineNumber ?? idx + 1}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{item.HarmonizationCode ?? "—"}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{item.NatureOfSupplies}</td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-800">{item.ProductDescription}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-600">{item.ItemCode}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{item.Unit}</td>
                                            <td className="px-4 py-3 text-xs text-slate-700">{item.Quantity}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-800">{Number(item.UnitPrice).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-xs text-slate-700">{Number(item.PreTaxValue).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-600">{item.TaxCode}</td>
                                            <td className="px-4 py-3 text-xs text-slate-700">{Number(item.TaxAmount).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{item.Discount ?? 0}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{item.ExciseTaxValue ?? 0}</td>
                                            <td className="px-4 py-3 text-xs font-black text-emerald-600">{Number(item.TotalLineAmount).toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* QR Code (if available) */}
                {invoice.qrCode && (
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
                        <h2 className="text-base font-black text-slate-800">QR Code</h2>
                        {invoice.qrCode.startsWith("data:image") ? (
                            <img src={invoice.qrCode} alt="Invoice QR Code" className="w-48 h-48" />
                        ) : (
                            <p className="font-mono text-xs text-slate-500 break-all max-w-sm text-center">{invoice.qrCode}</p>
                        )}
                    </div>
                )}
            </div>
        </DetailLayout>
    );
}
