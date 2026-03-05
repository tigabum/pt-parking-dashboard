"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/app/context/auth-context";
import { PageHeader } from "@/components/layouts/page-header";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { invoiceService } from "@/lib/services/invoice-service";

type UploadStatus = "idle" | "parsing" | "registering" | "done" | "error";

interface ParsedInvoice {
    buyerName: string;
    buyerTin: string;
    buyerEmail: string;
    transactionType: string;
    preTaxAmount: number;
    taxAmount: number;
    productDescription: string;
    status?: "pending" | "success" | "failed";
    error?: string;
}

export default function InvoiceUploadPage() {
    const { user } = useAuth();
    const parkingId = user?.orgId;

    const [file, setFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedInvoice[]>([]);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFileSelect(dropped);
    };

    const handleFileSelect = (f: File) => {
        if (!f.name.endsWith(".csv") && !f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
            toast.error("Please upload a CSV or Excel (.xlsx / .xls) file");
            return;
        }
        setFile(f);
        parseFile(f);
    };

    const parseFile = async (f: File) => {
        setUploadStatus("parsing");
        // For CSV parsing
        if (f.name.endsWith(".csv")) {
            const text = await f.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
            const rows: ParsedInvoice[] = lines.slice(1).map((line) => {
                const vals = line.split(",").map((v) => v.trim());
                const get = (key: string) => vals[headers.indexOf(key)] ?? "";
                return {
                    buyerName: get("buyername") || get("buyer_name") || get("buyer name"),
                    buyerTin: get("buyertin") || get("buyer_tin") || get("tin"),
                    buyerEmail: get("buyeremail") || get("buyer_email") || get("email") || "",
                    transactionType: (get("transactiontype") || get("type") || "B2B").toUpperCase(),
                    preTaxAmount: parseFloat(get("pretaxamount") || get("amount") || "0"),
                    taxAmount: parseFloat(get("taxamount") || get("tax") || "0"),
                    productDescription: get("productdescription") || get("description") || "Service",
                    status: "pending",
                };
            }).filter((r) => r.buyerTin);
            setParsedRows(rows);
        } else {
            // For xlsx: show a message that xlsx parsing requires a library
            toast.info("Excel files: please use CSV format or contact support for Excel-based uploads.");
            // Still set a placeholder to indicate we received the file
            setParsedRows([]);
        }
        setUploadStatus("idle");
    };

    const handleRegisterAll = async () => {
        if (!parkingId || parsedRows.length === 0) return;
        setUploadStatus("registering");

        const updated = [...parsedRows];
        for (let i = 0; i < updated.length; i++) {
            const row = updated[i];
            try {
                const firstItemPreTax = row.preTaxAmount;
                const payload = {
                    parkingId,
                    TransactionType: row.transactionType,
                    BuyerDetails: {
                        IdType: "KID",
                        City: "101",
                        Email: row.buyerEmail,
                        HouseNumber: "101",
                        LegalName: row.buyerName,
                        Phone: "+251913654171",
                        Region: "1",
                        Tin: row.buyerTin,
                        VatNumber: "43256663343256663322",
                        Wereda: "13",
                    },
                    ItemList: [
                        {
                            PreTaxValue: firstItemPreTax,
                            TaxAmount: row.taxAmount,
                            TotalLineAmount: firstItemPreTax + row.taxAmount,
                            UnitPrice: firstItemPreTax,
                            ProductDescription: row.productDescription,
                            Quantity: 1,
                            Unit: "PCS",
                            ItemCode: "1111",
                            TaxCode: "VAT15",
                            NatureOfSupplies: "goods",
                            Discount: 0,
                            ExciseTaxValue: 0,
                        },
                    ],
                };
                await invoiceService.registerInvoice(payload);
                updated[i] = { ...row, status: "success" };
            } catch (err: any) {
                updated[i] = {
                    ...row,
                    status: "failed",
                    error: err.response?.data?.message || "Registration failed",
                };
            }
            setParsedRows([...updated]);
        }
        setUploadStatus("done");
        const successCount = updated.filter((r) => r.status === "success").length;
        toast.success(`Batch complete: ${successCount}/${updated.length} invoices registered`);
    };

    const clearFile = () => {
        setFile(null);
        setParsedRows([]);
        setUploadStatus("idle");
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Upload & Register Invoices"
                description="Upload a CSV file with invoice data to batch-register with MOR CORE API."
            />

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${dragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-slate-200 bg-slate-50/50 hover:border-primary/50 hover:bg-primary/[0.02]"
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                    }}
                />
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                    <p className="font-black text-slate-800 text-lg">
                        {file ? file.name : "Drop your CSV file here"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {file
                            ? `${(file.size / 1024).toFixed(1)} KB — ${parsedRows.length} rows parsed`
                            : "Supports .csv, .xlsx, .xls — Click or drag to upload"}
                    </p>
                </div>
                {!file && (
                    <Button variant="outline" className="border-primary text-primary font-bold">
                        <Upload className="h-4 w-4 mr-2" /> Browse Files
                    </Button>
                )}
            </div>

            {/* CSV Template hint */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-800 text-sm font-medium">
                <strong>Expected CSV columns:</strong>{" "}
                <code className="text-xs bg-amber-100 px-1 rounded">buyerName, buyerTin, buyerEmail, transactionType, preTaxAmount, taxAmount, productDescription</code>
            </div>

            {/* Parsed Preview */}
            {parsedRows.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 className="font-black text-slate-800">
                            Preview — {parsedRows.length} Invoices
                        </h3>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFile}
                                className="text-slate-400 hover:text-slate-700"
                            >
                                <X className="h-4 w-4 mr-1.5" /> Clear
                            </Button>
                            <Button
                                onClick={handleRegisterAll}
                                disabled={uploadStatus === "registering" || uploadStatus === "done"}
                                className="font-black px-6 rounded-xl bg-primary"
                            >
                                {uploadStatus === "registering" ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                {uploadStatus === "registering"
                                    ? "Registering..."
                                    : uploadStatus === "done"
                                        ? "Done"
                                        : "Register All"}
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    {["#", "Buyer Name", "Buyer TIN", "Type", "Pre-Tax", "Tax", "Description", "Status"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-100">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {parsedRows.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-xs text-slate-500">{i + 1}</td>
                                        <td className="px-4 py-3 text-xs font-medium text-slate-800">{row.buyerName}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-blue-600">{row.buyerTin}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{row.transactionType}</td>
                                        <td className="px-4 py-3 text-xs text-slate-700">{row.preTaxAmount.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-xs text-slate-700">{row.taxAmount.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{row.productDescription}</td>
                                        <td className="px-4 py-3">
                                            {row.status === "success" ? (
                                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Registered
                                                </span>
                                            ) : row.status === "failed" ? (
                                                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600" title={row.error}>
                                                    <AlertCircle className="h-3.5 w-3.5" /> Failed
                                                </span>
                                            ) : row.status === "pending" ? (
                                                <span className="text-[11px] font-bold text-slate-400">Pending</span>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
