"use client";
import { UserRole } from "@/lib/auth";

import { useState, useEffect } from "react";
import { User } from "@/lib/auth";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { UserTable } from "@/components/users/user-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { userService } from "@/lib/services/user-service";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

export default function UsersPage() {
  const router = useRouter();
  const { canAccess, hasPermission, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter State
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  useEffect(() => {
    loadData(page);
  }, [
    page,
    searchTerm,
    roleFilter,
    statusFilter,
    dateRange,
    sortBy,
    sortOrder,
    limit,
  ]);

  const loadData = async (targetPage = 1) => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers({
        page: targetPage,
        limit,
        search: searchTerm || undefined,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        startDate: dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined,
        endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        sortBy,
        sortOrder,
        isStaffUser: true,
        orgId: user?.orgId,
      });

      const userList = response.data || response.users;

      if (response && userList) {
        setUsers(
          userList.map((u: any) => ({
            ...u,
            name: String(u.fullName || u.name || "Unknown"),
          })),
        );
        setTotal(response.total || userList.length);
        setTotalPages(response.totalPages || 1);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => router.push("/dashboard/users/create");
  const handleEditUser = (user: User) =>
    router.push(`/dashboard/users/${user.id}/edit`);
  const handleDetailUser = (user: User) =>
    router.push(`/dashboard/users/${user.id}`);

  const handleDeleteUser = async (user: User) => {
    if (!confirm("Are you sure you want to toggle this user's status?")) return;
    const loadingToast = toast.loading("Updating user status...");
    try {
      await userService.toggleUserStatus(user.id);
      loadData();
      toast.success("User status updated successfully", { id: loadingToast });
    } catch {
      toast.error("Failed to update user status", { id: loadingToast });
    }
  };

  const handleResetPassword = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to reset the password for ${user.fullName}? A new password will be sent to them via SMS.`,
      )
    )
      return;

    const loadingToast = toast.loading("Resetting password...");
    try {
      await userService.resetUserPassword(user.id);
      toast.success("Password reset successfully. User notified via SMS.", {
        id: loadingToast,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password", {
        id: loadingToast,
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setDateRange(undefined);
    setSortBy("createdAt");
    setSortOrder("DESC");
    setPage(1);
  };

  if (!hasPermission(PERMISSIONS.USER_VIEW)) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Access Denied: Missing USER_VIEW permission
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Staff"
        description="Manage administrative roles and support staff for the platform."
        className="flex-col items-start! w-full! gap-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full mt-2">
          {/* Left: Search & Scrollable Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center flex-1 gap-3 overflow-hidden">
            {/* Search */}
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search staff..."
                className="pl-10 h-11 rounded border-slate-200 w-full bg-slate-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Scrollable Filters Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide flex-1">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px] shrink-0 h-11 rounded border-slate-200 bg-white">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded">
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value={UserRole.SYSTEM_SUPER_ADMIN}>Super Admin</SelectItem>
                  <SelectItem value={UserRole.SYSTEM_ADMIN}>System Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] shrink-0 h-11 rounded border-slate-200 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                </SelectContent>
              </Select>

              <div className="w-[240px] shrink-0">
                <DatePickerWithRange date={dateRange} setDate={setDateRange} className="h-11" />
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
            {(searchTerm !== "" || roleFilter !== "ALL" || statusFilter !== "ALL" || dateRange?.from) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-11 rounded text-slate-500 hover:text-slate-800 shrink-0 px-4"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}

            {hasPermission(PERMISSIONS.USER_CREATE) && (
              <Button
                onClick={handleAddUser}
                className="h-11 rounded px-6 bg-primary hover:opacity-90 font-bold shadow-lg shadow-primary/20 shrink-0 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            )}
          </div>
        </div>
      </PageHeader>

      <div className="bg-white rounded border border-slate-100 shadow-sm overflow-hidden">
        <UserTable
          owners={users}
          loading={loading}
          onDetail={handleDetailUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onResetPassword={
            hasPermission(PERMISSIONS.SETTINGS_RESET_PASSWORD)
              ? handleResetPassword
              : undefined
          }
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
