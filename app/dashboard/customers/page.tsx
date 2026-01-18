"use client";
import { UserRole } from "@/lib/auth";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/auth";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { UserTable } from "@/components/users/user-table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { customerService } from "@/lib/services/customer-service";
import { Search, X, Users, UserCheck, ShieldCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layouts/page-header";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";

export default function CustomerPage() {
  const router = useRouter();
  const { canAccess, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter State
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  useEffect(() => {
    loadData(page);
  }, [page, searchTerm, sortBy, sortOrder, limit]);

  const loadData = async (targetPage = 1) => {
    try {
      setLoading(true);
      const response = await customerService.getAllCustomers({
        page: targetPage,
        limit,
        search: searchTerm || undefined,
        sortBy,
        sortOrder
      });

      if (response && response.data) {
        const mapped: User[] = response.data.map((c: any) => ({
          id: c.id,
          email: c.email || "",
          fullName: c.fullName,
          phoneNumber: c.phoneNumber,
          status: (c.isActive ? "Active" : "InActive") as any,
          role: UserRole.CUSTOMER,
          createdAt: c.createdAt,
          isActive: c.isActive,
          isPhoneVerified: c.isPhoneVerified,
          isEmailVerified: c.isEmailVerified,
          profileImage: c.profileImage
        }));
        setUsers(mapped);
        setTotal(response.total || response.data.length);
        setTotalPages(response.totalPages || 1);
      }
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleDetailUser = (user: User) => {
    router.push(`/dashboard/customers/${user.id}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortBy("createdAt");
    setSortOrder("DESC");
    setPage(1);
  };

  if (!hasPermission(PERMISSIONS.CUSTOMER_VIEW)) {
    return <div className="p-6 text-center text-red-500 font-semibold">Access Denied: Missing CUSTOMER_VIEW permission</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Verified Customers"
        description="Review and manage registered drivers and mobile app users."
      >
        <div className="relative flex-1 sm:min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customers..."
            className="pl-10 h-11 rounded-xl border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] h-11 rounded-xl border-slate-200">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="createdAt">Joined Date</SelectItem>
            <SelectItem value="fullName">Full Name</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl"
          onClick={() => setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")}
        >
          <Filter className={`h-4 w-4 ${sortOrder === "DESC" ? "rotate-180" : ""} transition-transform`} />
        </Button>

        {(searchTerm !== "") && (
          <Button variant="ghost" size="icon" onClick={clearFilters} className="h-11 w-11 rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        )}
      </PageHeader>

      {hasPermission(PERMISSIONS.CUSTOMER_VIEW) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            icon={<Users className="h-5 w-5" />}
            label="Total Population"
            value={`${total} Users`}
            color="primary"
          />
          <StatsCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Verified Accounts"
            value={`${users.filter(u => u.isPhoneVerified).length} Verified`}
            color="green"
          />
          <StatsCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Security Status"
            value="Compliant"
            color="indigo"
          />
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <UserTable
          owners={users}
          loading={loading}
          onDetail={handleDetailUser}
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

function StatsCard({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const colorMap: any = {
    indigo: "bg-indigo-50 text-indigo-600 border-l-indigo-500",
    green: "bg-green-50 text-green-600 border-l-green-500",
    primary: "bg-primary/10 text-primary border-l-primary",
  };

  return (
    <div className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 ${colorMap[color] || colorMap.primary}`}>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-50' : color === 'green' ? 'bg-green-50' : 'bg-primary/10'}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}
