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
    Plus
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

    // Form States - Pre-filled for Testing
    const [phoneNumber, setPhoneNumber] = useState("0911000000");
    const [plateNumber, setPlateNumber] = useState("A1234");
    const [fullName, setFullName] = useState("Guest Tester");
    const [brand, setBrand] = useState("Toyota");
    const [model, setModel] = useState("Corolla");
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

    // Initial Load
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            if (!parkingId) {
                setError("No parking ID provided. Please scan the QR code again.");
                setLoading(false);
                return;
            }

            try {
                // Fetch Parking
                const response = await portalService.getParkingDetails(parkingId);
                const parkingData = response.data || response;
                if (mounted) {
                    setParking(parkingData);
                }

                // Check Persistence
                const savedPhone = localStorage.getItem("guestPhone");
                if (savedPhone && mounted) {
                    setPhoneNumber(savedPhone);
                    const finalPhone = normalizePhone(savedPhone);
                    try {
                        const existingBooking = await portalService.getActiveBooking(finalPhone, parkingId);
                        if (existingBooking && mounted) {
                            setActiveBooking(existingBooking);
                            setPlateNumber(existingBooking.plateNumber || "");
                            setFullName(existingBooking.customerName || "");
                            localStorage.setItem("guestPlate", existingBooking.plateNumber || "");
                        } else {
                            // Pre-fill fields from storage even if no active booking found
                            const savedPlate = localStorage.getItem("guestPlate");
                            if (savedPlate) setPlateNumber(savedPlate);
                        }
                    } catch (err) {
                        console.error("Error checking active booking", err);
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
                const updated = await portalService.getActiveBooking(normalizePhone(phoneNumber), parkingId!);
                if (updated) {
                    setActiveBooking(updated);
                    if (updated.status === 'PAID') {
                        toast.success("Payment confirmed! You may now exit.");
                        setIsRatingOpen(true);
                    }
                }
            } catch (e) {
                console.warn("Polling error", e);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [activeBooking?.status, phoneNumber, parkingId, activeBooking]);

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

            // 1. First Check for Active Bookings (Enterprise standard: Resume session)
            if (parkingId) {
                const active = await portalService.getActiveBooking(normalized, parkingId, upperPlate);
                if (active) {
                    setActiveBooking(active);
                    localStorage.setItem("guestPhone", phoneNumber);
                    localStorage.setItem("guestPlate", plateNumber);
                    toast.success("Welcome back! Active session resumed.");
                    setSearching(false);
                    return;
                }
            }

            // 2. If no active session, look up customer profile to pre-fill
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
            const now = new Date();
            const startObj = new Date(startTime);
            const endObj = new Date(endTime);
            const durationMs = endObj.getTime() - startObj.getTime();
            const newEnd = new Date(now.getTime() + durationMs);

            const payload = {
                parkingId: parking.id,
                customerName: fullName,
                customerPhone: normalizePhone(phoneNumber),
                plateNumber: plateNumber.toUpperCase(),
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
                toast.success(response.message || "Parking Session Started!");
                return;
            }

            // Fallback error
            console.error("Booking creation failed structure:", response);
            toast.error(response.message || "Failed to initiate session. Please try again.");

        } catch (e: any) {
            toast.dismiss();
            console.error("Booking Create Error:", e);
            toast.error(e.response?.data?.message || e.message || "Failed to start parking");
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
                <div className="h-screen w-full bg-slate-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                        <div className="bg-emerald-600 p-12 text-white text-center rounded-b-[3rem]">
                            <div className="h-20 w-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl">
                                <CheckCircle className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black mb-1 leading-tight tracking-tight">Access Granted</h2>
                            <p className="text-white/60 font-bold uppercase tracking-[0.2em] text-[8px]">Session Finalized Successfully</p>
                        </div>
                        <CardContent className="p-10 text-center space-y-6">
                            <Button
                                onClick={() => {
                                    localStorage.removeItem("activeBookingId"); // In case we added it
                                    window.location.reload();
                                }}
                                className="w-full h-14 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-black uppercase tracking-widest transition-all active:scale-95 border-none shadow-none text-xs"
                            >
                                START NEW SESSION
                            </Button>
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
                    <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <ParkingCircle className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        Client Hub
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
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* Core Identification & Available Status */}
                                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-50 pb-8">
                                            <div className="space-y-1.5 flex-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Selected Location</Label>
                                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                                    {parking?.name || "Premium Station"}
                                                </h1>
                                            </div>

                                            <div className="space-y-1.5 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100/50 w-fit">
                                                <Label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Real-time Status</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-2 w-2 rounded-full", (parking?.availableSpots ?? 0) > 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                                                    <p className={cn(
                                                        "text-lg font-black tracking-tight",
                                                        (parking?.availableSpots ?? 0) > 0 ? "text-emerald-700" : "text-red-600"
                                                    )}>
                                                        {parking?.availableSpots ?? 0} Vacant Spots
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* REMOVED: Map, Address, Amenities, Entry Rates as per user request */}

                                        <div className="h-px bg-slate-100 my-2" />

                                        {/* Primary Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3 px-1">
                                                <Label className="text-[10px] uppercase font-black text-primary tracking-[0.2em] ml-1">Customer Phone *</Label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        placeholder="Enter Phone Number"
                                                        className="h-16 pl-14 rounded-2xl bg-slate-50/50 border-2 border-transparent focus:border-[#0066FF]/20 focus:bg-white focus:ring-4 focus:ring-[#0066FF]/5 transition-all font-bold text-xl px-6"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3 px-1">
                                                <Label className="text-[10px] uppercase font-black text-primary tracking-[0.2em] ml-1">Vehicle Plate *</Label>
                                                <div className="relative group">
                                                    <Car className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        value={plateNumber}
                                                        onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                                                        placeholder="Enter Plate Number"
                                                        className="h-16 pl-14 rounded-2xl bg-slate-50/50 border-2 border-transparent focus:border-[#0066FF]/20 focus:bg-white focus:ring-4 focus:ring-[#0066FF]/5 font-mono font-black uppercase tracking-widest text-2xl px-6"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center pt-6">
                                    <Button
                                        onClick={handleLookup}
                                        disabled={searching}
                                        className="h-16 w-full sm:w-auto sm:px-16 rounded-[1.5rem] bg-[#0066FF] hover:bg-[#0052CC] text-white font-black flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-[0.3em] border-none shadow-none"
                                    >
                                        {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                        Initialize Entrance
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-10 min-h-[550px] flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-500 font-bold">
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                        <div className="space-y-3 col-span-1 md:col-span-2">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Legal Full Name *</Label>
                                            <Input
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Enter Full Name"
                                                className="h-16 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0066FF]/20 focus:bg-white focus:ring-4 focus:ring-[#0066FF]/5 transition-all font-bold text-lg px-6"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Vehicle Brand</Label>
                                            <Input
                                                value={brand}
                                                onChange={(e) => setBrand(e.target.value)}
                                                placeholder="Enter Vehicle Brand"
                                                className="h-16 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0066FF]/20 focus:bg-white focus:ring-4 focus:ring-[#0066FF]/5 transition-all font-bold text-lg px-6"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Model</Label>
                                            <Input
                                                value={model}
                                                onChange={(e) => setModel(e.target.value)}
                                                placeholder="Enter Model"
                                                className="h-16 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0066FF]/20 focus:bg-white focus:ring-4 focus:ring-[#0066FF]/5 transition-all font-bold text-lg px-6"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Billing Tier</Label>
                                            <Select value={bookingType} onValueChange={(v: any) => setBookingType(v)}>
                                                <SelectTrigger className="w-full h-16 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold text-lg px-6">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value="HOURLY" className="font-bold">Hourly Billing</SelectItem>
                                                    <SelectItem value="DAILY" className="font-bold">Daily Pass</SelectItem>
                                                    <SelectItem value="MONTHLY" className="font-bold">Monthly Plan</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Scheduled Start *</Label>
                                            <div className="relative group">
                                                <CalendarClock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors pointer-events-none" />
                                                <Input
                                                    type="datetime-local"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="h-16 pl-14 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold text-lg px-6 block w-full"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Expected End *</Label>
                                            <div className="relative group">
                                                <Clock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors pointer-events-none" />
                                                <Input
                                                    type="datetime-local"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="h-16 pl-14 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold text-lg px-6 block w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Payment Method</Label>
                                            <Select value={paymentCategory} onValueChange={(v: any) => setPaymentCategory(v)}>
                                                <SelectTrigger className="w-full h-16 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold text-lg px-6">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value={PaymentMethod.INCASH} className="font-bold">In-Cash (Manual)</SelectItem>
                                                    <SelectItem value={PaymentMethod.TRANSFER} className="font-bold">Transfer (Manual)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 pt-10 border-t border-slate-50">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(0)}
                                        className="w-full sm:w-auto h-14 px-8 rounded-2xl font-bold text-slate-400 flex items-center justify-center gap-2 hover:bg-primary/10 hover:text-primary transition-all order-2 sm:order-1"
                                    >
                                        <ChevronLeft className="h-5 w-5" /> Back
                                    </Button>
                                    <div className="w-full sm:w-auto order-1 sm:order-2">
                                        <Button
                                            onClick={() => {
                                                if ((parking?.availableSpots ?? 0) === 0) {
                                                    toast.error("No available spots. This parking is currently full.");
                                                    return;
                                                }
                                                setStep(2);
                                            }}
                                            disabled={(parking?.availableSpots ?? 0) === 0}
                                            className={cn(
                                                "w-full h-14 px-10 rounded-2xl text-white font-black flex items-center justify-center gap-2.5 transition-all active:scale-95 uppercase tracking-widest border-none text-xs shadow-none",
                                                (parking?.availableSpots ?? 0) === 0
                                                    ? "bg-slate-300 cursor-not-allowed"
                                                    : "bg-[#0066FF] hover:bg-[#0052CC]"
                                            )}
                                        >
                                            Review Details
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
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
                                            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-[0.2em]">Time Window Allocation</p>
                                            <p className="text-slate-900 font-black text-xs">
                                                {dayjs(startTime).format("MMM D, HH:mm")} — {dayjs(endTime).format("MMM D, HH:mm")}
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
                                            className="w-full h-16 sm:px-12 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-black transition-all active:scale-95 uppercase tracking-[0.2em] border-none text-[10px] flex items-center justify-center gap-3 shadow-none"
                                        >
                                            Secure & Start Session
                                            <Zap className="h-4 w-4 fill-white animate-pulse" />
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
    const remainingMinutes = Math.max(0, MIN_PARKING_MINUTES - elapsedMinutes);

    return (
        <Card className="w-full max-w-lg border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[2rem] sm:rounded-[3rem] overflow-hidden bg-white">
            <div className="p-6 sm:p-10 text-center border-b border-slate-50 relative overflow-hidden">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 text-slate-900 relative z-10">
                    <Clock className="h-8 w-8 sm:h-10 sm:w-10 animate-pulse" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1 tracking-tight relative z-10">Live Tracking</h2>
                <p className="text-slate-300 font-bold uppercase tracking-[0.3em] text-[8px] relative z-10">Session Monitored In Real-Time</p>
            </div>
            <CardContent className="p-6 sm:p-10 text-center space-y-8 sm:space-y-12">
                <div className="relative py-8 sm:py-12">
                    <CircularSessionCounter
                        startTime={booking.startTime}
                        endTime={booking.endTime || new Date().toISOString()}
                        displayTime={elapsed}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2 text-left">
                        <Label className="text-[8px] uppercase font-black text-slate-300 tracking-widest ml-1">Plate</Label>
                        <Input disabled value={booking.plateNumber} className="h-12 bg-slate-50 border-none font-black text-slate-900 opacity-100 rounded-xl" />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[8px] uppercase font-black text-slate-300 tracking-widest ml-1">Started At</Label>
                        <Input disabled value={new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} className="h-12 bg-slate-50 border-none font-bold text-slate-400 opacity-100 rounded-xl" />
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    {!canCheckout && (
                        <div className="bg-slate-50 text-slate-400 p-4 rounded-xl text-[9px] font-bold flex items-center justify-center gap-2.5">
                            <Info className="h-3.5 w-3.5" />
                            <span>Security Lock: {MIN_PARKING_MINUTES}m ({remainingMinutes}m left)</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border-2 border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
                            onClick={onOpenExtend}
                        >
                            Extend Session
                        </Button>
                        <Button
                            className={cn(
                                "h-16 rounded-2xl font-black text-xs transition-all active:scale-95 border-none uppercase tracking-[0.2em] shadow-none",
                                canCheckout
                                    ? "bg-[#0066FF] hover:bg-[#0052CC] text-white group"
                                    : "bg-slate-50 text-slate-200 cursor-not-allowed"
                            )}
                            onClick={onEnd}
                            disabled={!canCheckout}
                        >
                            {canCheckout ? "Checkout" : "WAITING..."}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
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
                    <div className="relative z-10 scale-75">
                        <CircularSessionCounter
                            startTime={booking.startTime}
                            endTime={booking.endTime || new Date().toISOString()}
                            displayTime="00:00:00"
                            stopped={true}
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


