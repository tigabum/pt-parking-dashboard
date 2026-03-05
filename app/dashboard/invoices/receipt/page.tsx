"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/auth-context";
import { PageHeader } from "@/components/layouts/page-header";
import {
    Search,
    RefreshCw,
    Printer,
    Loader2,
    CheckCircle2,
    XCircle,
    QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invoiceService } from "@/lib/services/invoice-service";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function ReceiptPage() {
    const { user } = useAuth();
    const parkingId = user?.orgId;
    const router = useRouter();

    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [generating, setGenerating] = useState<string | null>(null);

    const loadInvoices = async () => {
        if (!parkingId) return;
        setLoading(true);
        try {
            const data = await invoiceService.getHistory(parkingId);
            // Only show invoices eligible for receipt: REGISTERED or VERIFIED, with IRN
            setInvoices((data || []).filter((inv: any) =>
                (inv.status === "REGISTERED" || inv.status === "VERIFIED") && inv.irn
            ));
        } catch (e) {
            toast.error("Failed to load invoices");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadInvoices(); }, [parkingId]);

    const handleGenerate = async (invoice: any) => {
        setGenerating(invoice.id);
        const t = toast.loading("Generating receipt...");
        try {
            await invoiceService.generateReceipt(invoice.id);
            toast.success("Receipt generated successfully", { id: t });
            loadInvoices();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Receipt generation failed", { id: t });
        } finally {
            setGenerating(null);
        }
    };

    const filtered = invoices.filter((inv) =>
        inv.irn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.buyerTin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.buyerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Sales Receipt"
                description="Generate MOR-compliant sales receipts for registered and verified invoices."
            >
                <div className="flex items-center gap-3 mt-2">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by IRN or Buyer TIN..."
                            className="pl-10 h-11 rounded border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={loadInvoices} variant="ghost" size="icon" className="h-11 w-11 rounded border hover:bg-white">
                        <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-primary/10">
                                {["#", "IRN", "Buyer TIN", "Buyer Name", "Total Amount", "Status", "Date", "Actions"].map((h) => (
                                    <th key={h} className="px-4 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-sm text-slate-400 italic">
                                        No invoices eligible for receipt generation
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((inv, idx) => (
                                    <tr
                                        key={inv.id}
                                        className="hover:bg-primary/5 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                                    >
                                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{inv.invoiceCounter ?? idx + 1}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-500 max-w-[180px] truncate">{inv.irn}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-blue-600 font-bold">{inv.buyerTin ?? "—"}</td>
                                        <td className="px-4 py-3 text-xs font-medium text-slate-800">{inv.buyerName ?? "—"}</td>
                                        <td className="px-4 py-3 text-xs font-black text-emerald-700">
                                            ETB {Number(inv.totalAmount).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[11px] font-bold ${inv.status === "VERIFIED" ? "text-indigo-600" : "text-emerald-600"}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {inv.createdAt ? format(new Date(inv.createdAt), "dd MMM yyyy") : "—"}
                                        </td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                onClick={() => handleGenerate(inv)}
                                                disabled={generating === inv.id}
                                                className="h-8 px-4 rounded-lg font-bold text-xs gap-1.5"
                                            >
                                                {generating === inv.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Printer className="h-3.5 w-3.5" />
                                                )}
                                                Generate
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
