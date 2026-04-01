"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { vehicleService, Vehicle } from "@/lib/services/vehicle-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, Search, Car, Shield, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";

export default function VehiclesPage() {
  const router = useRouter();
  const { canAccess, hasPermission } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter State
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  /* ================= LOAD ================= */

  useEffect(() => {
    loadVehicles(page);
  }, [page, searchQuery, sortBy, sortOrder, limit]);

  const loadVehicles = async (targetPage = 1) => {
    try {
      setLoading(true);
      const response = await vehicleService.getAllVehicles({
        page: targetPage,
        limit,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
      });

      if (response && response.data) {
        setVehicles(response.data);
        setTotal(response.total || response.data.length);
        setTotalPages(response.totalPages || 1);
      }
    } catch (err) {
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("createdAt");
    setSortOrder("DESC");
    setPage(1);
  };

  if (!hasPermission(PERMISSIONS.VEHICLE_VIEW)) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Access Denied: Missing VEHICLE_VIEW permission
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Vehicle Registry"
        description="Monitor and audit all vehicles currently registered within the platform."
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full mt-2">
          {/* Left: Search & Scrollable Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center flex-1 gap-3 overflow-hidden">
            <div className="relative w-full lg:w-[320px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search vehicles..."
                className="pl-10 h-11 rounded border-slate-200 bg-slate-50 focus:bg-white w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide flex-1">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-45 shrink-0 h-11 rounded border-slate-200 bg-white">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent className="rounded">
                  <SelectItem value="createdAt">Registered Date</SelectItem>
                  <SelectItem value="plateNumber">Plate Number</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-11 px-4 rounded border-slate-200 bg-white shrink-0"
                onClick={() => setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")}
              >
                <Filter className={`h-4 w-4 mr-2 ${sortOrder === "DESC" ? "rotate-180" : ""} transition-transform`} />
                Order
              </Button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
            {searchQuery !== "" && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-11 rounded text-slate-500 hover:text-slate-800 shrink-0 px-4"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </PageHeader>

      {hasPermission(PERMISSIONS.VEHICLE_VIEW) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            icon={<Car className="h-5 w-5" />}
            label="Global Fleet"
            value={`${total} Vehicles`}
            color="primary"
          />
          <StatsCard
            icon={<Shield className="h-5 w-5" />}
            label="Permits Status"
            value="Verified"
            color="green"
          />
          <StatsCard
            icon={<ListChecks className="h-5 w-5" />}
            label="Data Health"
            value="100% Valid"
            color="indigo"
          />
        </div>
      )}

      <div className="bg-white rounded border border-slate-100 shadow-sm overflow-hidden">
        <VehicleTable
          vehicles={vehicles as any}
          loading={loading}
          onDetail={(v: any) => router.push(`/dashboard/vehicles/${v.id}`)}
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

function StatsCard({
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
  };

  return (
    <div
      className={`bg-white p-6 rounded border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 ${colorMap[color] || colorMap.primary}`}
    >
      <div
        className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color === "indigo" ? "bg-indigo-50" : color === "green" ? "bg-green-50" : "bg-primary/10"}`}
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
