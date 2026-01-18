"use client";

import { Commission, CommissionType } from "@/components/types";
import {
    ReusableTable,
    actionsColumn,
    Column,
} from "@/components/tables";
import {
    Percent,
    Coins,
    Layers,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions";

interface CommissionTableProps {
    commissions: Commission[];
    loading?: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onView: (id: string) => void;
}

export function CommissionTable({
    commissions,
    loading,
    onEdit,
    onDelete,
    onView,
}: CommissionTableProps) {
    const columns: Column<Commission>[] = [
        {
            key: "name",
            header: "Configuration",
            render: (row) => (
                <div className="py-2">
                    <h4 className="font-black text-slate-900 text-base leading-tight">{row.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                        Created: {new Date(row.createdAt).toLocaleDateString()}
                    </p>
                </div>
            )
        },
        {
            key: "type",
            header: "Type",
            render: (row) => {
                const config = {
                    [CommissionType.PERCENTAGE]: {
                        icon: Percent,
                        bg: "bg-primary/5",
                        border: "border-primary/10",
                        text: "Percentage",
                        sub: "% of total amount"
                    },
                    [CommissionType.FLAT]: {
                        icon: Coins,
                        bg: "bg-emerald-50",
                        border: "border-emerald-100",
                        text: "Flat Fee",
                        sub: "Fixed per booking"
                    },
                    [CommissionType.TIER]: {
                        icon: Layers,
                        bg: "bg-orange-50",
                        border: "border-orange-100",
                        text: "Tiered",
                        sub: "Bracket based"
                    }
                }[row.type];

                const Icon = config.icon;

                return (
                    <div className="flex items-center gap-3 py-1">
                        <div className={cn("p-2.5 rounded-[1rem] border", config.bg, config.border)}>
                            <Icon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                            <span className="font-black text-slate-900 uppercase text-[10px] tracking-widest block leading-none">{config.text}</span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 block whitespace-nowrap leading-none">{config.sub}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: "value",
            header: "Value / Bracket",
            render: (row) => (
                row.type === CommissionType.TIER ? (
                    <span className="bg-orange-50 text-orange-700 border border-orange-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight">
                        {row.tierConfig?.length || 0} Brackets
                    </span>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-900 leading-none">{row.value}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {row.type === CommissionType.PERCENTAGE ? '%' : 'ETB'}
                        </span>
                    </div>
                )
            )
        },
        {
            key: "vat",
            header: "VAT",
            render: (row) => (
                row.includeVAT ? (
                    <span className="font-black text-[10px] text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                        Yes (15%)
                    </span>
                ) : (
                    <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">None</span>
                )
            )
        },
        {
            key: "status",
            header: "Status",
            render: (row) => (
                <div className="flex justify-start">
                    {row.isActive ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-tight">Active</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-tight">Inactive</span>
                        </div>
                    )}
                </div>
            )
        },
        actionsColumn<Commission>({
            onDetail: (row) => onView(row.id),
            detailPermission: PERMISSIONS.CONFIGURATION_VIEW,
            onEdit: (row) => onEdit(row.id),
            editPermission: PERMISSIONS.CONFIGURATION_UPDATE,
            onDelete: (row) => onDelete(row.id),
            deletePermission: PERMISSIONS.CONFIGURATION_DELETE,
        }),
    ];

    return (
        <ReusableTable
            data={commissions}
            columns={columns}
            getRowKey={(row) => row.id}
            emptyText={loading ? "Loading configurations..." : "No configurations found"}
        />
    );
}
