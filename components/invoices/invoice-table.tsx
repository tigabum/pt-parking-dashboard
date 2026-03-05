"use client";
import { Column } from "@/components/tables";
import { format } from "date-fns";
import {
    MoreVertical,
    ShieldCheck,
    Printer,
    XCircle,
    Eye,
    CheckCircle2,
    Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

type Props = {
    invoices: any[];
    loading?: boolean;
    onVerify: (invoice: any) => void;
    onGenerate: (invoice: any) => void;
    onCancel: (invoice: any) => void;
    onViewPayload: (invoice: any) => void;
    onWithhold: (invoice: any) => void;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case "REGISTERED":
        case "Active":
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    Active
                </span>
            );
        case "VERIFIED":
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                    Verified
                </span>
            );
        case "CANCELLED":
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                    Cancelled
                </span>
            );
        case "FAILED":
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                    Failed
                </span>
            );
        default:
            return (
                <span className="text-[11px] font-bold text-slate-500">{status}</span>
            );
    }
};

// Map our internal status to display label
const mapStatus = (status: string) => {
    if (status === "REGISTERED") return "Active";
    return status;
};

export function InvoiceTable({
    invoices,
    loading,
    onVerify,
    onGenerate,
    onCancel,
    onViewPayload,
    onWithhold,
}: Props) {
    const router = useRouter();

    const columns: Column<any>[] = [
        {
            key: "id",
            header: "Id",
            render: (row) => (
                <span className="text-[12px] font-bold text-slate-700">
                    {row.invoiceCounter ?? row.id?.substring(0, 6) ?? "—"}
                </span>
            ),
        },
        {
            key: "transactionType",
            header: "Transaction Type",
            render: (row) => (
                <span className="text-[12px] font-semibold text-slate-600">
                    {row.transactionType ?? "B2B"}
                </span>
            ),
        },
        {
            key: "sellerTin",
            header: "Seller TIN",
            render: (row) => (
                <span className="text-[12px] font-mono text-slate-700">
                    {row.sellerTin ?? row.sellerDetails?.Tin ?? row.tin ?? "—"}
                </span>
            ),
        },
        {
            key: "buyerTin",
            header: "Buyer TIN",
            render: (row) => (
                <span className="text-[12px] font-mono text-blue-600 font-bold">
                    {row.buyerTin ?? row.buyerDetails?.Tin ?? "—"}
                </span>
            ),
        },
        {
            key: "sellerPhone",
            header: "Seller Phone",
            render: (row) => (
                <span className="text-[12px] text-slate-600">
                    {row.sellerPhone ?? row.sellerDetails?.Phone ?? row.phoneNumber ?? "—"}
                </span>
            ),
        },
        {
            key: "sellerRegion",
            header: "Seller Region",
            render: (row) => (
                <span className="text-[12px] text-slate-700 font-bold">
                    {row.sellerRegion ?? row.sellerDetails?.Region ?? row.region ?? "—"}
                </span>
            ),
        },
        {
            key: "sellerVat",
            header: "Seller VAT",
            render: (row) => (
                <span className="text-[12px] font-mono text-amber-700">
                    {row.sellerVat ?? row.sellerDetails?.VatNumber ?? row.vatNumber ?? "—"}
                </span>
            ),
        },
        {
            key: "mark",
            header: "Mark",
            className: "text-center",
            render: (row) => (
                <span className="text-[12px] text-slate-400">
                    {row.irn ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                    ) : (
                        <span className="text-slate-300">-</span>
                    )}
                </span>
            ),
        },
        {
            key: "status",
            header: "Status",
            render: (row) => getStatusBadge(mapStatus(row.status)),
        },
        {
            key: "actions",
            header: "",
            className: "text-center w-10",
            render: (row) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 rounded">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] rounded-xl shadow-xl border-slate-100 p-2">
                            <DropdownMenuItem
                                onClick={() => onVerify(row)}
                                disabled={row.status !== "REGISTERED"}
                                className="rounded-lg font-bold gap-3 py-2.5 cursor-pointer"
                            >
                                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                                <span>Verify MOR</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onGenerate(row)}
                                disabled={row.status !== "VERIFIED" && row.status !== "REGISTERED"}
                                className="rounded-lg font-bold gap-3 py-2.5 cursor-pointer"
                            >
                                <Printer className="h-4 w-4 text-primary" />
                                <span>Generate Receipt</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onWithhold(row)}
                                disabled={row.status === "CANCELLED" || row.status === "FAILED"}
                                className="rounded-lg font-bold gap-3 py-2.5 cursor-pointer"
                            >
                                <Briefcase className="h-4 w-4 text-orange-500" />
                                <span>Withhold Tax</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                                onClick={() => onViewPayload(row)}
                                className="rounded-lg font-bold gap-3 py-2.5 cursor-pointer"
                            >
                                <Eye className="h-4 w-4 text-slate-400" />
                                <span>View Data</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                                onClick={() => onCancel(row)}
                                disabled={row.status === "CANCELLED" || row.status === "FAILED"}
                                className="rounded-lg font-bold gap-3 py-2.5 cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                            >
                                <XCircle className="h-4 w-4" />
                                <span>Cancel Invoice</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    return (
        <div className="overflow-hidden bg-white rounded border border-slate-100 shadow">
            <div className="w-full overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-100/50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-3 md:px-6 py-4 md:py-5 text-left text-[10px] md:text-xs font-extrabold text-foreground uppercase tracking-widest border-b-2 border-primary/10 whitespace-nowrap"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying MOR ledger...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : invoices.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm font-medium text-slate-400 italic">
                                    No invoice records found
                                </td>
                            </tr>
                        ) : (
                            invoices.map((row, index) => (
                                <tr
                                    key={row.id}
                                    onClick={() => router.push(`/dashboard/invoices/${row.id}`)}
                                    className="hover:bg-primary/5 transition-colors group even:bg-slate-50/50 cursor-pointer"
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-3 md:px-6 py-3 md:py-4 text-[11px] md:text-sm font-medium text-slate-700 whitespace-nowrap">
                                            {col.render ? col.render(row, index) : (row as any)[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
