"use client";

import { useEffect, useState } from "react";
import { commissionService } from "@/lib/services/commission-service";
import { BookingCommission } from "@/components/types";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/layouts/page-header";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";
import { ReusableTable, Column } from "@/components/tables";
import { Search, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import dayjs from "dayjs";

export default function BookingCommissionsPage() {
  const { hasPermission } = useAuth();
  const [commissions, setCommissions] = useState<BookingCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [stats, setStats] = useState({
    totalEarned: 0,
    count: 0,
    totalVat: 0,
  });

  useEffect(() => {
    loadCommissions();
    loadStats();
  }, [page, limit, searchQuery]);

  const loadStats = async () => {
    try {
      const res = await commissionService.getCommissionStats({
        q: searchQuery || undefined,
      });
      if (res && res.success) {
        setStats({
          totalEarned: res.data.totalEarned,
          count: res.data.count,
          totalVat: res.data.totalVat || 0,
        });
      }
    } catch (err) {
      // Silent failure
    }
  };

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const res = await commissionService.getBookingCommissions({
        page,
        limit,
        q: searchQuery || undefined,
      });

      if (res && res.success) {
        setCommissions(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      toast.error("Failed to load booking commissions");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<BookingCommission>[] = [
    {
      key: "referenceNo",
      header: "Reference",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.referenceNo}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ID: {row.id.split("-")[0]}...
          </span>
        </div>
      ),
    },
    {
      key: "parkingId",
      header: "Parking",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700">
            {row.parking?.name || "—"}
          </span>
          <span className="text-[10px] text-slate-400 italic">
            {row.parking?.city || "Ethiopia"}
          </span>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Booking Total",
      render: (row) => (
        <span className="font-bold text-slate-600">
          {Number(row.totalAmount).toLocaleString()} ETB
        </span>
      ),
    },
    {
      key: "commissionAmount",
      header: "Earned Commission",
      render: (row) => (
        <span className="font-black text-primary text-base">
          {Number(row.commissionAmount).toLocaleString()} ETB
        </span>
      ),
    },
    {
      key: "vatAmount",
      header: "VAT (15%)",
      render: (row) => (
        <span className="font-semibold text-amber-600 text-sm">
          {Number(row.vatAmount || 0).toLocaleString()} ETB
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date Earned",
      render: (row) => (
        <div className="flex items-center gap-2 text-slate-500">
          <Calendar className="h-3 w-3" />
          <span className="text-xs font-semibold">
            {dayjs(row.createdAt).format("MMM D, YYYY HH:mm")}
          </span>
        </div>
      ),
    },
  ];

  if (!hasPermission(PERMISSIONS.REVENUE_VIEW)) {
    return (
      <div className="p-6 text-center text-red-500 font-bold">
        Access Denied: Missing REVENUE_VIEW permission
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Commission"
        description="Live audit of commissions earned from parking bookings across the platform."
      >
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search reference or parking..."
            className="pl-10 h-11 rounded border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </PageHeader>

      {/* Simple Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="h-14 w-14 bg-primary/10 rounded flex items-center justify-center text-primary">
            <TrendingUp className="h-7 w-7" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">
              Total Transactions
            </p>
            <p className="text-3xl font-black text-slate-900">
              {total.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="h-14 w-14 bg-emerald-100 rounded flex items-center justify-center text-emerald-600">
            <DollarSign className="h-7 w-7" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">
              Platform Revenue (ETB)
            </p>
            <p className="text-3xl font-black text-slate-900">
              {stats.totalEarned.toLocaleString()} ETB
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="h-14 w-14 bg-amber-100 rounded flex items-center justify-center text-amber-600">
            <DollarSign className="h-7 w-7" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">
              Total VAT (15%)
            </p>
            <p className="text-3xl font-black text-slate-900">
              {stats.totalVat.toLocaleString()} ETB
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-100 shadow-sm overflow-hidden">
        <ReusableTable
          data={commissions}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={loading}
          emptyText="No commission records found."
        />
      </div>

      <DashboardPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
      />
    </div>
  );
}
