"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/auth-context";
import { PageHeader } from "@/components/layouts/page-header";
import {
    Search,
    RefreshCw,
    Printer,
    Loader2,
    SlidersHorizontal,
    X,
    ChevronLeft,
    ChevronRight,
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

    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    // Filters
    const [rrn, setRrn] = useState("");
    const [receiptType, setReceiptType] = useState("");
    const [sellerTin, setSellerTin] = useState("");

    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    const loadReceipts = async () => {
        if (!parkingId) return;
        setLoading(true);
        try {
            const response = await invoiceService.getReceipts(parkingId, {
                page,
                limit: 10,
                rrn,
                type: receiptType,
                sellerTin
            });
            setReceipts(response.data || []);
            setTotal(response.total || 0);
        } catch (e) {
            toast.error("Failed to load receipts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReceipts(); }, [parkingId, page]);

    const handleSearch = () => {
        setPage(1);
        loadReceipts();

        const filters = [];
        if (rrn) filters.push(rrn);
        if (receiptType) filters.push(receiptType);
        if (sellerTin) filters.push(sellerTin);
        setActiveFilters(filters);
    };

    const clearFilters = () => {
        setRrn("");
        setReceiptType("");
        setSellerTin("");
        setActiveFilters([]);
        setPage(1);
        // We'll let the effect or manual call handle reload
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500 bg-slate-50/30 min-h-screen">
            {/* Search Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6">Search</h2>

                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[300px] space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">RRN</label>
                        <Input
                            value={rrn}
                            onChange={(e) => setRrn(e.target.value)}
                            placeholder="Enter RRN"
                            className="h-11 border-blue-400 focus-visible:ring-blue-400 rounded-lg font-mono text-sm"
                        />
                    </div>

                    <div className="w-64 space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Receipt Type</label>
                        <Input
                            value={receiptType}
                            onChange={(e) => setReceiptType(e.target.value)}
                            placeholder="Enter Receipt Type"
                            className="h-11 border-slate-200 rounded-lg text-sm"
                        />
                    </div>

                    <div className="w-64 space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Seller TIN</label>
                        <Input
                            value={sellerTin}
                            onChange={(e) => setSellerTin(e.target.value)}
                            placeholder="Enter Seller TIN"
                            className="h-11 border-slate-200 rounded-lg text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSearch}
                            className="h-11 w-11 bg-primary hover:opacity-90 rounded-lg p-0"
                        >
                            <Search className="h-5 w-5 text-white" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 w-11 border-slate-200 rounded-lg p-0"
                        >
                            <SlidersHorizontal className="h-5 w-5 text-slate-500" />
                        </Button>
                    </div>
                </div>

                {activeFilters.length > 0 && (
                    <div className="flex items-center gap-2 mt-6 flex-wrap">
                        {activeFilters.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                                {f}
                                <button className="hover:text-orange-900"><X className="h-3.5 w-3.5" /></button>
                            </div>
                        ))}
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-2 text-orange-600 hover:text-orange-800 text-sm font-bold ml-2 bg-orange-50 px-3 py-1.5 rounded-lg"
                        >
                            Clear All <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Invoices Table Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 flex items-center justify-between border-b border-slate-100">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Invoices</h2>

                    <div className="flex items-center gap-6">
                        <Button variant="outline" className="h-10 border-slate-200 rounded-lg gap-2 font-bold text-slate-600">
                            Columns <ChevronLeft className="h-4 w-4 rotate-270 translate-y-0.5" />
                        </Button>

                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                            <span>Showing: {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} of {total}</span>
                            <div className="flex items-center gap-1">
                                <Button
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 font-bold text-slate-600"
                                >
                                    Previous
                                </Button>
                                <div className="bg-primary text-white h-7 w-7 flex items-center justify-center rounded-md font-bold text-[11px]">
                                    {page}
                                </div>
                                <Button
                                    disabled={page * 10 >= total}
                                    onClick={() => setPage(page + 1)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 font-bold text-slate-600"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {[
                                    "Receipt Number", "Receipt Type", "Receipt Date", "Receipt Counter",
                                    "Manual Receipt Number", "Receipt Currency", "Seller TIN", "Exchange Rate"
                                ].map((h) => (
                                    <th key={h} className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : receipts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-400 italic font-medium">
                                        No generated receipts found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                receipts.map((rec) => (
                                    <tr
                                        key={rec.id}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                        onClick={() => router.push(`/dashboard/invoices/${rec.invoiceId}`)}
                                    >
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600 font-bold group-hover:text-primary">{rec.receiptNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 text-xs">{rec.receiptType}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {rec.receiptDate ? format(new Date(rec.receiptDate), "MMM dd, yyyy, hh:mm a") : "—"}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{rec.receiptCounter}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{rec.manualReceiptNumber}</td>
                                        <td className="px-6 py-4 font-black text-slate-900 text-xs">{rec.receiptCurrency}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{rec.sellerTin}</td>
                                        <td className="px-6 py-4 text-xs text-slate-400 italic">{rec.exchangeRate || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx global>{`
                .rotate-270 { transform: rotate(90deg); }
            `}</style>
        </div>
    );
}
