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
import {
  Search,
  X,
  Plus,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
} from "lucide-react";
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
import { log } from "console";

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
  }, [
    page,
    searchQuery,
    statusFilter,
    typeFilter,
    managerFilter,
    dateRange,
    sortBy,
    sortOrder,
    limit,
    user,
  ]);

  useEffect(() => {
    if (
      user &&
      (user.role === UserRole.SYSTEM_SUPER_ADMIN ||
        user.role === UserRole.PARKING_SUPER_ADMIN)
    ) {
      loadManagers();
    }
  }, [user]);

  const loadManagers = async () => {
    try {
      const res = await userService.getAllUsers({
        role: UserRole.PARKING_MANAGER,
        orgId:
          user?.orgId && user.role !== UserRole.SYSTEM_SUPER_ADMIN
            ? user.orgId
            : undefined,
      });
      const userList = res.data || res.users;
      if (userList) setManagers(userList);
    } catch (err) {
      // Silent failure
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
        startDate: dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined,
        endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        parkingId:
          user?.role === UserRole.SYSTEM_SUPER_ADMIN ||
            user?.role === UserRole.SYSTEM_ADMIN
            ? undefined
            : user?.orgId || undefined,
        managerUserId: managerFilter === "ALL" ? undefined : managerFilter,
        sortBy: sortBy as any,
        sortOrder: sortOrder,
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
        // Silent failure
      }
    } catch (err) {
      // Silent failure
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
    const headers = [
      "Reference",
      "Customer",
      "Phone",
      "Plate",
      "Parking",
      "Status",
      "Amount",
      "Start Time",
    ];
    const csvContent = [
      headers.join(","),
      ...bookings.map((b) =>
        [
          `"${b.referenceNo || "N/A"}"`,
          `"${b.customerName || "N/A"}"`,
          `"${b.customerPhone || "N/A"}"`,
          `"${b.plateNumber || "N/A"}"`,
          `"${b.parking?.name || "N/A"}"`,
          `"${b.status}"`,
          `"${b.totalAmount}"`,
          format(new Date(b.startTime), "yyyy-MM-dd HH:mm"),
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bookings_export_${format(new Date(), "yyyyMMdd")}.csv`,
    );
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
      toast.error(err.response?.data?.message || "Verification failed", {
        id: loadingToast,
      });
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
      toast.success("Arrival Confirmed. Session Started.", {
        id: loadingToast,
      });
      await loadData(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Confirmation failed", {
        id: loadingToast,
      });
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
      toast.error(err.response?.data?.message || "Cancellation failed", {
        id: loadingToast,
      });
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
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Access Denied: Missing BOOKING_VIEW permission
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Active Bookings"
        description="Oversee reservations, subscriptions, and real-time space utilization."
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full mt-2">
          {/* Left Side: Search & Scrollable Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center flex-1 gap-3 overflow-hidden">
            {/* Search */}
            <div className="relative w-full lg:w-[320px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search bookings..."
                className="pl-10 h-11 rounded border-slate-200 bg-slate-50 focus:bg-white w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Scrollable Filters Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] shrink-0 h-11 rounded border-slate-200 font-bold text-xs bg-white">
                  <div className="flex items-center gap-2 truncate">
                    {statusFilter === "ALL" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    <span className="truncate">
                      {statusFilter === "ALL" ? "All Status" : statusFilter}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value={BookingStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={BookingStatus.WAITING_CONFIRMATION}>Waiting</SelectItem>
                  <SelectItem value={BookingStatus.PAID}>Paid</SelectItem>
                  <SelectItem value={BookingStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={BookingStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {(user?.role === UserRole.SYSTEM_SUPER_ADMIN ||
                user?.role === UserRole.PARKING_SUPER_ADMIN) &&
                managers.length > 0 && (
                  <Select value={managerFilter} onValueChange={setManagerFilter}>
                    <SelectTrigger className="w-[160px] shrink-0 h-11 rounded border-slate-200 font-bold text-xs bg-white">
                      <div className="flex items-center gap-2 truncate">
                        <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">
                          {managers.find((m) => m.id === managerFilter)?.fullName || "All Managers"}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded">
                      <SelectItem value="ALL">All Managers</SelectItem>
                      {managers.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

              <div className="w-[240px] shrink-0">
                <DatePickerWithRange date={dateRange} setDate={setDateRange} className="h-11" />
              </div>
            </div>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
            {(searchQuery || statusFilter !== "ALL" || managerFilter !== "ALL" || dateRange?.from) && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                className="h-11 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0 px-4"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}

            {hasPermission(PERMISSIONS.BOOKING_CREATE) &&
              (user?.role === UserRole.PARKING_MANAGER || user?.role === UserRole.PARKING_SUPER_ADMIN) && (
                <Button
                  onClick={handleAdd}
                  className="h-11 rounded px-5 bg-primary hover:opacity-90 font-bold shadow-lg shadow-primary/20 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              )}
          </div>
        </div>
      </PageHeader>

      <div className="bg-white rounded border border-slate-100 shadow-sm overflow-hidden">
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

function StatsSummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: any = {
    indigo: "bg-indigo-50 text-indigo-600 border-l-indigo-500",
    green: "bg-green-50 text-green-600 border-l-green-500",
    primary: "bg-primary/10 text-primary border-l-primary",
    amber: "bg-amber-50 text-amber-600 border-l-amber-500",
  };

  return (
    <div
      className={`bg-white p-6 rounded border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 ${colorMap[color] || colorMap.primary}`}
    >
      <div
        className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color === "indigo" ? "bg-indigo-50" : color === "green" ? "bg-green-50" : color === "amber" ? "bg-amber-50" : "bg-primary/10"}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          {label}
        </div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}
