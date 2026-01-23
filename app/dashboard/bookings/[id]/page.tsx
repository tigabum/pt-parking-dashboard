"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    CreditCard,
    Clock,

    Timer,

    AlertCircle,
    Loader2,
    LogOut,
    Check,
    Star,
    PlayCircle,
    Trash2
} from "lucide-react";
import dayjs from "dayjs";
import { getImageUrl } from "@/lib/utils";
import duration from "dayjs/plugin/duration";

import { useAuth } from "@/app/context/auth-context";
import { bookingService } from "@/lib/services/booking-service";
import { parkingService } from "@/lib/services/parking-service";
import { BookingResponse, ParkingResponse, BookingStatus } from "@/components/types";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

dayjs.extend(duration);


import { DetailLayout, DetailSection, DetailItem } from "@/components/layouts/detail-layout";
import { cn } from "@/lib/utils";
import { RatingDialog } from "@/components/parkings/rating-dialog";

export default function BookingDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, canAccess } = useAuth();
    const [booking, setBooking] = useState<BookingResponse | null>(null);
    const [parking, setParking] = useState<ParkingResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [sessionDuration, setSessionDuration] = useState<string>("00:00:00");
    const [isExtendOpen, setIsExtendOpen] = useState(false);
    const [newEndTime, setNewEndTime] = useState("");
    const [extending, setExtending] = useState(false);
    const [elapsedCost, setElapsedCost] = useState<number>(0);
    const [extraCost, setExtraCost] = useState<number>(0);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    useEffect(() => {
        const updateTimer = () => {
            let durationMinutes = 0;
            let finalHours = 0;

            if (booking?.totalDurationMinutes) {
                // Use saved duration
                durationMinutes = booking.totalDurationMinutes;
                finalHours = durationMinutes / 60;
            } else if (booking?.startTime) {
                const start = dayjs(booking.startTime);
                const now = dayjs(); // Live count

                // If booking is done but no duration saved yet (legacy or slight delay), use endTime if valid
                if (booking.status === BookingStatus.PAID || booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED || booking.status === BookingStatus.EXPIRED) {
                    if (booking.endTime) {
                        const end = dayjs(booking.endTime);
                        durationMinutes = end.diff(start, 'minute');
                    } else {
                        // Fallback? or just keep counting?
                        // If it's paid, it should stop. Let's assume 'now' if no endTime, but that's wrong.
                        // Assuming endTime is set when status changed.
                        const diff = dayjs.duration(now.diff(start));
                        durationMinutes = diff.asMinutes();
                    }
                } else {
                    // Live counting for PENDING/ACTIVE
                    const diff = dayjs.duration(now.diff(start));
                    durationMinutes = diff.asMinutes();
                }

                finalHours = durationMinutes / 60;
            }

            if (durationMinutes > 0) {
                const hours = Math.floor(durationMinutes / 60);
                const minutes = Math.floor(durationMinutes % 60);
                const seconds = 0; // We might lose seconds precision with totalDurationMinutes, but acceptable.

                // If live, we want seconds.
                if (!booking?.totalDurationMinutes && (booking?.status === BookingStatus.PENDING || booking?.status === BookingStatus.ACTIVE)) {
                    const start = dayjs(booking?.startTime);
                    const now = dayjs();
                    const diff = dayjs.duration(now.diff(start));
                    setSessionDuration(
                        `${Math.floor(diff.asHours()).toString().padStart(2, "0")}:${diff.minutes().toString().padStart(2, "0")}:${diff.seconds().toString().padStart(2, "0")}`
                    );
                    if (parking?.pricing?.hourly?.price) {
                        setElapsedCost(diff.asHours() * parking.pricing.hourly.price);
                    }
                } else {
                    // Frozen display
                    setSessionDuration(
                        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`
                    );
                    // If finalized totalAmount is there, use it? Or calc?
                    // If we have totalDurationMinutes, cost should be fixed?
                    if (parking?.pricing?.hourly?.price) {
                        setElapsedCost(finalHours * parking.pricing.hourly.price);
                    }
                }
            }
        };

        updateTimer(); // Run once immediately
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [booking, parking?.pricing?.hourly?.price]);

    useEffect(() => {
        if (booking?.endTime && newEndTime && parking?.pricing?.hourly?.price) {
            const currentEnd = dayjs(booking.endTime);
            const extendedEnd = dayjs(newEndTime);
            const diff = dayjs.duration(extendedEnd.diff(currentEnd));
            const extraHours = Math.max(0, diff.asHours());
            setExtraCost(extraHours * parking.pricing.hourly.price);
        } else {
            setExtraCost(0);
        }
    }, [newEndTime, booking?.endTime, parking?.pricing?.hourly?.price]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await bookingService.getBookingById(id as string);
            if (res && res.data) {
                const b = res.data;
                const mapped: BookingResponse = {
                    id: b.id,
                    referenceNo: b.referenceNo || b.bookingNumber,
                    parkingId: b.parkingId,
                    customerName: b.customerName || b.customer?.fullName || "",
                    customerPhone: b.customerPhone || b.customer?.phoneNumber || "",
                    plateNumber: b.plateNumber || b.vehicle?.plateNumber || "",
                    startTime: b.startTime,
                    endTime: b.endTime,
                    status: b.status as any,
                    type: (b.bookingType || b.type) as any,
                    totalAmount: String(b.totalAmount),
                    commission: b.commission,
                    commissionAmount: b.commissionAmount,
                    vatAmount: b.vatAmount,
                    paymentMethod: b.paymentMethod,
                    isVatIncluded: b.isVatIncluded,
                    vehicleName: b.vehicleName,
                    vehicleBrand: b.vehicleBrand || b.vehicle?.brand,
                    vehicleModel: b.vehicleModel || b.vehicle?.model,
                    bookingMethod: b.bookingMethod as any,
                    createdAt: b.createdAt,
                    updatedAt: b.updatedAt,
                    totalDurationMinutes: b.totalDurationMinutes,
                    createdBy: b.createdBy,
                    updatedBy: b.updatedBy,
                    confirmedBy: b.status === 'PAID' ? b.updatedBy : null,
                };
                setBooking(mapped);
                setNewEndTime(dayjs(b.endTime).format("YYYY-MM-DDTHH:mm"));

                if (b.parkingId) {
                    try {
                        const pRes = await parkingService.getParkingById(b.parkingId);
                        if (pRes && pRes.data) {
                            setParking(pRes.data);
                        }
                    } catch (error) {
                        console.warn("Failed to load parking details", error);
                    }
                }
            }
        } catch (err) {
            toast.error("Failed to load booking details");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!id || !booking) return;
        if (!confirm("Are you sure you want to confirm the payment for this booking?")) return;

        const loadingToast = toast.loading("Confirming payment...");
        try {
            setIsActionInProgress(true);
            await bookingService.updateBookingStatus(id as string, 'PAID', booking.totalAmount);
            toast.success("Payment Verified Successfully", { id: loadingToast });
            await loadData();
        } catch (err) {
            toast.error("Failed to confirm payment", { id: loadingToast });
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleConfirmArrival = async () => {
        if (!id || !booking) return;
        if (!confirm("Confirm arrival for this booking? Session will start now.")) return;

        const loadingToast = toast.loading("Confirming arrival...");
        try {
            setIsActionInProgress(true);
            await bookingService.updateBookingStatus(id as string, BookingStatus.ACTIVE);
            toast.success("Arrival confirmed. Session active.", { id: loadingToast });
            await loadData();
        } catch (err) {
            toast.error("Failed to confirm arrival", { id: loadingToast });
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleCheckout = async () => {
        if (!id || !booking) return;
        if (!confirm("Confirm checkout and finalize payment for this session?")) return;

        const loadingToast = toast.loading("Processing checkout...");
        try {
            setIsActionInProgress(true);
            // For hourly sessions, we use the elapsed cost calculated by the timer
            const finalAmount = booking.type === 'HOURLY' ? elapsedCost.toFixed(2) : booking.totalAmount;
            await bookingService.updateBookingStatus(id as string, 'PAID', finalAmount);
            toast.success("Checkout successful", { id: loadingToast });
            await loadData();
        } catch (err) {
            toast.error("Failed to checkout", { id: loadingToast });
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleExtend = async () => {
        if (!id || !newEndTime) return;
        const loadingToast = toast.loading("Extending booking...");
        try {
            setExtending(true);
            await bookingService.extendBooking(id as string, newEndTime);
            toast.success("Booking extended successfully", { id: loadingToast });
            setIsExtendOpen(false);
            await loadData();
        } catch (err) {
            toast.error("Failed to extend booking", { id: loadingToast });
        } finally {
            setExtending(false);
        }
    };

    const handleCancel = async () => {
        if (!id || !booking) return;
        if (!confirm(`Are you sure you want to cancel booking ${booking.referenceNo}?`)) return;

        const loadingToast = toast.loading("Cancelling booking...");
        try {
            setIsActionInProgress(true);
            await bookingService.updateBookingStatus(id as string, BookingStatus.CANCELLED);
            toast.success("Booking Cancelled", { id: loadingToast });
            await loadData();
        } catch (err) {
            toast.error("Failed to cancel booking", { id: loadingToast });
        } finally {
            setIsActionInProgress(false);
        }
    };

    const formatDateTime = (date?: string | null) =>
        date ? new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : "—";

    const formatMoney = (amount?: number | string | null) =>
        amount != null ? `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB` : "—";

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-bold text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                <p className="uppercase tracking-widest text-[10px]">Synchronizing Session Data...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="h-16 w-16 text-red-500/20" />
                <p className="text-xl font-bold text-slate-900">Booking not found</p>
                <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const canExtend = canAccess([UserRole.PARKING_MANAGER, UserRole.PARKING_SUPER_ADMIN]);

    return (
        <DetailLayout
            backLink={{ label: "Bookings", href: "/dashboard/bookings" }}
            title={`Booking #${booking.referenceNo}`}
            subtitle={`Reference ID: ${booking.id.substring(0, 12).toUpperCase()}`}
            actions={
                <div className="flex items-center gap-3">
                    {canExtend && (booking.status === "PENDING" || booking.status === "ACTIVE") && (
                        <Button
                            onClick={() => setIsExtendOpen(true)}
                            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Extend
                        </Button>
                    )}
                    {canExtend && booking.status === "PENDING" && (
                        <Button
                            onClick={handleConfirmArrival}
                            disabled={isActionInProgress}
                            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            {isActionInProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                            Confirm Arrival
                        </Button>
                    )}
                    {canExtend && booking.status === "ACTIVE" && (
                        <Button
                            onClick={handleCheckout}
                            disabled={isActionInProgress}
                            className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            {isActionInProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
                            Checkout
                        </Button>
                    )}
                    {canExtend && (booking.status === "PENDING" || booking.status === "COMPLETED") && (
                        <Button
                            onClick={handleConfirmPayment}
                            disabled={isActionInProgress}
                            className="h-10 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            {isActionInProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                            {booking.status === "COMPLETED" ? "Confirm Payment Request" : "Confirm Payment"}
                        </Button>
                    )}
                    {canExtend && booking.status === "PENDING" && (
                        <Button
                            onClick={handleCancel}
                            disabled={isActionInProgress}
                            variant="destructive"
                            className="h-10 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            {isActionInProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Cancel Booking
                        </Button>
                    )}
                    <Badge
                        className={cn(
                            (booking.status as any) === 'PAID' || (booking.status as any) === 'COMPLETED' ? 'bg-emerald-500 shadow-emerald-100 text-white' :
                                (booking.status as any) === 'ACTIVE' ? 'bg-blue-600 shadow-blue-100 text-white' :
                                    (booking.status as any) === 'CANCELLED' ? 'bg-red-500 shadow-red-100 text-white' :
                                        (booking.status as any) === 'EXPIRED' ? 'bg-slate-500 shadow-slate-100 text-white' :
                                            (booking.status as any) === 'REFUNDED' ? 'bg-indigo-500 shadow-indigo-100 text-white' :
                                                'bg-amber-500 shadow-amber-100 text-white'
                        )}
                    >
                        {booking.status}
                    </Badge>
                </div>
            }
        >
            <DetailSection title="Session Intelligence">
                <DetailItem label="Status" value={
                    <Badge variant="outline" className="rounded-lg font-bold px-3 py-1 bg-white">
                        {booking.status}
                    </Badge>
                } />
                <DetailItem label="Live Duration" value={
                    <div className={cn(
                        "flex items-center gap-2 font-black tabular-nums transition-all duration-500",
                        (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.ACTIVE)
                            ? "text-primary scale-110 origin-left"
                            : "text-slate-400"
                    )}>
                        <Timer className={cn("h-4 w-4", (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.ACTIVE) && "animate-pulse")} />
                        {sessionDuration}
                        {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.ACTIVE) && (
                            <span className="ml-2 px-2 py-0.5 bg-primary/5 text-[8px] uppercase tracking-tighter rounded-md animate-bounce">Live Session</span>
                        )}
                    </div>
                } />
                {elapsedCost > 0 && <DetailItem label="Current Cost" value={formatMoney(elapsedCost)} />}
                <DetailItem label="Final Total" value={formatMoney(booking.totalAmount)} />
                <DetailItem label="Arrival Time" value={formatDateTime(booking.startTime)} />
                <DetailItem label="Departure Time" value={booking.endTime ? formatDateTime(booking.endTime) : "Open Ended"} />
                {booking.type && <DetailItem label="Booking Type" value={<Badge variant="secondary" className="font-bold">{booking.type}</Badge>} />}
                {booking.bookingMethod && <DetailItem label="Booking Method" value={<Badge variant="outline" className="font-bold uppercase tracking-widest text-[9px]">{booking.bookingMethod}</Badge>} />}
            </DetailSection>

            <DetailSection title="Financial Reconciliation">
                <DetailItem label="Final Amount" value={<span className="text-lg font-black text-slate-900">{formatMoney(booking.totalAmount)}</span>} />
                {booking.commissionAmount !== null && <DetailItem label="Service Fee" value={formatMoney(booking.commissionAmount || 0)} className="text-primary" />}
                {booking.vatAmount !== null && <DetailItem label="VAT Amount" value={formatMoney(booking.vatAmount || 0)} className="text-slate-500" />}
                <DetailItem label="VAT Status" value={booking.isVatIncluded ? "Included" : "Excluded"} />
                {booking.paymentMethod && (
                    <DetailItem label="Payment Source" value={
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-slate-400" />
                            <span className="font-bold">{booking.paymentMethod}</span>
                        </div>
                    } />
                )}
                <DetailItem label="Ref Number" value={<span className="font-mono text-xs font-bold text-slate-500">{booking.referenceNo}</span>} />
                <DetailItem label="Settlement" value={<Badge className={booking.status === 'PAID' ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>{booking.status === 'PAID' ? "SETTLED" : "OUTSTANDING"}</Badge>} />
            </DetailSection>

            <DetailSection title="Customer & Asset Registry">
                {booking.customerName && <DetailItem label="Customer Name" value={booking.customerName} />}
                {booking.customerPhone && <DetailItem label="Contact Phone" value={booking.customerPhone} />}
                <DetailItem label="Plate Number" value={
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono font-black text-sm tracking-wider uppercase">
                        {booking.plateNumber}
                    </span>
                } />
                {(booking.vehicleName || booking.vehicleBrand || booking.vehicleModel) && (
                    <DetailItem label="Vehicle Asset" value={`${booking.vehicleName || booking.vehicleBrand || ""} ${booking.vehicleModel || ""}`.trim() || "—"} />
                )}
            </DetailSection>

            <DetailSection title="System Traceability">
                <DetailItem label="Created At" value={dayjs(booking.createdAt).format("MMM D, YYYY HH:mm")} />
                <DetailItem label="Last Change" value={dayjs(booking.updatedAt).format("MMM D, YYYY HH:mm")} />
                {booking.createdBy && (
                    <DetailItem label="Originator" value={
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{booking.createdBy?.fullName || "—"}</span>
                            {booking.createdBy?.email && <span className="text-[10px] text-slate-400 font-medium">{booking.createdBy.email}</span>}
                        </div>
                    } />
                )}
                {booking.status === 'PAID' && booking.confirmedBy && (
                    <DetailItem label="Confirmed By" value={
                        <div className="flex flex-col">
                            <span className="font-bold text-green-600">{booking.confirmedBy?.fullName || "—"}</span>
                            {booking.confirmedBy?.email && <span className="text-[10px] text-slate-400 font-medium">{booking.confirmedBy.email}</span>}
                        </div>
                    } />
                )}
                {parking?.name && <DetailItem label="Parking Terminal" value={parking?.name} />}
                {(parking?.city || parking?.subCity) && <DetailItem label="Terminal Addr" value={[parking?.city, parking?.subCity, parking?.woreda].filter(Boolean).join(", ")} />}
            </DetailSection>

            {/* Redesigned Extension Dialog */}
            <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-primary p-8 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight uppercase tracking-[0.1em]">Extend Session</DialogTitle>
                        </DialogHeader>
                        <p className="text-white/40 font-medium text-[10px] uppercase tracking-widest mt-2">Adjust departure alignment and reconcile live pricing.</p>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Expiration</Label>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                                    {formatDateTime(booking.endTime)}
                                    <Clock className="h-4 w-4 opacity-30" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-primary tracking-widest">New Alignment</Label>
                                <Input
                                    type="datetime-local"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                    className="h-12 rounded-xl border-slate-200 text-sm font-bold focus:ring-primary/20 transition-all"
                                />
                            </div>

                            {extraCost > 0 && (
                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Adjustment</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Incremental</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-primary tracking-tight">{formatMoney(extraCost)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 pt-4">
                            <Button
                                onClick={handleExtend}
                                disabled={extending || !newEndTime}
                                className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95"
                            >
                                {extending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Change"}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setIsExtendOpen(false)}
                                className="h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50"
                            >
                                Abandon
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </DetailLayout>
    );
}
