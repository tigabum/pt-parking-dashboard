"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { portalService } from '@/lib/services/portal-service';
import { Booking, Parking, BookingMethod, PaymentMethod } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Loader2,
    Car,
    Clock,
    Receipt,
    CheckCircle,
    Smartphone,
    Check,
    ChevronRight,
    ChevronLeft,
    MapPin,
    Sparkles,
    User,
    Wallet,
    ShieldCheck,
    Search,
    CalendarClock,
    Info,
    ArrowRight,
    ParkingCircle,
    Phone,
    CreditCard,
    BadgeCheck,
    History,
    Zap,
    Box,
    Layers,
    DollarSign,
    Tags,
    Map,
    Landmark,
    AlertCircle,
    Plus,
    LogOut
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { CircularSessionCounter } from "@/components/ui/circular-session-counter";
import { RatingDialog } from "@/components/parkings/rating-dialog";

const SYSTEM_PRIMARY = "#0066FF";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function PortalContent() {
    const searchParams = useSearchParams();
    const parkingId = searchParams.get("parkingId") || searchParams.get("spaceId"); // Support both for backward compatibility

    const [loading, setLoading] = useState(true);
    const [parking, setParking] = useState<Parking | null>(null);
    const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

    // Flow State
    const [step, setStep] = useState(0); // 0: Lookup, 1: Full Form

    // Form States - Empty defaults for production feel
    const [phoneNumber, setPhoneNumber] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [fullName, setFullName] = useState("");
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [isExistingCustomer, setIsExistingCustomer] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [paymentCategory, setPaymentCategory] = useState<PaymentMethod>(PaymentMethod.INCASH);
    const [searching, setSearching] = useState(false);
    const [isRatingOpen, setIsRatingOpen] = useState(false);
    const [isExtendOpen, setIsExtendOpen] = useState(false);
    const [newEndTimeLocal, setNewEndTimeLocal] = useState("");
    const [extending, setExtending] = useState(false);

    // Booking details
    const [bookingType, setBookingType] = useState<"HOURLY" | "DAILY" | "MONTHLY">("HOURLY");
    const [duration, setDuration] = useState("1");
    // Initialize with Local Time (ISO-like) for Input fields
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localNow = new Date(Date.now() - tzOffset);
    const localEnd = new Date(Date.now() - tzOffset + 3600000);

    const [startTime, setStartTime] = useState(localNow.toISOString().slice(0, 16));
    const [endTime, setEndTime] = useState(localEnd.toISOString().slice(0, 16));

    const [error, setError] = useState<string | null>(null);

    // Initial Load & Session Recovery
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            if (!parkingId) {
                setError("No parking ID provided. Please scan the QR code again.");
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Parking Details
                const response = await portalService.getParkingDetails(parkingId);
                const parkingData = response.data || response;
                if (mounted) {
                    setParking(parkingData);
                }

                // 2. Check Persistence / Recovery
                const savedPhone = localStorage.getItem("guestPhone");
                const savedBookingId = localStorage.getItem("activeBookingId");

                // Priority 1: Check by specific Booking ID (Most reliable)
                if (savedBookingId) {
                    try {
                        const existingBooking = await portalService.getActiveBooking(
                            savedPhone ? normalizePhone(savedPhone) : null,
                            parkingId,
                            savedBookingId
                        );

                        if (existingBooking && ['PENDING', 'ACTIVE'].includes(existingBooking.status)) {
                            console.log("Resumed session via ID", existingBooking);
                            setActiveBooking(existingBooking);
                            if (existingBooking.customerPhone) {
                                setPhoneNumber(existingBooking.customerPhone);
                                localStorage.setItem("guestPhone", existingBooking.customerPhone);
                            }
                            // Ensure persistence
                            localStorage.setItem("activeBookingId", existingBooking.id);
                            localStorage.setItem("guestPlate", existingBooking.plateNumber || "");

                            if (mounted) setLoading(false);
                            return; // Stop here, we found it
                        } else {
                            // Clear if it's no longer an active/pending session
                            localStorage.removeItem("activeBookingId");
                        }
                    } catch (e) {
                        console.warn("ID recovery failed, falling back to phone lookup", e);
                        localStorage.removeItem("activeBookingId"); // Clear stale ID
                    }
                }

                // Priority 2: Check by Phone Only (Fallback)
                if (savedPhone) {
                    const finalPhone = normalizePhone(savedPhone);
                    try {
                        const existingBooking = await portalService.getActiveBooking(finalPhone, parkingId);

                        if (existingBooking && ['PENDING', 'ACTIVE'].includes(existingBooking.status)) {
                            console.log("Resumed session via Phone", existingBooking);
                            setActiveBooking(existingBooking);
                            setPhoneNumber(savedPhone);
                            setPlateNumber(existingBooking.plateNumber || "");
                            setFullName(existingBooking.customerName || "");

                            localStorage.setItem("activeBookingId", existingBooking.id);
                            localStorage.setItem("guestPlate", existingBooking.plateNumber || "");
                        } else {
                            // No session or session finalized, clear storage and pre-fill profile
                            localStorage.removeItem("activeBookingId");
                            setPhoneNumber(savedPhone);
                            const savedPlate = localStorage.getItem("guestPlate");
                            if (savedPlate) setPlateNumber(savedPlate);

                            const result = await portalService.checkCustomer(finalPhone);
                            if (result.exists) {
                                setFullName(result.fullName || "");
                                setIsExistingCustomer(true);
                            }
                        }
                    } catch (err) {
                        console.error("Phone recovery failed", err);
                    }
                }
            } catch (e: any) {
                if (mounted) {
                    setError(e.response?.data?.message || "Failed to load parking details");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        init();
        return () => { mounted = false; };
    }, [parkingId]);

    // Polling active booking status
    useEffect(() => {
        if (!activeBooking || activeBooking.status === 'PAID') return;

        const pollInterval = setInterval(async () => {
            try {
                // Use ID for precise polling if available, fallback to phone
                const updated = await portalService.getActiveBooking(
                    normalizePhone(phoneNumber),
                    parkingId!,
                    activeBooking.id
                );

                if (updated) {
                    // Check if status changed from something else to a finalized state
                    const isNewFinalized = ['PAID', 'CANCELLED', 'REFUNDED'].includes(updated.status) && activeBooking.status !== updated.status;

                    if (isNewFinalized) {
                        if (updated.status === 'PAID') {
                            toast.success("Payment confirmed! You may now exit.");
                            setIsRatingOpen(true);
                        } else if (updated.status === 'CANCELLED') {
                            toast.error("Your booking has been cancelled.");
                        }
                        // Clean up session storage now that it's finalized
                        localStorage.removeItem("activeBookingId");
                    }
                    setActiveBooking(updated);
                }
            } catch (e) {
                console.warn("Polling error", e);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [activeBooking?.status, phoneNumber, parkingId, activeBooking?.id]);

    const normalizePhone = (phone: string) => {
        let p = phone.replace(/\D/g, '');
        if (p.startsWith('0')) p = p.substring(1);
        if (p.startsWith('251')) p = p.substring(3);
        return `+251${p}`;
    };

    const handleLookup = async () => {
        if (!phoneNumber || phoneNumber.length < 9) return toast.error("Valid phone number is required");
        if (!plateNumber || plateNumber.length < 5) return toast.error("Valid plate number is required");

        setSearching(true);
        try {
            const normalized = normalizePhone(phoneNumber);
            const upperPlate = plateNumber.toUpperCase().replace(/\s/g, '');

            // 1. Check for PENDING or ACTIVE or COMPLETED bookings (Resume session if exists)
            if (parkingId) {
                const active = await portalService.getActiveBooking(normalized, parkingId);
                if (active && (active.status === 'PENDING' || active.status === 'ACTIVE' || active.status === 'COMPLETED')) {
                    setActiveBooking(active);
                    localStorage.setItem("guestPhone", phoneNumber);
                    localStorage.setItem("guestPlate", plateNumber || active.plateNumber || "");
                    localStorage.setItem("activeBookingId", active.id);
                    toast.success("Welcome back! Your session has been resumed.");
                    setSearching(false);
                    return;
                }
            }

            // 2. If no active/pending session, look up customer profile to pre-fill
            const result = await portalService.checkCustomer(normalized);
            if (result.exists) {
                setFullName(result.fullName || "");
                setIsExistingCustomer(true);

                // Find vehicle by plate
                const cleanPlate = (p: string) => p.replace(/\s/g, '').toUpperCase();
                const targetPlate = cleanPlate(plateNumber);
                const vehicle = result.vehicles?.find((v: any) => cleanPlate(v.plateNumber) === targetPlate);

                if (vehicle) {
                    setBrand(vehicle.brand || "");
                    setModel(vehicle.model || "");
                }
                toast.success(`Profile found!`);
            } else {
                setIsExistingCustomer(false);
                setFullName("");
                setBrand("");
                setModel("");
            }
            setStep(1); // Move to full form for new booking
        } catch (e) {
            console.error("Lookup failed", e);
            setStep(1); // Proceed anyway to let user entry manually
        } finally {
            setSearching(false);
        }
    };

    const calculateEstimate = () => {
        if (!parking || !parking.pricing) return 0;
        const start = dayjs(startTime);
        const end = dayjs(endTime);
        const durationMs = end.diff(start);
        if (durationMs <= 0) return 0;

        const pricing =
            bookingType === 'MONTHLY'
                ? parking.pricing.monthly
                : bookingType === 'DAILY'
                    ? parking.pricing.daily
                    : parking.pricing.hourly;

        if (!pricing || !pricing.price) return 0;

        let total = 0;
        if (bookingType === 'HOURLY') {
            const hours = durationMs / (1000 * 60 * 60);
            total = pricing.price * hours;
        } else if (bookingType === 'DAILY') {
            const days = durationMs / (1000 * 60 * 60 * 24);
            total = pricing.price * Math.ceil(days);
        } else {
            const days = durationMs / (1000 * 60 * 60 * 24);
            const months = days / 30;
            total = pricing.price * months;
        }

        const discounted = total * (1 - (pricing.discount || 0) / 100);
        return discounted;
    };

    const handleStartParking = async () => {
        console.log("handleStartParking triggered", { parking, phoneNumber, plateNumber, fullName, paymentCategory });

        if (!parking) {
            toast.error("Parking space data missing. Please try refreshing or rescanning.");
            return;
        }
        if (!phoneNumber || !plateNumber) return toast.error("Required fields are missing");
        if (!fullName) return toast.error("Please enter your name");

        try {
            toast.loading("Creating booking session...");
            // Recalculate times to ensure session starts at 00:00:00 relative to now
            // Recalculate times. Open-ended session: Default to 1 hour initial duration.
            const now = new Date();
            const startObj = new Date(startTime);
            // Default End = Start + 1 hour
            const newEnd = new Date(startObj.getTime() + 60 * 60 * 1000);

            const payload = {
                parkingId: parking.id,
                customerName: fullName,
                customerPhone: normalizePhone(phoneNumber),
                plateNumber: plateNumber.toUpperCase().replace(/\s/g, ''),
                vehicleBrand: brand || "Generic",
                vehicleModel: model || "Car",
                startTime: now.toISOString(),
                endTime: newEnd.toISOString(),
                bookingType: bookingType,
                bookingMethod: "QR",
                paymentMethod: paymentCategory, // Strictly usage of category (TRANSFER / INCASH)
            };

            const response = await portalService.createBooking(payload);
            console.log("Create Booking Response:", response);

            toast.dismiss();

            // Strict check based on portalService return type
            if (response.success && response.data?.booking) {
                setActiveBooking(response.data.booking);
                localStorage.setItem("guestPhone", phoneNumber);
                localStorage.setItem("guestPlate", plateNumber);
                localStorage.setItem("activeBookingId", response.data.booking.id);
                toast.success(response.message || "Parking Session Started!");
                return;
            }

            // Fallback error
            console.error("Booking creation failed structure:", response);
            toast.error(response.message || "Failed to initiate session. Please try again.");

        } catch (e: any) {
            toast.dismiss();
            console.error("Booking Create Error:", e);
            const msg = e.response?.data?.message;
            if (Array.isArray(msg)) {
                // Show first few errors to avoid spamming
                msg.slice(0, 3).forEach((m: string) => toast.error(m));
            } else {
                toast.error(msg || e.message || "Failed to start parking");
            }
        }
    };

    const handleEndParking = async () => {
        if (!activeBooking) return;
        try {
            const response = await portalService.stopSession(activeBooking.id, normalizePhone(phoneNumber));
            setActiveBooking(response);
            toast.success(response.message || "Session ended. Please proceed to payment.");
        } catch (e: any) {
            toast.error(e.response?.data?.message || e.message || "Failed to end session");
        }
    };

    const handleExtend = async () => {
        if (!activeBooking || !newEndTimeLocal) return;
        const loadingToast = toast.loading("Extending session...");
        try {
            setExtending(true);
            const updated = await portalService.extendBooking(activeBooking.id, normalizePhone(phoneNumber), newEndTimeLocal);
            setActiveBooking(updated);
            setIsExtendOpen(false);
            toast.success("Session extended successfully", { id: loadingToast });
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Extension failed", { id: loadingToast });
        } finally {
            setExtending(false);
        }
    };

    const handleOpenExtend = () => {
        if (activeBooking?.endTime) {
            // Set default extension to 1 hour from current end
            const currentEnd = dayjs(activeBooking.endTime);
            setNewEndTimeLocal(currentEnd.add(1, 'hour').format("YYYY-MM-DDTHH:mm"));
        }
        setIsExtendOpen(true);
    };

    const handleSelectPayment = async (method: "INCASH" | "TRANSFER") => {
        if (!activeBooking) return;
        const loadingToast = toast.loading("Updating payment method...");
        try {
            const response = await portalService.stopSession(activeBooking.id, normalizePhone(phoneNumber), method);
            setActiveBooking(response);
            setSelectedPaymentMethod(method === "INCASH" ? "CASH" : "TELEBIRR");

            if (method === "TRANSFER") {
                toast.success(response.message || "Redirecting to Telebirr...", { id: loadingToast });
                handleTelebirrPayment();
            } else {
                toast.success(response.message || "Please pay the attendant and wait for verification.", { id: loadingToast, duration: 10000 });
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to update payment method", { id: loadingToast });
        }
    };

    const handleTelebirrPayment = async () => {
        if (!activeBooking) return;
        try {
            toast.loading("Initializing Telebirr payment...");
            const rawUrl = await portalService.initializeTelebirrPayment(
                (activeBooking.referenceNo || activeBooking.id).trim(),
                activeBooking.totalAmount.toString()
            );

            if (!rawUrl) throw new Error("No payment URL");

            toast.dismiss();
            toast.success("Redirecting to Telebirr...");
            window.open(rawUrl.trim(), '_blank');
        } catch (e) {
            toast.dismiss();
            toast.error("Payment initialization failed");
        }
    };

    // --- RENDER HELPERS ---

    if (loading) {
        return (
            <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 text-slate-300 animate-spin mb-4" />
                <p className="text-slate-300 font-bold uppercase text-[9px] tracking-[0.3em]">Loading Portal</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-sm w-full space-y-6">
                    <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <p className="text-slate-500 font-medium">{error}</p>
                    <Button onClick={() => window.location.reload()} className="w-full h-12 rounded-xl bg-slate-900 border-none transition-transform active:scale-95">Retry</Button>
                </div>
            </div>
        );
    }

    // --- VIEWS ---
    if (activeBooking) {
        if (activeBooking.status === 'PAID') {
            return (
                <div className="min-h-screen w-full bg-[#FAFAFA] flex items-center justify-center p-4 sm:p-6 antialiased">
                    <Card className="w-full max-w-lg border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] rounded-[3rem] overflow-hidden bg-white animate-in zoom-in-95 duration-500">
                        <div className="bg-[#00C853] p-10 sm:p-14 text-white text-center relative overflow-hidden">
                            {/* Abstract Background patterns */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute top-[-10%] right-[-10%] w-40 h-40 rounded-full bg-white blur-3xl" />
                                <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 rounded-full bg-white blur-3xl" />
                            </div>

                            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 backdrop-blur-md relative z-10 border border-white/30 shadow-2xl">
                                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white drop-shadow-lg" />
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black mb-2 leading-tight tracking-tight relative z-10">Safe Travels!</h2>
                            <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-[9px] sm:text-[10px] relative z-10">Gate Authorization Active</p>
                        </div>

                        <CardContent className="p-8 sm:p-12 space-y-8 sm:space-y-10">
                            <div className="space-y-6">
                                <div className="p-6 sm:p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Vehicle Alignment</p>
                                        <p className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-wider">
                                            {activeBooking.plateNumber}
                                        </p>
                                    </div>
                                    <div className="h-px w-full bg-slate-100" />
                                    <div className="w-full grid grid-cols-2 gap-4">
                                        <div className="text-left">
                                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Fee Settled</p>
                                            <p className="font-bold text-slate-900 text-sm">{Number(activeBooking.totalAmount).toFixed(2)} <span className="text-[10px] font-medium opacity-30">ETB</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Time Elapsed</p>
                                            <p className="font-bold text-slate-900 text-sm">{activeBooking.totalDurationMinutes || "—"} <span className="text-[10px] font-medium opacity-30">MIN</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50">
                                    <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <p className="text-[#007E33] font-bold text-[11px] leading-relaxed">
                                        Your payment has been reconciled. Scanning your plate will now trigger the automatic departure relay.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => setIsRatingOpen(true)}
                                    className="w-full h-14 rounded-[1.25rem] bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-[0.2em] transition-all active:scale-95 border-none shadow-lg shadow-amber-200 text-[10px] flex items-center justify-center gap-3"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Rate our Service
                                </Button>

                                <Button
                                    id="btn-portal-new-booking"
                                    onClick={() => {
                                        localStorage.removeItem("activeBookingId");
                                        setActiveBooking(null);
                                        setStep(0);
                                        toast.info("Session cleared. You can now start a new booking if needed.");
                                    }}
                                    className="w-full h-16 rounded-[1.5rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] transition-all active:scale-95 border-none shadow-none text-[10px] flex items-center justify-center gap-3"
                                >
                                    <LogOut className="h-4 w-4" />
                                    New Booking / Leave
                                </Button>
                                <p className="text-[9px] text-slate-300 text-center font-bold uppercase tracking-[0.2em]">Session ID: {activeBooking.id.substring(0, 8)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <RatingDialog
                        open={isRatingOpen}
                        onOpenChange={setIsRatingOpen}
                        parkingId={parking!.id}
                        parkingName={parking!.name}
                        customerPhone={normalizePhone(phoneNumber)}
                    />
                </div>
            );
        }

        const isSessionRunning = (activeBooking.status === 'PENDING' || activeBooking.status === 'ACTIVE');

        return (
            <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
                {isSessionRunning ? (
                    <ActiveSessionView
                        booking={activeBooking}
                        onEnd={handleEndParking}
                        onOpenExtend={handleOpenExtend}
                    />
                ) : (
                    <CheckoutView
                        booking={activeBooking}
                        selectedPaymentMethod={selectedPaymentMethod}
                        setSelectedPaymentMethod={setSelectedPaymentMethod}
                        onSelectPayment={handleSelectPayment}
                        onTelebirrPayment={handleTelebirrPayment}
                    />
                )}

                <ExtendDialog
                    open={isExtendOpen}
                    onOpenChange={setIsExtendOpen}
                    booking={activeBooking}
                    parking={parking!}
                    newEndTime={newEndTimeLocal}
                    setNewEndTime={setNewEndTimeLocal}
                    onConfirm={handleExtend}
                    isLoading={extending}
                />

                <RatingDialog
                    open={isRatingOpen}
                    onOpenChange={setIsRatingOpen}
                    parkingId={parking!.id}
                    parkingName={parking!.name}
                    customerPhone={normalizePhone(phoneNumber)}
                />
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
            {/* Premium Sticky Header */}
            <div className="sticky top-0 w-full flex items-center justify-between px-6 md:px-10 py-5 shrink-0 bg-white/80 backdrop-blur-md border-b shadow-sm z-30">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20">
                        <img src="/login-brand.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        Gelagle Park
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">Active Portal</span>
                        <ShieldCheck className="h-3 w-3 text-slate-400 sm:ml-1" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:p-8 pt-6 md:pt-20">
                <div className="max-w-[800px] mx-auto pb-20">
                    <div className="bg-white p-5 sm:p-8 md:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border shadow-sm space-y-8 md:space-y-10">

                        {step === 0 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto w-full">
                                <div className="text-center space-y-2 mb-8">
                                    <div className="flex justify-center mb-2">
                                        <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-lg border border-slate-100">
                                            <img src="/login-brand.png" alt="Logo" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {parking?.name || "Gelagle Park"}
                                    </h1>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-800 ml-1">
                                            License Plate
                                        </Label>
                                        <Input
                                            value={plateNumber}
                                            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                                            placeholder="Vehicle Plate Number"
                                            className="h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 placeholder:text-xs placeholder:text-slate-300 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-800 ml-1">
                                            Phone Number
                                        </Label>
                                        <Input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="Your Phone Number"
                                            className="h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 placeholder:text-xs placeholder:text-slate-300 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <Button
                                        onClick={handleLookup}
                                        disabled={searching || !phoneNumber || !plateNumber}
                                        className="w-full h-14 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all"
                                    >
                                        {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Register"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 max-w-sm mx-auto w-full">
                                <div className="text-center mb-6">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Complete Details</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Finalize Check-in</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-800 ml-1">
                                            {isExistingCustomer ? "Customer Name" : "Full Name"}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Full Name"
                                                readOnly={isExistingCustomer}
                                                className={cn(
                                                    "h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 placeholder:text-xs placeholder:text-slate-300 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-primary/20",
                                                    isExistingCustomer && "bg-emerald-50 text-emerald-900 pl-10"
                                                )}
                                            />
                                            {isExistingCustomer && <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-slate-800 ml-1">Brand</Label>
                                            <Input
                                                value={brand}
                                                onChange={(e) => setBrand(e.target.value)}
                                                placeholder="Vehicle Brand"
                                                className="h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 placeholder:text-xs placeholder:text-slate-300 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-slate-800 ml-1">Model</Label>
                                            <Input
                                                value={model}
                                                onChange={(e) => setModel(e.target.value)}
                                                placeholder="Vehicle Model"
                                                className="h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 placeholder:text-xs placeholder:text-slate-300 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-800 ml-1">Billing Type</Label>
                                        <Select value={bookingType} onValueChange={(v: any) => setBookingType(v)}>
                                            <SelectTrigger className="w-full h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 focus:ring-primary/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-xl">
                                                <SelectItem value="HOURLY" className="font-bold py-3">Hourly Billing</SelectItem>
                                                <SelectItem value="DAILY" className="font-bold py-3">Daily Pass</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-800 ml-1">Start Time</Label>
                                        <Input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 placeholder:text-xs placeholder:text-slate-300 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-800 ml-1">Payment Method</Label>
                                        <Select value={paymentCategory} onValueChange={(v: any) => setPaymentCategory(v)}>
                                            <SelectTrigger className="w-full h-14 bg-slate-100 border-none rounded-xl text-base px-4 font-bold text-slate-900 focus:ring-primary/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-xl">
                                                <SelectItem value={PaymentMethod.INCASH} className="font-bold py-3">Cash Payment</SelectItem>
                                                <SelectItem value={PaymentMethod.TRANSFER} className="font-bold py-3">Digital Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-6">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(0)}
                                        className="h-14 rounded-xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if ((parking?.availableSpots ?? 0) === 0) {
                                                toast.error("No available spots.");
                                                return;
                                            }
                                            setStep(2);
                                        }}
                                        className="h-14 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all w-full"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 min-h-[550px] flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-500 font-bold">
                                <div className="space-y-10">
                                    <div className="text-center space-y-3">
                                        <div className="h-16 w-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center mx-auto text-primary mb-2 shadow-sm border border-primary/5">
                                            <BadgeCheck className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Verify Session</h3>
                                        <p className="text-slate-400 text-xs font-medium max-w-[240px] mx-auto leading-relaxed">Review your allocation details before initiating the digital parking lock.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-5 bg-slate-50 rounded-2xl space-y-1 border border-transparent hover:border-slate-100 transition-all">
                                            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-[0.2em]">Registered Vehicle</p>
                                            <p className="text-slate-900 font-black text-sm">{plateNumber} • {brand}</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl space-y-1 border border-transparent hover:border-slate-100 transition-all">
                                            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-[0.2em]">Selected Billing</p>
                                            <p className="text-slate-900 font-black text-sm">{bookingType} Plan</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl space-y-1 border border-transparent hover:border-slate-100 transition-all sm:col-span-2">
                                            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-[0.2em]">Session Start</p>
                                            <p className="text-slate-900 font-black text-xs">
                                                {dayjs(startTime).format("MMM D, HH:mm")} — <span className="text-emerald-600">Open Session</span>
                                            </p>
                                        </div>
                                        <div className="p-6 bg-primary/[0.03] border border-primary/10 rounded-2xl space-y-1 sm:col-span-2 shadow-sm">
                                            <p className="text-[8px] uppercase font-black text-primary tracking-[0.2em]">Estimated Calculation</p>
                                            <p className="text-primary font-black text-3xl tabular-nums tracking-tighter">
                                                {calculateEstimate().toFixed(2)} <span className="text-xs ml-1">ETB</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 pt-10 border-t border-slate-50">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(1)}
                                        className="w-full sm:w-auto h-14 px-8 rounded-2xl font-bold text-slate-400 flex items-center justify-center gap-2 hover:bg-primary/10 hover:text-primary transition-all order-2 sm:order-1"
                                    >
                                        <ChevronLeft className="h-5 w-5" /> Refine Form
                                    </Button>
                                    <div className="w-full sm:w-auto order-1 sm:order-2">
                                        <Button
                                            onClick={handleStartParking}
                                            className="w-full h-14 sm:h-16 sm:px-12 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-black transition-all active:scale-95 uppercase tracking-[0.2em] border-none text-[10px] flex items-center justify-center gap-3 shadow-none"
                                        >
                                            Start
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Trust Footer */}
                    <div className="mt-8 flex items-center justify-center gap-3 opacity-40">
                        <ShieldCheck className="h-4 w-4 text-slate-900" />
                        <p className="text-[9px] text-slate-900 font-bold uppercase tracking-[0.3em]">End-To-End Security Enabled</p>
                    </div>
                </div>
            </div>
        </div >
    );
}

function ActiveSessionView({ booking, onEnd, onOpenExtend }: { booking: Booking; onEnd: () => void; onOpenExtend: () => void }) {
    const [elapsed, setElapsed] = useState("00:00:00");
    const [elapsedMinutes, setElapsedMinutes] = useState(0);
    const MIN_PARKING_MINUTES = 0;

    useEffect(() => {
        const calculateElapsed = () => {
            const start = new Date(booking.startTime).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, now - start);

            const hrs = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsed(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            setElapsedMinutes(Math.floor(diff / (1000 * 60)));
        };

        calculateElapsed();
        const interval = setInterval(calculateElapsed, 1000);
        return () => clearInterval(interval);
    }, [booking.startTime]);

    const canCheckout = elapsedMinutes >= MIN_PARKING_MINUTES;

    return (
        <div className="flex flex-col h-full min-h-[80vh] bg-white text-center justify-between py-10 px-6">
            <div className="space-y-8 flex flex-col items-center">
                {/* Brand Header */}
                <div className="space-y-6">
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg border border-slate-100">
                            <img src="/login-brand.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            <span className="text-[#0066FF]">GELAGLE</span> PARKING
                        </h1>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-slate-900">Parking session</h2>
                    <p className="text-slate-500 font-medium text-sm">Your session has started!</p>
                </div>
            </div>

            {/* Counter */}
            <div className="flex-1 flex items-center justify-center py-12">
                <CircularSessionCounter
                    startTime={booking.startTime}
                    endTime={booking.endTime || new Date().toISOString()}
                    displayTime={elapsed}
                    size={260}
                />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                <Button
                    className={cn(
                        "w-full h-16 rounded-xl font-bold text-base transition-all active:scale-95 border-none shadow-xl shadow-primary/20",
                        canCheckout
                            ? "bg-[#0066FF] hover:bg-[#0052CC] text-white"
                            : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    )}
                    onClick={onEnd}
                    disabled={!canCheckout}
                >
                    {canCheckout ? "Checkout" : "Initializing..."}
                </Button>

            </div>
        </div>
    );
}

function ExtendDialog({
    open,
    onOpenChange,
    booking,
    parking,
    newEndTime,
    setNewEndTime,
    onConfirm,
    isLoading
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    booking: Booking;
    parking: Parking;
    newEndTime: string;
    setNewEndTime: (v: string) => void;
    onConfirm: () => void;
    isLoading: boolean;
}) {
    const [extraCost, setExtraCost] = useState(0);

    useEffect(() => {
        if (booking.endTime && newEndTime && parking.pricing?.hourly?.price) {
            const currentEnd = dayjs(booking.endTime);
            const extendedEnd = dayjs(newEndTime);
            const diff = dayjs.duration(extendedEnd.diff(currentEnd));
            const extraHours = Math.max(0, diff.asHours());
            setExtraCost(extraHours * parking.pricing.hourly.price);
        } else {
            setExtraCost(0);
        }
    }, [newEndTime, booking.endTime, parking.pricing?.hourly?.price]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
                <div className="bg-primary p-10 text-white relative">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight uppercase tracking-widest leading-tight">Extend session</DialogTitle>
                        <DialogDescription className="text-white/40 font-bold uppercase tracking-widest text-[9px] mt-2">
                            Adjust departure alignment and reconcile live pricing.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Currently Expires</Label>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                                {dayjs(booking.endTime).format("MMM D, HH:mm")}
                                <Clock className="h-4 w-4 opacity-30" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-primary tracking-widest">New Departure Alignment</Label>
                            <Input
                                type="datetime-local"
                                value={newEndTime}
                                onChange={(e) => setNewEndTime(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg px-6 focus:ring-primary/10 transition-all"
                            />
                        </div>

                        {extraCost > 0 && (
                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Adjustment</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Incremental</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-primary tracking-tight">{extraCost.toFixed(2)} <span className="text-xs">ETB</span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            onClick={onConfirm}
                            disabled={isLoading || !newEndTime}
                            className="h-14 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 border-none shadow-none"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize Extension"}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-300 hover:bg-slate-50"
                        >
                            Abandon
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function CheckoutView({
    booking,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    onSelectPayment,
    onTelebirrPayment
}: {
    booking: Booking;
    selectedPaymentMethod: string | null;
    setSelectedPaymentMethod: (m: string | null) => void;
    onSelectPayment: (method: "INCASH" | "TRANSFER") => void;
    onTelebirrPayment: () => void;
}) {
    const [checkoutStep, setCheckoutStep] = useState<'summary' | 'categories' | 'transfer_methods'>('summary');

    // Transfer methods configuration (Disabled for now)
    const transferMethods = [
        { id: 'telebirr', name: 'Telebirr', icon: <Smartphone className="h-5 w-5" />, color: '#0089cf', active: true },
        { id: 'cbebirr', name: 'CBE Birr', icon: <Landmark className="h-5 w-5" />, color: '#7c2d82', active: false },
        { id: 'awash', name: 'Awash Birr', icon: <Layers className="h-5 w-5" />, color: '#ffd700', active: false },
    ];

    useEffect(() => {
        if (booking.paymentMethod === 'INCASH') {
            onSelectPayment("INCASH");
        } else if (booking.paymentMethod === 'TRANSFER') {
            // Transfer is disabled for now, but if it happens, we reset to summary
            setSelectedPaymentMethod(null);
        }
    }, [booking.paymentMethod]);

    if (booking.paymentMethod === "INCASH") {
        return (
            <Card className="w-full max-w-lg border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white animate-in zoom-in-95 duration-500">
                <div className="bg-slate-50 p-12 text-center rounded-b-[4rem]">
                    <div className="h-24 w-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200/50">
                        <Clock className="h-10 w-10 text-primary animate-spin" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 leading-tight uppercase tracking-tight">Awaiting Confirmation</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[8px]">Manager Verification Required</p>
                </div>
                <CardContent className="p-12 text-center space-y-8">
                    <div className="space-y-4">
                        <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-[280px] mx-auto">
                            Please present your plate number <span className="font-black text-slate-900 underline decoration-slate-200 underline-offset-4">{booking.plateNumber}</span> to the parking attendant for cash payment.
                        </p>
                        <div className="bg-slate-50 p-4 rounded-2xl inline-flex items-center gap-3">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Manual Confirmation</span>
                        </div>
                        <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Amount Due</p>
                            <p className="text-3xl font-black text-slate-900 tabular-nums">
                                {Number(booking.totalAmount).toFixed(2)} <span className="text-sm font-bold text-slate-300">ETB</span>
                            </p>
                        </div>
                    </div>
                    {/* Allow guest to change payment method if wait is too long */}
                    <Button
                        variant="ghost"
                        onClick={() => onSelectPayment("TRANSFER")} // This will trigger category switch in parent
                        className="text-[9px] font-black text-slate-300 underline underline-offset-4 decoration-slate-200 uppercase tracking-widest hover:text-primary transition-colors mt-4"
                    >
                        Change Payment Method
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (booking.paymentMethod === "TRANSFER" && selectedPaymentMethod === "TELEBIRR") {
        return (
            <Card className="w-full max-w-lg border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-[#0089cf] p-6 flex flex-col items-center justify-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10" />
                    <h5 className="relative z-10 text-2xl font-black uppercase tracking-tight mb-2">Telebirr Payment</h5>
                    <div className="relative z-10">
                        <CircularSessionCounter
                            startTime={booking.startTime}
                            endTime={booking.endTime || new Date().toISOString()}
                            displayTime="00:00:00"
                            stopped={true}
                            size={typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 220}
                        />
                    </div>
                    <p className="text-white/60 font-bold uppercase tracking-[0.3em] text-[8px] relative z-10 mt-2">Secure Merchant Tunnel</p>
                </div>
                <CardContent className="p-12 text-center space-y-10">
                    <div className="space-y-3">
                        <p className="text-slate-400 font-medium text-sm">Follow the prompt on your registered mobile device to complete the transaction of:</p>
                        <div className="text-4xl font-black text-slate-900 tabular-nums">
                            {Number(booking.totalAmount).toFixed(2)} <span className="text-sm font-bold text-slate-300">ETB</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => onTelebirrPayment()}
                            className="w-full h-16 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 border-none shadow-none"
                        >
                            PROCEED TO PAYMENT
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedPaymentMethod(null)}
                            className="text-slate-300 font-black text-[9px] uppercase tracking-[0.3em]"
                        >
                            CANCEL
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg border-none shadow-[0_40px_120px_-20px_rgba(0,0,0,0.1)] rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden bg-white animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="p-8 sm:p-12 pb-6 sm:pb-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto mb-6 sm:mb-8 text-slate-900 group shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-default">
                    {checkoutStep === 'summary' ? (
                        <Receipt className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    ) : checkoutStep === 'categories' ? (
                        <Wallet className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    ) : (
                        <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase tracking-[0.05em] leading-tight">
                    {checkoutStep === 'summary' ? 'Summary View' : checkoutStep === 'categories' ? 'Payment Portal' : 'Transfer Hub'}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-3">
                    <div className={cn("h-1 w-6 rounded-full transition-all duration-500", checkoutStep === 'summary' ? "bg-primary" : "bg-slate-100")} />
                    <div className={cn("h-1 w-6 rounded-full transition-all duration-500", checkoutStep === 'categories' ? "bg-primary" : "bg-slate-100")} />
                    <div className={cn("h-1 w-6 rounded-full transition-all duration-500", checkoutStep === 'transfer_methods' ? "bg-primary" : "bg-slate-100")} />
                </div>
            </div>

            <CardContent className="p-8 sm:p-12 pt-2 sm:pt-4">
                {checkoutStep === 'summary' && (
                    <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[8px] uppercase font-black text-slate-300 tracking-[0.4em] ml-1 flex items-center gap-2 pt-2">
                                    <Clock className="h-3 w-3" /> Durational Report
                                </Label>
                                <div className="h-14 bg-slate-50 border border-slate-100/50 rounded-2xl flex items-center px-6">
                                    <p className="font-bold text-slate-900 text-sm">
                                        Active for <span className="text-primary font-black">{Math.max(0, Math.floor(((new Date(booking.endTime || new Date()).getTime() - new Date(booking.startTime).getTime()) / 60000)))}</span> Minutes
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[8px] uppercase font-black text-slate-300 tracking-[0.4em] ml-1 flex items-center gap-2">
                                    <User className="h-3 w-3" /> Guest Details
                                </Label>
                                <div className="bg-slate-50 border border-slate-100/50 rounded-2xl p-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Name</span>
                                        <span className="font-bold text-slate-900 text-xs">{booking.customerName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Phone</span>
                                        <span className="font-bold text-slate-900 text-xs">{booking.customerPhone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[8px] uppercase font-black text-slate-300 tracking-[0.4em] ml-1 flex items-center gap-2">
                                    <DollarSign className="h-3 w-3 text-primary" /> Final Clearance
                                </Label>
                                <div className="h-32 bg-slate-50 rounded-[2rem] flex flex-col items-center justify-center border-2 border-primary/5 shadow-inner">
                                    <p className="text-6xl font-black text-slate-900 tracking-tighter tabular-nums antialiased">
                                        {Number(booking.totalAmount).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-1">Ethiopian Birr</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => setCheckoutStep('categories')}
                            className="w-full h-16 rounded-[1.5rem] bg-[#0066FF] hover:bg-[#0052CC] font-black text-white transition-all active:scale-95 group border-none shadow-none"
                        >
                            <span className="flex items-center gap-3 uppercase tracking-[0.2em] text-xs antialiased">
                                PROCEED TO CHECKOUT
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                    </div>
                )}

                {checkoutStep === 'categories' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-3 mb-10 text-center">
                            <p className="text-slate-400 text-xs font-medium">Select your preferred settlement pathway.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => onSelectPayment("INCASH")}
                                className="group h-24 rounded-3xl bg-white border-2 border-slate-50 hover:border-primary/30 transition-all flex items-center px-8 gap-6 text-left hover:bg-slate-50/50"
                            >
                                <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Pay In Cash</h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Manual Staff Collection</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-100 group-hover:text-primary transition-all" />
                            </button>

                            <button
                                onClick={() => setCheckoutStep('transfer_methods')}
                                className="group h-24 rounded-3xl bg-white border-2 border-slate-50 hover:border-primary/30 transition-all flex items-center px-8 gap-6 text-left hover:bg-slate-50/50"
                            >
                                <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                                    <Smartphone className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Digital Transfer</h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Telebirr & CBE Birr</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-100 group-hover:text-primary transition-all" />
                            </button>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={() => setCheckoutStep('summary')}
                            className="w-full h-12 text-slate-300 hover:text-primary font-black text-[9px] uppercase tracking-[0.3em] mt-8 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> Return to Review
                        </Button>
                    </div>
                )}

                {checkoutStep === 'transfer_methods' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-3 mb-8 text-center">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Integrated Gateways</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {transferMethods.map((method) => (
                                <button
                                    key={method.id}
                                    disabled={!method.active}
                                    onClick={() => {
                                        if (method.id === 'telebirr') {
                                            setSelectedPaymentMethod("TELEBIRR");
                                            onSelectPayment("TRANSFER");
                                        } else {
                                            toast.info(`${method.name} integration coming soon!`);
                                        }
                                    }}
                                    className={cn(
                                        "group h-20 rounded-2xl flex items-center px-6 gap-5 border transition-all text-left",
                                        method.active
                                            ? "bg-white border-slate-100 hover:border-primary hover:shadow-lg shadow-slate-100"
                                            : "bg-slate-50 border-slate-50 opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div
                                        style={{ backgroundColor: method.active ? method.color + '15' : 'transparent', color: method.active ? method.color : '#cbd5e1' }}
                                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                                    >
                                        {method.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{method.name}</h4>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{method.active ? 'Available for Checkout' : 'Deployment Pending'}</p>
                                    </div>
                                    {method.active && <Check className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                            ))}
                        </div>

                        <Button
                            variant="ghost"
                            onClick={() => setCheckoutStep('categories')}
                            className="w-full h-12 text-slate-300 hover:text-primary font-black text-[9px] uppercase tracking-[0.3em] mt-8 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> Back to Categories
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function PortalPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-200"><Box className="h-10 w-10 animate-pulse text-primary" /></div>}>
            <PortalContent />
        </Suspense>
    );
}


