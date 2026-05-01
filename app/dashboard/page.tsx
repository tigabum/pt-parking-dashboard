"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/context/auth-context"
import { UserRole } from "@/lib/auth"
import { useRouter } from "next/navigation"
import {
  Users, DollarSign, Calendar, Building2, Car,
  MapPin, Clock, CheckCircle2, AlertCircle,
  PieChart as PieIcon, TrendingUp, Wallet
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { dashboardService, DashboardStats } from "@/lib/services/dashboard-service"
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, Area, AreaChart, CartesianGrid
} from "recharts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { userService } from "@/lib/services/user-service"
import { ParkingStatus } from "@/components/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User as UserIcon } from "lucide-react"

import { PageHeader } from "@/components/layouts/page-header"
import { cn } from "@/lib/utils"
import { PERMISSIONS } from "@/lib/permissions"

function EnterpriseStat({ label, value, icon, trend }: { label: string, value: string | number, icon: any, trend?: string }) {
  return (
    <div className="flex flex-col p-4 md:p-6 space-y-1 md:space-y-2 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <div className="text-primary/20 scale-75 md:scale-100">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{value}</span>
        {trend && <span className="text-[9px] md:text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1 md:px-1.5 py-0.5 rounded flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" /> {trend}
        </span>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, canAccess, hasPermission } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly")
  const [managerFilter, setManagerFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [managers, setManagers] = useState<any[]>([])

  useEffect(() => {
    // Redirect if no dashboard access
    if (!loading && !hasPermission(PERMISSIONS.DASHBOARD_VIEW)) {
      router.replace("/dashboard/bookings");
    }
  }, [loading, hasPermission, router]);

  useEffect(() => {
    if (hasPermission(PERMISSIONS.DASHBOARD_VIEW)) {
      loadStats()
    }
  }, [user, managerFilter, statusFilter, hasPermission])

  useEffect(() => {
    if (user && (user.role === UserRole.SYSTEM_SUPER_ADMIN || user.role === UserRole.PARKING_SUPER_ADMIN)) {
      loadManagers()
    }
  }, [user])

  const loadManagers = async () => {
    try {
      const res = await userService.getAllUsers({
        role: UserRole.PARKING_MANAGER,
        orgId: user?.orgId && user.role !== UserRole.SYSTEM_SUPER_ADMIN ? user.orgId : undefined
      })
      const userList = res.data || res.users
      if (userList) setManagers(userList)
    } catch (err) {
      // Silent failure
    }
  }

  const loadStats = async () => {
    if (!user) return
    try {
      const data = await dashboardService.getDashboardStats({
        managerUserId: managerFilter === "ALL" ? undefined : managerFilter,
        parkingStatus: statusFilter === "ALL" ? undefined : statusFilter
      })
      setStats(data)
    } catch (error) {
      // Silent failure
    } finally {
      setLoading(false)
    }
  }

  // Show skeleton UI instead of blocking spinner
  const isInitialLoad = loading && !stats;

  // --- CHART DATA ---
  const currentChartData = stats?.trends?.[chartPeriod] || []
  const paymentStats = (stats?.paymentStats || [])
    .filter((p: any) => p.name === 'INCASH' || p.name === 'TRANSFER' || p.name === 'TELEBIRR')
    .map((p: any) => ({
      name: p.name === 'INCASH' ? 'Cash' : p.name === 'TELEBIRR' ? 'Telebirr' : 'Transfer',
      value: p.value
    }))

  // Return early if no stats yet
  if (!stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-slate-200 rounded-full" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-8 w-full mx-auto">
      <PageHeader
        title="Enterprise Overview"
        description="Real-time operational analytics and financial performance."
        className="w-full!"
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {(user?.role === UserRole.SYSTEM_SUPER_ADMIN || user?.role === UserRole.PARKING_SUPER_ADMIN) && managers.length > 0 && (
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[200px] h-10 bg-white border-slate-200 text-xs font-bold uppercase tracking-wider rounded">
                <SelectValue placeholder="All Managers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Global View</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(user?.role === UserRole.SYSTEM_SUPER_ADMIN || user?.role === UserRole.SYSTEM_ADMIN) && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-10 bg-white border-slate-200 text-xs font-bold uppercase tracking-wider rounded">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value={ParkingStatus.ACTIVE}>Active Only</SelectItem>
                <SelectItem value={ParkingStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ParkingStatus.DISABLED}>Disabled</SelectItem>
                <SelectItem value={ParkingStatus.UNDER_MAINTENANCE}>Maintenance</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </PageHeader>

      {/* PRIMARY STATS GRID */}
      <div className="bg-white rounded border border-slate-200 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-slate-100 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full">
        {hasPermission(PERMISSIONS.DASHBOARD_TOTAL_REVENUE) && (
          <EnterpriseStat
            label="Total Revenue"
            value={`${stats.revenue.toLocaleString()} ETB`}
            icon={<Wallet className="w-5 h-5" />}
          />
        )}
        {hasPermission(PERMISSIONS.DASHBOARD_TOTAL_BOOKINGS) && (
          <EnterpriseStat
            label="Total Bookings"
            value={stats.totalBookings}
            icon={<Calendar className="w-5 h-5" />}
          />
        )}
        {hasPermission(PERMISSIONS.DASHBOARD_TOTAL_BOOKINGS) && (
          <EnterpriseStat
            label="Paid Bookings"
            value={stats.paidBookings}
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
        )}
        {hasPermission(PERMISSIONS.USER_VIEW) && (
          <EnterpriseStat
            label="Total Users"
            value={stats.totalParkingUsers}
            icon={<Users className="w-5 h-5" />}
          />
        )}
        {hasPermission(PERMISSIONS.PARKING_VIEW) && user?.role !== UserRole.PARKING_SUPER_ADMIN && (
          <EnterpriseStat
            label="Parking Spaces"
            value={stats.activeParkings}
            icon={<MapPin className="w-5 h-5" />}
            trend={`${stats.totalParkings} Total`}
          />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* REVENUE CHART */}
        <Card className="xl:col-span-8 border-0 shadow-sm ring-1 ring-slate-200 bg-white rounded overflow-hidden">
          <CardHeader className="border-b border-slate-50 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Revenue Analytics</CardTitle>
            </div>
            <Tabs defaultValue="weekly" value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
              <TabsList className="h-8 bg-slate-100 p-0.5 rounded">
                {hasPermission(PERMISSIONS.DASHBOARD_DAILY_STATS) && <TabsTrigger value="weekly" className="text-[10px] font-bold h-7 px-3 rounded data-[state=active]:bg-white data-[state=active]:shadow-sm">Weekly</TabsTrigger>}
                {hasPermission(PERMISSIONS.DASHBOARD_MONTHLY_STATS) && <TabsTrigger value="monthly" className="text-[10px] font-bold h-7 px-3 rounded data-[state=active]:bg-white data-[state=active]:shadow-sm">Monthly</TabsTrigger>}
                {hasPermission(PERMISSIONS.DASHBOARD_YEARLY_STATS) && <TabsTrigger value="yearly" className="text-[10px] font-bold h-7 px-3 rounded data-[state=active]:bg-white data-[state=active]:shadow-sm">Yearly</TabsTrigger>}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="h-[250px] sm:h-[300px] md:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    fontWeight={600}
                    dy={10}
                    hide={typeof window !== 'undefined' && window.innerWidth < 640}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    fontWeight={600}
                    tickFormatter={(value) => `${value}`}
                    dx={-10}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SECONDARY METRICS & DISTRIBUTION */}
        <div className="xl:col-span-4 space-y-6">
          {/* Payment Methods */}
          {hasPermission(PERMISSIONS.REVENUE_VIEW) && (
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white rounded overflow-hidden h-[400px]">
              <CardHeader className="border-b border-slate-50 px-6 py-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Transaction Channels</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col h-[340px] pb-10">
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        labelLine={false}
                        stroke="white"
                        strokeWidth={2}
                      >
                        {paymentStats.map((entry: any, index: number) => {
                          let color = "var(--primary)";
                          if (entry.name === 'Cash') color = "#10b981"; // Emerald
                          if (entry.name === 'Transfer') color = "#3b82f6"; // Blue
                          if (entry.name === 'Telebirr') color = "#8b5cf6"; // Violet
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          padding: '12px'
                        }} 
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ 
                          paddingTop: '32px',
                          position: 'relative'
                        }}
                        formatter={(value: string) => (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Operational Summary List */}
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Operational Snapshot</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {hasPermission(PERMISSIONS.PARKING_VIEW) && (
                <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Available Spots</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{stats.totalAvailableSpots || 0}</span>
                </div>
              )}
              {hasPermission(PERMISSIONS.DASHBOARD_TOTAL_BOOKINGS) && (
                <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Active Sessions</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{stats.activeBookings || 0}</span>
                </div>
              )}
              {hasPermission(PERMISSIONS.REVENUE_VIEW) && (
                <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                      <PieIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Commission</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{(stats.commission || 0).toLocaleString()} ETB</span>
                </div>
              )}
              {hasPermission(PERMISSIONS.PARKING_VIEW) && (
                <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Total Capacity</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{stats.totalCapacity || 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
