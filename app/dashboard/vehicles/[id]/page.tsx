"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { vehicleService } from "@/lib/services/vehicle-service";
import { bookingService } from "@/lib/services/booking-service";
import { BookingResponse } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    ArrowLeft, Car, User, Calendar, Hash,
    ShieldCheck, Info, Clock, Layers, Wallet,
    CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import dayjs from "dayjs";

import { DetailLayout, DetailSection, DetailItem } from "@/components/layouts/detail-layout";
import { cn } from "@/lib/utils";

export default function VehicleDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [vehicle, setVehicle] = useState<any | null>(null);
    const [recentBookings, setRecentBookings] = useState<BookingResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const vRes = await vehicleService.getVehicleById(id as string);
            if (vRes && vRes.data) {
                setVehicle(vRes.data);

                // Fetch recent bookings for this vehicle
                const bRes = await bookingService.getAllBookings({
                    plateNumber: vRes.data.plateNumber,
                    limit: 5
                });
                if (bRes && bRes.data) {
                    setRecentBookings(bRes.data);
                }
            }
        } catch (err) {
            toast.error("Failed to load vehicle details");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-bold text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                <p className="uppercase tracking-widest text-[10px]">Scanning Vehicle Protocols...</p>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="h-16 w-16 text-red-500/20" />
                <p className="text-xl font-bold text-slate-900">Vehicle not found</p>
                <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <DetailLayout
            backLink={{ label: "Vehicles", href: "/dashboard/vehicles" }}
            title={vehicle.plateNumber}
            subtitle={`${vehicle.brand} ${vehicle.model}`}
            actions={
                <div className="flex items-center gap-3">
                    <Badge className="h-10 px-5 rounded-xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest bg-green-500 text-white border-none">
                        Verified Asset
                    </Badge>
                </div>
            }
        >
            <DetailSection title="Vehicle Identity">
                <DetailItem label="Plate Number" value={
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono font-black text-sm tracking-wider uppercase">
                        {vehicle.plateNumber}
                    </span>
                } />
                <DetailItem label="Brand" value={vehicle.brand} />
                <DetailItem label="Model" value={vehicle.model} />
                <DetailItem label="Asset Hash" value={vehicle.id.substring(0, 12).toUpperCase()} />
                <DetailItem label="Registry Date" value={dayjs(vehicle.createdAt).format("MMM D, YYYY")} />
                <DetailItem label="Compliance Status" value="Active" />
            </DetailSection>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DetailSection title="Owner Context" className="lg:col-span-1">
                    <div className="flex items-center gap-5 p-2">
                        <div className="h-20 w-20 rounded-3xl bg-slate-900 border-2 border-slate-100 shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
                            {vehicle.customer?.profileImage ? (
                                <img src={getImageUrl(vehicle.customer.profileImage)} className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-10 w-10 text-white/40" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Primary Legal User</p>
                            <p className="text-lg font-black text-slate-900 leading-tight truncate">{vehicle.customer?.fullName || "Private Entity"}</p>
                            <p className="text-xs text-slate-400 font-medium">{vehicle.customer?.phoneNumber || "No Contact"}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => vehicle.customer?.id && router.push(`/dashboard/customers/${vehicle.customer.id}`)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl h-10 px-4 font-bold transition-all text-[10px] uppercase tracking-widest"
                        >
                            Profile
                        </Button>
                    </div>
                </DetailSection>

                <DetailSection title="Recent Movement" className="lg:col-span-1">
                    <div className="space-y-4 pt-2">
                        {recentBookings.length > 0 ? (
                            recentBookings.map((b) => (
                                <div key={b.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm leading-none">Parking Session</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Ref: {b.referenceNo}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-sm leading-none mb-1">{Number(b.totalAmount).toLocaleString()} ETB</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{dayjs(b.startTime).format("MMM D, HH:mm")}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-300">
                                <Layers className="h-10 w-10 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest leading-none">No movement detected</p>
                            </div>
                        )}
                    </div>
                </DetailSection>
            </div>
        </DetailLayout>
    );
}
