"use client";

import { useEffect, useState } from "react";
import { walletService } from "@/lib/services/wallet-service";
import { ReusableTable, Column } from "@/components/tables";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Wallet, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
    id: string;
    amount: string;
    type: "CREDIT" | "DEBIT";
    description: string;
    createdAt: string;
}

interface WalletTransactionsProps {
    parkingId: string;
}

export function WalletTransactions({ parkingId }: WalletTransactionsProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (parkingId) {
            loadTransactions();
        }
    }, [parkingId]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const res = await walletService.getTransactions(parkingId);
            if (res && res.success) {
                setTransactions(res.data || []);
            }
        } catch (error) {
            console.error("Failed to load transactions", error);
        } finally {
            setLoading(false);
        }
    };

    const columns: Column<Transaction>[] = [
        {
            key: "type",
            header: "Type",
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        row.type === "CREDIT" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                        {row.type === "CREDIT" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </div>
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        row.type === "CREDIT" ? "text-emerald-600" : "text-red-700"
                    )}>
                        {row.type}
                    </span>
                </div>
            ),
        },
        {
            key: "amount",
            header: "Amount",
            render: (row) => (
                <span className={cn(
                    "font-black text-base",
                    row.type === "CREDIT" ? "text-emerald-600" : "text-slate-900"
                )}>
                    {row.type === "CREDIT" ? "+" : "-"}{Number(row.amount).toLocaleString()} ETB
                </span>
            ),
        },
        {
            key: "description",
            header: "Description",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{row.description || "No description"}</span>
                </div>
            ),
        },
        {
            key: "createdAt",
            header: "Date",
            render: (row) => (
                <span className="text-xs font-semibold text-slate-400">
                    {format(new Date(row.createdAt), "MMM d, yyyy HH:mm")}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                    <History className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-base font-black text-slate-900">Recent Activity</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Transaction log for this wallet</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <ReusableTable
                    data={transactions}
                    columns={columns}
                    getRowKey={(row) => row.id}
                    isLoading={loading}
                    emptyText="No transactions yet."
                />
            </div>
        </div>
    );
}
