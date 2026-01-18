"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingResponse, BookingStatus } from "@/components/types";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

dayjs.extend(isBetween);

interface BookingStatsProps {
    bookings: BookingResponse[];
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

export function BookingStats({ parkingId }: { parkingId: string }) {
    const [period, setPeriod] = useState<Period>("daily");
    const [stats, setStats] = useState({
        paid: { count: 0, amount: 0, commission: 0, vat: 0 },
        pending: { count: 0, amount: 0, commission: 0, vat: 0 },
        unpaid: { count: 0, amount: 0, commission: 0, vat: 0 },
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (parkingId) {
            fetchStats();
        }
    }, [parkingId, period]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const now = dayjs();
            let start: dayjs.Dayjs;
            let end = now.endOf("day");

            switch (period) {
                case "daily":
                    start = now.startOf("day");
                    break;
                case "weekly":
                    start = now.startOf("week");
                    end = now.endOf("week");
                    break;
                case "monthly":
                    start = now.startOf("month");
                    end = now.endOf("month");
                    break;
                case "yearly":
                    start = now.startOf("year");
                    end = now.endOf("year");
                    break;
            }

            const { bookingService } = await import("@/lib/services/booking-service");
            const res = await bookingService.getRevenueStats({
                parkingId,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            });

            if (res?.data) {
                setStats(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch booking stats", error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({
        title,
        count,
        amount,
        commission,
        vat,
        icon: Icon,
        colorClass,
        bgClass,
    }: {
        title: string;
        count: number;
        amount: number;
        commission?: number;
        vat?: number;
        icon: any;
        colorClass: string;
        bgClass: string;
    }) => (
        <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-xl", bgClass)}>
                        <Icon className={cn("h-6 w-6", colorClass)} />
                    </div>
                    <Badge variant="outline" className={cn("font-bold", colorClass, bgClass, "border-none")}>
                        {title}
                    </Badge>
                </div>
                <div className="space-y-1">
                    <h4 className="text-3xl font-black text-slate-900">
                        {loading ? <span className="text-slate-200 animate-pulse">...</span> : count}
                    </h4>
                    <p className="text-sm font-bold text-slate-400">
                        {loading ? "..." : new Intl.NumberFormat("en-ET", {
                            style: "currency",
                            currency: "ETB",
                        }).format(amount)}
                    </p>
                    {commission !== undefined && (
                        <div className="pt-2 mt-2 border-t border-slate-100 flex flex-col gap-1 text-[10px] uppercase font-bold text-slate-400">
                            <div className="flex justify-between">
                                <span>Commission:</span>
                                <span>{loading ? "..." : new Intl.NumberFormat("en-ET", {
                                    style: "currency",
                                    currency: "ETB",
                                }).format(commission)}</span>
                            </div>
                            {vat !== undefined && (
                                <div className="flex justify-between">
                                    <span>VAT:</span>
                                    <span>{loading ? "..." : new Intl.NumberFormat("en-ET", {
                                        style: "currency",
                                        currency: "ETB",
                                    }).format(vat)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    Booking Statistics
                </h3>
                <Tabs
                    value={period}
                    onValueChange={(v) => setPeriod(v as Period)}
                    className="w-full sm:w-auto"
                >
                    <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto grid grid-cols-4 sm:flex">
                        {["Daily", "Weekly", "Monthly", "Yearly"].map((p) => (
                            <TabsTrigger
                                key={p}
                                value={p.toLowerCase()}
                                className="rounded-lg font-bold text-xs uppercase tracking-wide data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                            >
                                {p}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Paid / Completed"
                    count={stats.paid.count}
                    amount={stats.paid.amount}
                    commission={stats.paid.commission}
                    vat={stats.paid.vat}
                    icon={CheckCircle2}
                    colorClass="text-green-600"
                    bgClass="bg-green-50"
                />
                <StatCard
                    title="Pending"
                    count={stats.pending.count}
                    amount={stats.pending.amount}
                    commission={stats.pending.commission}
                    vat={stats.pending.vat}
                    icon={Clock}
                    colorClass="text-amber-600"
                    bgClass="bg-amber-50"
                />
                <StatCard
                    title="Active / Unpaid"
                    count={stats.unpaid.count}
                    amount={stats.unpaid.amount}
                    commission={stats.unpaid.commission}
                    vat={stats.unpaid.vat}
                    icon={AlertCircle}
                    colorClass="text-primary"
                    bgClass="bg-primary/5"
                />
            </div>
        </div>
    );
}
