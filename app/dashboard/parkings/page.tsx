"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parkingService } from "@/lib/services/parking-service";
import { ParkingResponse } from "@/components/types";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ParkingSpacesTable } from "@/components/parkings/parking-table";
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
import { Search, X, Plus, Filter, Download } from "lucide-react";
import { ParkingStatus, ParkingType } from "@/components/types";

export default function ParkingPage() {
  const router = useRouter();
  const { canAccess, hasPermission, user } = useAuth();

  useEffect(() => {
    // If it's a parking user, redirect to their own parking detail page
    const isParkingUser = user?.role === UserRole.PARKING_SUPER_ADMIN || user?.role === UserRole.PARKING_MANAGER;
    if (isParkingUser && user?.orgId) {
      router.replace(`/dashboard/parkings/${user.orgId}`);
    }
  }, [user, router]);
  const [parkings, setParkings] = useState<ParkingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter State
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  useEffect(() => {
    loadSpaces(page);
  }, [page, searchQuery, typeFilter, statusFilter, dateRange, sortBy, sortOrder, limit]);

  const loadSpaces = async (targetPage = 1) => {
    try {
      setLoading(true);
      const response = await parkingService.getAllParking({
        page: targetPage,
        limit,
        q: searchQuery || undefined,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
        endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder
      });

      if (response && response.data) {
        setParkings(response.data);
        setTotal(response.total || response.data.length);
        setTotalPages(response.totalPages || 1);
      }
    } catch (err) {
      toast.error("Failed to load parkings");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => router.push("/dashboard/parkings/create");
  const handleEdit = (parking: ParkingResponse) => router.push(`/dashboard/parkings/${parking.id}/edit`);

  const handleDelete = async (parking: ParkingResponse) => {
    if (!hasPermission(PERMISSIONS.PARKING_DELETE)) {
      return toast.error("Required permission: Delete Parking");
    }
    if (!confirm("Are you sure you want to delete this parking?")) return;
    const loadingToast = toast.loading("Deleting parking...");
    try {
      await parkingService.deleteParking(parking.id);
      toast.success("Parking deleted successfully", { id: loadingToast });
      loadSpaces();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete parking", { id: loadingToast });
    }
  };

  const exportToCSV = () => {
    if (!parkings.length) return toast.error("No data to export");
    const headers = ["Name", "Code", "Region", "City", "Sub-City", "Woreda", "Kebele", "Spots", "Available", "Status", "Created At"];
    const csvContent = [
      headers.join(","),
      ...parkings.map(p => [
        `"${p.name}"`,
        `"${p.parkingCode || 'N/A'}"`,
        `"${p.region || '—'}"`,
        `"${p.city || '—'}"`,
        `"${p.subCity || '—'}"`,
        `"${p.woreda || '—'}"`,
        `"${p.kebele || '—'}"`,
        p.numberOfSpots,
        p.availableSpots,
        p.status,
        format(new Date(p.createdAt), "yyyy-MM-dd")
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `parkings_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setDateRange(undefined);
    setSortBy("createdAt");
    setSortOrder("DESC");
    setPage(1);
  };

  if (!hasPermission(PERMISSIONS.PARKING_VIEW)) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Access Denied: Missing PARKING_VIEW permission
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Parkings"
        description="Manage parking locations, pricing, and operational status."
        className="flex-col !items-start !w-full gap-4"
      >
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between w-full gap-4 mt-2">
          {/* Left: Search */}
          <div className="relative w-full xl:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search parkings..."
              className="pl-10 h-11 rounded-xl border-slate-200 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Middle: Filters */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-1 lg:justify-start xl:justify-center">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-[140px] h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value={ParkingType.PUBLIC}>Public</SelectItem>
                <SelectItem value={ParkingType.PRIVATE}>Private</SelectItem>
                <SelectItem value={ParkingType.COMMERCIAL}>Commercial</SelectItem>
                <SelectItem value={ParkingType.RESIDENTIAL}>Residential</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-[140px] h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value={ParkingStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={ParkingStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ParkingStatus.DISABLED}>Disabled</SelectItem>
              </SelectContent>
            </Select>

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

            {(typeFilter !== "ALL" || statusFilter !== "ALL" || searchQuery !== "" || dateRange?.from) && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-11 w-11 rounded-xl hidden sm:flex">
                <X className="h-4 w-4" />
              </Button>
            )}

            {(typeFilter !== "ALL" || statusFilter !== "ALL" || searchQuery !== "" || dateRange?.from) && (
              <Button variant="outline" onClick={clearFilters} className="h-11 rounded-xl sm:hidden flex-1 border-slate-200">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Right: Add Button */}
          {hasPermission(PERMISSIONS.PARKING_CREATE) && (
            <Button
              onClick={handleAdd}
              className="h-11 rounded-xl px-6 bg-primary hover:opacity-90 font-bold shadow-lg shadow-primary/20 shrink-0 w-full xl:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Parking
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <ParkingSpacesTable
          spaces={parkings}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
