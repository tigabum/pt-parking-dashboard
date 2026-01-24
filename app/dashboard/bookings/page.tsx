"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { BookingsTable } from "@/components/bookings/booking-table";
import { bookingService } from "@/lib/services/booking-service";
import { parkingService } from "@/lib/services/parking-service";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { Search, X, Plus, CalendarCheck, Clock, CheckCircle2, AlertCircle, User as UserIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layouts/page-header";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { BookingStatus } from "@/components/types";

export default function BookingsPage() {
  const router = useRouter();
  const { user, canAccess, hasPermission } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [managerFilter, setManagerFilter] = useState<string>("ALL");
  const [managers, setManagers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  useEffect(() => {
    if (user && hasPermission(PERMISSIONS.BOOKING_VIEW)) {
      loadData(page);
    }
  }, [page, searchQuery, statusFilter, typeFilter, managerFilter, dateRange, sortBy, sortOrder, limit, user]);

  useEffect(() => {
    if (user && (user.role === UserRole.SYSTEM_SUPER_ADMIN || user.role === UserRole.PARKING_SUPER_ADMIN)) {
      loadManagers();
    }
  }, [user]);

  const loadManagers = async () => {
    try {
      const res = await userService.getAllUsers({
        role: UserRole.PARKING_MANAGER,
        orgId: user?.orgId && user.role !== UserRole.SYSTEM_SUPER_ADMIN ? user.orgId : undefined
      });
      const userList = res.data || res.users;
      if (userList) setManagers(userList);
    } catch (err) {
      console.error("Failed to load managers", err);
    }
  };

  const loadData = async (targetPage = 1) => {
    if (!hasPermission(PERMISSIONS.BOOKING_VIEW)) return;
    try {
      setLoading(true);
      const bookingsRes = await bookingService.getAllBookings({
        page: targetPage,
        limit,
        q: searchQuery || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
        endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        parkingId: user?.orgId || undefined,
        managerUserId: managerFilter === "ALL" ? undefined : managerFilter,
        sortBy: sortBy as any,
        sortOrder: sortOrder
      });

      if (bookingsRes && Array.isArray(bookingsRes.data)) {
        setBookings(bookingsRes.data);
        setTotal(bookingsRes.total);
        setTotalPages(bookingsRes.totalPages);
      }

      try {
        const parkingsRes = await parkingService.getAllParking();
        if (parkingsRes && Array.isArray(parkingsRes.data)) {
          setSpaces(parkingsRes.data);
        }
      } catch (err) {
        console.error("Parking spaces load failed:", err);
      }
    } catch (err) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => router.push("/dashboard/bookings/create");

  const exportToCSV = () => {
    if (!hasPermission(PERMISSIONS.REVENUE_EXPORT)) {
      return toast.error("You don't have permission to export data");
    }
    if (!bookings.length) return toast.error("No data to export");
    const headers = ["Reference", "Customer", "Phone", "Plate", "Parking", "Status", "Amount", "Start Time"];
    const csvContent = [
      headers.join(","),
      ...bookings.map(b => [
        `"${b.referenceNo || 'N/A'}"`,
        `"${b.customerName || 'N/A'}"`,
        `"${b.customerPhone || 'N/A'}"`,
        `"${b.plateNumber || 'N/A'}"`,
        `"${b.parking?.name || 'N/A'}"`,
        `"${b.status}"`,
        `"${b.totalAmount}"`,
        format(new Date(b.startTime), "yyyy-MM-dd HH:mm")
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmPayment = async (row: any) => {
    if (!hasPermission(PERMISSIONS.BOOKING_UPDATE)) {
      return toast.error("Required permission: Update Booking");
    }

    const loadingToast = toast.loading("Verifying payment...");
    try {
      setActionId(row.id);
      await bookingService.updateBookingStatus(row.id, BookingStatus.PAID);
      toast.success("Payment Verified Successfully", { id: loadingToast });
      await loadData(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed", { id: loadingToast });
    } finally {
      setActionId(null);
    }
  };

  const handleConfirmArrival = async (row: any) => {
    if (!hasPermission(PERMISSIONS.BOOKING_UPDATE)) {
      return toast.error("Required permission: Update Booking");
    }

    const loadingToast = toast.loading("Confirming arrival...");
    try {
      setActionId(row.id);
      await bookingService.updateBookingStatus(row.id, BookingStatus.ACTIVE);
      toast.success("Arrival Confirmed. Session Started.", { id: loadingToast });
      await loadData(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Confirmation failed", { id: loadingToast });
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (row: any) => {
    if (!hasPermission(PERMISSIONS.BOOKING_UPDATE)) {
      return toast.error("Required permission: Update Booking");
    }

    const loadingToast = toast.loading("Cancelling booking...");
    try {
      setActionId(row.id);
      await bookingService.updateBookingStatus(row.id, BookingStatus.CANCELLED);
      toast.success("Booking Cancelled", { id: loadingToast });
      await loadData(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cancellation failed", { id: loadingToast });
    } finally {
      setActionId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setManagerFilter("ALL");
    setDateRange(undefined);
    setSortBy("createdAt");
    setSortOrder("DESC");
    setPage(1);
  };

  if (!hasPermission(PERMISSIONS.BOOKING_VIEW)) {
    return <div className="p-6 text-center text-red-500 font-semibold">Access Denied: Missing BOOKING_VIEW permission</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Active Bookings"
        description="Oversee reservations, subscriptions, and real-time space utilization."
      >
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between w-full gap-4 mt-2">
          {/* Left: Search */}
          <div className="relative w-full xl:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Plate, Ref or Customer..."
              className="pl-10 h-11 rounded-xl border-slate-200 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Middle: Filters */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-1 lg:justify-start xl:justify-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-[130px] h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value={BookingStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={BookingStatus.WAITING_CONFIRMATION}>Waiting Confirmation</SelectItem>
                <SelectItem value={BookingStatus.PAID}>Paid</SelectItem>
                <SelectItem value={BookingStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={BookingStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Manager Filter - Only for Super Admins */}
            {(user?.role === UserRole.SYSTEM_SUPER_ADMIN || user?.role === UserRole.PARKING_SUPER_ADMIN) && managers.length > 0 && (
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-[180px] h-11 rounded-xl border-slate-200 bg-white">
                  <div className="flex items-center gap-2 truncate">
                    <UserIcon className="h-4 w-4 text-slate-400 shrink-0" />
                    <SelectValue placeholder="All Managers" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Managers</SelectItem>
                  {managers.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="w-full sm:w-auto flex-1 sm:flex-none">
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>

            {hasPermission(PERMISSIONS.REVENUE_EXPORT) && (
              <Button
                variant="outline"
                onClick={exportToCSV}
                className="h-11 rounded-xl px-4 border-slate-200 bg-white hover:bg-slate-50 font-bold flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}

            {(searchQuery !== "" || statusFilter !== "ALL" || managerFilter !== "ALL" || dateRange?.from) && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-11 w-11 rounded-xl hidden sm:flex">
                <X className="h-4 w-4" />
              </Button>
            )}

            {(searchQuery !== "" || statusFilter !== "ALL" || managerFilter !== "ALL" || dateRange?.from) && (
              <Button variant="outline" onClick={clearFilters} className="h-11 rounded-xl sm:hidden flex-1 border-slate-200">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Right: Add Button */}
          {hasPermission(PERMISSIONS.BOOKING_CREATE) && (user?.role === UserRole.PARKING_MANAGER || user?.role === UserRole.PARKING_SUPER_ADMIN) && (
            <Button
              onClick={handleAdd}
              className="h-11 rounded-xl px-6 bg-primary hover:opacity-90 font-bold shadow-lg shadow-primary/20 shrink-0 w-full xl:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <BookingsTable
          bookings={bookings}
          parkings={spaces}
          loading={loading}
          onConfirmPayment={handleConfirmPayment}
          onConfirmArrival={handleConfirmArrival}
          onCancel={handleCancel}
          actionId={actionId}
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

function StatsSummaryCard({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const colorMap: any = {
    indigo: "bg-indigo-50 text-indigo-600 border-l-indigo-500",
    green: "bg-green-50 text-green-600 border-l-green-500",
    primary: "bg-primary/10 text-primary border-l-primary",
    amber: "bg-amber-50 text-amber-600 border-l-amber-500",
  };

  return (
    <div className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 ${colorMap[color] || colorMap.primary}`}>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-50' : color === 'green' ? 'bg-green-50' : color === 'amber' ? 'bg-amber-50' : 'bg-primary/10'}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}
