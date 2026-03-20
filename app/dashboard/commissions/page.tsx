"use client";

import { useState, useEffect } from "react";
import { commissionService } from "@/lib/services/commission-service";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, TrendingUp, Calendar, Clock, DollarSign, ChevronLeft, ChevronRight, FileMinus } from "lucide-react";
import { format } from "date-fns";
import { parkingService } from "@/lib/services/parking-service";
import { cn } from "@/lib/utils";

export default function CommissionsPage() {
    const [loading, setLoading] = useState(true);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [parkings, setParkings] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });

    const [filters, setFilters] = useState({
        q: "",
        parkingId: "ALL",
    });

    useEffect(() => {
        fetchData(pagination.page);
        fetchParkings();
    }, [filters, pagination.page]);

    const fetchData = async (page: number) => {
        try {
            setLoading(true);
            const [commResponse, statsResponse] = await Promise.all([
                commissionService.getBookingCommissions({
                    ...filters,
                    page,
                    limit: pagination.limit,
                    parkingId: filters.parkingId === "ALL" ? undefined : filters.parkingId
                }),
                commissionService.getCommissionStats({
                    parkingId: filters.parkingId === "ALL" ? undefined : filters.parkingId
                })
            ]);

            if (commResponse.success) {
                setCommissions(commResponse.data || []);
                const total = commResponse.total || 0;
                const totalPages = commResponse.totalPages || Math.ceil(total / pagination.limit);
                setPagination(prev => ({
                    ...prev,
                    total: total,
                    totalPages: totalPages,
                    page: commResponse.page || page
                }));
            }
            if (statsResponse.success) {
                setStats(statsResponse.data);
            }
        } catch (error) {
            console.error("Failed to fetch commission data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchParkings = async () => {
        try {
            const res = await parkingService.getAllParking({ limit: 100 });
            // getAllParking returns PaginatedResponse directly
            if (res && res.data) {
                setParkings(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch parkings", error);
        }
    };

    const statCards = [
        {
            title: "Total Commission",
            value: stats?.totalEarned || 0,
            icon: DollarSign,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            title: "Today",
            value: stats?.daily || 0,
            icon: Clock,
            color: "text-green-600",
            bg: "bg-green-50"
        },
        {
            title: "This Month",
            value: stats?.monthly || 0,
            icon: Calendar,
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
        {
            title: "This Year",
            value: stats?.yearly || 0,
            icon: TrendingUp,
            color: "text-orange-600",
            bg: "bg-orange-50"
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Booking Commissions"
                description="Track and manage revenue from booking commissions across all parking facilities."
            />

            {/* Numerical Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm outline-1 outline-slate-100">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                    <h3 className="text-2xl font-bold mt-1">
                                        ETB {Number(stat.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                </div>
                                <div className={cn("p-3 rounded-xl", stat.bg)}>
                                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-sm outline-1 outline-slate-100">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-4">
                    <CardTitle className="text-lg font-bold">Transaction History</CardTitle>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search reference or parking..."
                                className="pl-9 h-10"
                                value={filters.q}
                                onChange={(e) => {
                                    setFilters({ ...filters, q: e.target.value });
                                    setPagination(p => ({ ...p, page: 1 }));
                                }}
                            />
                        </div>
                        <Select
                            value={filters.parkingId}
                            onValueChange={(val) => {
                                setFilters({ ...filters, parkingId: val });
                                setPagination(p => ({ ...p, page: 1 }));
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[200px] h-10">
                                <SelectValue placeholder="All Parkings" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Parkings</SelectItem>
                                {parkings.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="rounded border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-700">Date</TableHead>
                                            <TableHead className="font-bold text-slate-700">Parking Name</TableHead>
                                            <TableHead className="font-bold text-slate-700">Parking Code</TableHead>
                                            <TableHead className="font-bold text-slate-700">Reference</TableHead>
                                            <TableHead className="font-bold text-slate-700">Booking Total</TableHead>
                                            <TableHead className="font-bold text-slate-700">Comm. Type</TableHead>
                                            <TableHead className="font-bold text-right text-slate-700">Commission</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {commissions.length > 0 ? (
                                            commissions.map((item) => (
                                                <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                                    <TableCell className="text-xs text-slate-500 font-medium">
                                                        {format(new Date(item.createdAt), "MMM dd, yyyy HH:mm")}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-slate-800">
                                                        {item.parking?.name || "N/A"}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-slate-400 uppercase">
                                                        {item.parking?.parkingCode || "N/A"}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500">
                                                        {item.referenceNo}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-600">
                                                        {Number(item.totalAmount || 0).toLocaleString()} ETB
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                            item.commissionType === "PERCENTAGE"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {item.commissionType || "N/A"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-slate-900 text-base">
                                                        {Number(item.commissionAmount || 0).toLocaleString()} ETB
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-48 text-center text-slate-400 font-medium">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FileMinus className="h-8 w-8 text-slate-200" />
                                                        <p>No commission transactions found.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {pagination.totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 px-2">
                                    <p className="text-sm font-medium text-slate-500">
                                        Showing {commissions.length} of {pagination.total} entries
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page <= 1}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                            className="h-9 px-3 border-slate-200"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Prev
                                        </Button>
                                        <div className="flex items-center gap-1 mx-1">
                                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                                const pageNum = i + 1;
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={pagination.page === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                                                        className={cn(
                                                            "h-9 w-9 p-0 border-slate-200",
                                                            pagination.page === pageNum ? "bg-primary text-white" : "text-slate-600"
                                                        )}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                            {pagination.totalPages > 5 && <span className="text-slate-400 px-1">...</span>}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page >= pagination.totalPages}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                            className="h-9 px-3 border-slate-200"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
