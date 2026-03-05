"use client";
import {
    ReusableTable,
    indexColumn,
    statusColumn,
    Column,
} from "@/components/tables";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
    FileText,
    MoreVertical,
    ShieldCheck,
    Printer,
    XCircle,
    Eye,
    History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type Props = {
    invoices: any[];
    loading?: boolean;
    onVerify: (invoice: any) => void;
    onGenerate: (invoice: any) => void;
    onCancel: (invoice: any) => void;
    onViewPayload: (invoice: any) => void;
};

export function InvoiceTable({
    invoices,
    loading,
    onVerify,
    onGenerate,
    onCancel,
    onViewPayload,
}: Props) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "REGISTERED":
                return <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold uppercase text-[9px]">Registered</Badge>;
            case "VERIFIED":
                return <Badge className="bg-indigo-500 hover:bg-indigo-600 font-bold uppercase text-[9px]">Verified</Badge>;
            case "CANCELLED":
                return <Badge className="bg-rose-500 hover:bg-rose-600 font-bold uppercase text-[9px]">Cancelled</Badge>;
            case "FAILED":
                return <Badge className="bg-amber-500 hover:bg-amber-600 font-bold uppercase text-[9px]">Failed</Badge>;
            default:
                return <Badge className="bg-slate-400 font-bold uppercase text-[9px]">{status}</Badge>;
        }
    };

    const columns: Column<any>[] = [
        {
            key: "document",
            header: "Document Details",
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                        <FileText size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 leading-tight">
                            {row.irn ? (
                                <span className="truncate max-w-[200px]" title={row.irn}>
                                    {row.irn.substring(0, 15)}...
                                </span>
                            ) : "NOT_ASSIGNED"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase font-bold">
                            ID: {row.id.substring(0, 8)} | CTR: {row.invoiceCounter || "—"}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: "amount",
            header: "Value (ETB)",
            className: "text-right",
            render: (row) => (
                <div className="flex flex-col items-end">
                    <span className="font-bold text-slate-900">
                        {Number(row.totalAmount || 0).toLocaleString()}
                    </span>
                    <span className="text-[9px] font-black uppercase text-secondary">
                        Tax: {Number(row.taxAmount || 0).toLocaleString()}
                    </span>
                </div>
            )
        },
        {
            key: "type",
            header: "Type",
            render: (row) => (
                <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest bg-slate-50 border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">
                    {row.transactionType}
                </Badge>
            ),
        },
        {
            key: "timestamp",
            header: "Timestamp",
            render: (row) => (
                <div className="flex flex-col text-[11px] font-medium text-slate-500 uppercase">
                    <span>{format(new Date(row.createdAt), "dd MMM yyyy")}</span>
                    <span className="text-slate-300">{format(new Date(row.createdAt), "HH:mm:ss")}</span>
                </div>
            )
        },
        {
            key: "status",
            header: "Status",
            className: "text-center",
            render: (row) => getStatusBadge(row.status),
        },
        {
            key: "actions",
            header: "Actions",
            className: "text-center",
            render: (row) => (
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
                            <span>Generate Invoice</span>
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
            ),
        },
    ];

    return (
        <ReusableTable
            data={invoices}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={loading}
            emptyText={loading ? "Querying MOR ledger..." : "No invoice records found"}
        />
    );
}
