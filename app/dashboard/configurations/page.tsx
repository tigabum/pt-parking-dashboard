"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { commissionService } from "@/lib/services/commission-service";
import { Commission } from "@/components/types";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommissionTable } from "@/components/commissions/commission-table";
import { Search, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CommissionType } from "@/components/types";

export default function ConfigurationsPage() {
    const router = useRouter();
    const { canAccess, hasPermission } = useAuth();

    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadCommissions(page);
    }, [page, searchQuery, typeFilter, limit]);

    const loadCommissions = async (targetPage = 1) => {
        try {
            setLoading(true);
            const res = await commissionService.getCommissions({
                page: targetPage,
                limit,
                q: searchQuery || undefined,
                type: typeFilter === "ALL" ? undefined : typeFilter,
            });

            if (res && res.success) {
                // Handling flat response: { success, data (array), total, ... }
                setCommissions(res.data || []);
                setTotal(res.total || 0);
                setTotalPages(res.totalPages || 1);
            }
        } catch (err) {
            toast.error("Failed to load commissions");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => router.push("/dashboard/configurations/new");
    const handleEdit = (id: string) => router.push(`/dashboard/configurations/${id}/edit`);
    const handleView = (id: string) => router.push(`/dashboard/configurations/${id}`);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this configuration?")) return;
        const loadingToast = toast.loading("Deleting configuration...");
        try {
            await commissionService.deleteCommission(id);
            toast.success("Configuration deleted successfully", { id: loadingToast });
            loadCommissions();
        } catch (err: any) {
            toast.error(err?.message || "Failed to delete configuration", { id: loadingToast });
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setTypeFilter("ALL");
        setPage(1);
    };

    if (!hasPermission(PERMISSIONS.CONFIGURATION_VIEW)) {
        return <div className="p-6 text-center font-bold text-red-500">Access Denied: Missing CONFIGURATION_VIEW permission</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Commission Rules"
                description="Define and manage global fees, VAT, and tiered pricing structures."
            >
                <div className="relative flex-1 sm:min-w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name..."
                        className="pl-10 h-11 rounded-xl border-slate-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px] h-11 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="All Strategies" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="ALL">All Strategies</SelectItem>
                        <SelectItem value={CommissionType.PERCENTAGE}>Percentage (%)</SelectItem>
                        <SelectItem value={CommissionType.FLAT}>Flat Fee</SelectItem>
                        <SelectItem value={CommissionType.TIER}>Tiered</SelectItem>
                    </SelectContent>
                </Select>

                {(searchQuery !== "" || typeFilter !== "ALL") && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} className="h-11 w-11 rounded-xl">
                        <X className="h-4 w-4 text-slate-500" />
                    </Button>
                )}

                {hasPermission(PERMISSIONS.CONFIGURATION_CREATE) && (
                    <Button
                        onClick={handleAdd}
                        className="h-11 rounded-xl px-6 bg-primary hover:opacity-90 font-bold shadow-lg shadow-primary/20 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Rule
                    </Button>
                )}
            </PageHeader>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <CommissionTable
                    commissions={commissions}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                />
            </div>

            <div className="pt-4">
                <DashboardPagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={setPage}
                    limit={limit}
                    onLimitChange={setLimit}
                />
            </div>
        </div>
    );
}
