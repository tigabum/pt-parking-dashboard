"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { BookingType, ParkingResponse, FinancialInstitution, BookingMethod, PaymentMethod, CreateBooking } from "../types";
import { customerService } from "@/lib/services/customer-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import {
  Check,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote,
  Printer,
  Download,
  Phone,
  User as UserIcon,
  Search,
  Timer,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Car,
  Landmark,
  Clock,
  Zap,
  CheckCircle,
} from "lucide-react";
import QRCode from "react-qr-code";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { CircularSessionCounter } from "../ui/circular-session-counter";
import { portalService } from "@/lib/services/portal-service";
import { bookingService } from "@/lib/services/booking-service";

dayjs.extend(duration);

type Props = {
  onOpenChange: (open: boolean) => void;
  parkings: ParkingResponse[];
  onSave: (data: CreateBooking) => Promise<any>;
  initialData?: CreateBooking;
  isLoading?: boolean;
};

export function BookingForm({
  onOpenChange,
  parkings: parkings,
  onSave,
  initialData,
  isLoading = false,
}: Props) {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<FinancialInstitution[]>([
    { id: "telebirr", name: "Telebirr", type: "WALLET", checkoutUrl: "https://www.ethio-telebirr.et/" },
    { id: "cbe", name: "CBE Birr", type: "BANK" },
    { id: "eb", name: "EtBirr", type: "WALLET" },
  ]);

  const [booking, setBooking] = useState<CreateBooking>({
    parkingId: initialData?.parkingId || "",
    customerName: initialData?.customerName || "",
    customerPhone: initialData?.customerPhone || "",
    plateNumber: initialData?.plateNumber || "",
    vehicleBrand: initialData?.vehicleBrand || "",
    vehicleName: initialData?.vehicleName || "",
    startTime: initialData?.startTime || dayjs().format("YYYY-MM-DDTHH:mm"),
    endTime: initialData?.endTime || dayjs().add(1, "hour").format("YYYY-MM-DDTHH:mm"),
    type: initialData?.type || BookingType.HOURLY,
    bookingMethod: initialData?.bookingMethod || BookingMethod.DASHBOARD,
    paymentMethod: initialData?.paymentMethod || PaymentMethod.INCASH,
  });

  const [sessionDuration, setSessionDuration] = useState<string>("00:00:00");
  const [step, setStep] = useState(0);
  const [searching, setSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [vehicleFound, setVehicleFound] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      if (booking.startTime) {
        const start = dayjs(booking.startTime);
        const now = dayjs();
        const diff = dayjs.duration(now.diff(start));
        if (diff.asMilliseconds() > 0) {
          setSessionDuration(
            `${Math.floor(diff.asHours())
              .toString()
              .padStart(2, "0")}:${diff
                .minutes()
                .toString()
                .padStart(2, "0")}:${diff
                  .seconds()
                  .toString()
                  .padStart(2, "0")}`
          );
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [booking.startTime]);

  useEffect(() => {
    if (initialData) {
      setBooking(prev => ({ ...prev, ...initialData }));
    } else if (user?.orgId) {
      setBooking(prev => ({ ...prev, parkingId: user.orgId || "" }));
    } else if (parkings && parkings.length > 0 && !booking.parkingId) {
      setBooking(prev => ({ ...prev, parkingId: (parkings[0] as any).id || "" }));
    }
  }, [initialData, user?.orgId, parkings]);

  // Proactive search for customer
  useEffect(() => {
    const phone = booking.customerPhone;
    if (phone && phone.length >= 9 && !customerFound) {
      const timer = setTimeout(() => {
        searchCustomer_action(phone);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [booking.customerPhone]);

  // Proactive search for vehicle
  useEffect(() => {
    const plate = booking.plateNumber;
    if (plate && plate.length >= 4 && !vehicleFound) {
      const timer = setTimeout(() => {
        searchVehicle_action(plate);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [booking.plateNumber]);

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!booking.parkingId) newErrors.parkingId = "Parking selection is required";
    if (!booking.customerName?.trim()) newErrors.customerName = "Driver name is required";
    if (!booking.plateNumber?.trim()) newErrors.plateNumber = "Plate number is required";
    if (!booking.paymentMethod) newErrors.paymentMethod = "Payment method is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAction = async () => {
    if (!validateStep2()) {
      toast.error("Please fill in all required fields marked in red");
      return;
    }

    const loadingToast = toast.loading("Initiating session...");
    try {
      const payload = {
        ...booking,
        bookingType: booking.type,
        parkingId: booking.parkingId || ""
      };

      const result = await onSave(payload as any);
      if (result) {
        toast.success("Session Started Successfully", { id: loadingToast });
        onOpenChange(false); // Close modal and return to list
      } else {
        toast.dismiss(loadingToast);
      }
    } catch (err: any) {
      console.error("Save failed", err);
      toast.error(err?.message || "Failed to initiate session", { id: loadingToast });
    }
  };

  const handleEndParking = async () => {
    if (!createdBooking) return;
    const loadingToast = toast.loading("Finalizing session...");
    try {
      // If it's already in WAITING_CONFIRMATION (default for dashboard bookings), finalize it as PAID
      if (createdBooking.status === 'WAITING_CONFIRMATION') {
        const res = await bookingService.updateBookingStatus(createdBooking.id, 'PAID');
        if (res.success) {
          toast.success("Session Finalized & Release Authorized", { id: loadingToast });
          onOpenChange(false);
          return;
        }
      }

      // Otherwise follow standard guest stop flow
      const response = await portalService.stopSession(createdBooking.id, booking.customerPhone, booking.paymentMethod);
      if (response) {
        toast.success("Session Ended. Awaiting Manager Confirmation.", { id: loadingToast });
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to end session", { id: loadingToast });
    }
  };

  const getPriceEstimate = () => {
    const parking = parkings.find((s) => s.id === booking.parkingId);
    if (!parking || !parking.pricing) return "0.00";

    const start = dayjs(booking.startTime);
    const end = dayjs(booking.endTime);
    const durationMs = end.diff(start);

    if (durationMs <= 0) return "0.00";

    const priceObj =
      booking.type === BookingType.MONTHLY
        ? parking.pricing?.monthly
        : booking.type === BookingType.DAILY
          ? parking.pricing?.daily
          : booking.type === BookingType.FLAT_RATE
            ? parking.pricing?.flat
            : parking.pricing?.hourly;

    if (!priceObj || !priceObj.price) return "0.00";

    let total = 0;
    if (booking.type === BookingType.HOURLY) {
      const hours = durationMs / (1000 * 60 * 60);
      total = priceObj.price * hours;
    } else if (booking.type === BookingType.DAILY) {
      const days = durationMs / (1000 * 60 * 60 * 24);
      total = priceObj.price * Math.ceil(days);
    } else if (booking.type === BookingType.FLAT_RATE) {
      total = priceObj.price;
    } else {
      const days = durationMs / (1000 * 60 * 60 * 24);
      const months = days / 30;
      total = priceObj.price * months;
    }

    const discounted = total * (1 - (priceObj.discount || 0) / 100);
    return discounted.toFixed(2);
  };

  const validateStep0 = () => {
    const newErrors: Record<string, string> = {};
    if (!booking.parkingId && (!parkings || parkings.length === 0)) newErrors.parkingId = "Please select an assigned parking";
    if (!booking.customerPhone?.trim()) newErrors.customerPhone = "Customer phone is required";
    if (!booking.plateNumber?.trim()) newErrors.plateNumber = "Plate number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    let currentId = booking.parkingId;
    if (!currentId && parkings && parkings.length > 0) {
      currentId = (parkings[0] as any).id;
      setBooking(prev => ({ ...prev, parkingId: (parkings[0] as any).id }));
    }

    if (!validateStep0()) {
      toast.error("Please fill in all required fields marked in red");
      return;
    }

    setSearching(true);
    try {
      // Parallel search
      const [cRes, vRes] = await Promise.allSettled([
        customerService.searchByPhone(booking.customerPhone),
        vehicleService.searchByPlate(booking.plateNumber)
      ]);

      let foundCustomer: any = null;
      let foundVehicle: any = null;

      if (cRes.status === 'fulfilled' && (cRes.value.success || cRes.value.id)) {
        foundCustomer = cRes.value.data || cRes.value;
        setCustomerFound(true);
      }

      if (vRes.status === 'fulfilled' && (vRes.value.success || vRes.value.id)) {
        foundVehicle = vRes.value.data || vRes.value;
        setVehicleFound(true);
      }

      const updatedName = foundCustomer?.fullName || foundVehicle?.customer?.fullName || booking.customerName;
      const updatedPhone = foundCustomer?.phoneNumber || foundVehicle?.customer?.phoneNumber || booking.customerPhone;
      const updatedBrand = foundVehicle?.brand || booking.vehicleBrand;
      const updatedModel = foundVehicle?.model || foundVehicle?.name || booking.vehicleName;

      setBooking(prev => ({
        ...prev,
        customerName: updatedName,
        customerPhone: updatedPhone,
        vehicleBrand: updatedBrand,
        vehicleName: updatedModel,
      }));

      if (foundCustomer || foundVehicle) {
        // If BOTH found and vehicle explicitly belongs to this customer, skip to summary (Step 2)
        // STRICT CHECK: The vehicle's owner ID must match the found customer's ID.
        // If they don't match, or if vehicle has a different owner, we MUST Show Step 1 to verify.
        const isStrictMatch = foundVehicle && foundCustomer && foundVehicle.customer?.id === foundCustomer.id;

        if (isStrictMatch) {
          toast.success(`Verified returning customer: ${updatedName}`);
          setStep(2); // Skip straight to summary
          setSearching(false);
          return;
        }
      }
      // Else: if partial match or no match or mismatch, go to Step 1 to review/edit details manually.
      // No error toast needed.

      setStep(1);
    } catch (err) {
      console.error("Search failed", err);
      // Fallback to step 1 anyway to allow manual entry
      setStep(1);
    } finally {
      setSearching(false);
    }
  };

  const searchCustomer_action = async (phone: string) => {
    // Legacy support or internal use - although we consolidated it into handleNext
    if (phone.length < 9) return;
    setSearching(true);
    try {
      const res = await customerService.searchByPhone(phone);
      const customer = res.data || res;

      if (customer && customer.id) {
        const mainVehicle = customer.vehicles?.[0];

        setBooking((prev: CreateBooking) => ({
          ...prev,
          customerName: customer.fullName || prev.customerName,
          customerPhone: customer.phoneNumber || prev.customerPhone,
          plateNumber: prev.plateNumber || mainVehicle?.plateNumber || "",
          vehicleBrand: prev.vehicleBrand || mainVehicle?.brand || "",
          vehicleName: prev.vehicleName || mainVehicle?.model || mainVehicle?.name || "",
        }));
        setCustomerFound(true);
        if (mainVehicle) setVehicleFound(true);

        // Silent success - removed toast
      } else {
        setCustomerFound(false);
      }
    } catch {
      setCustomerFound(false);
    } finally {
      setSearching(false);
    }
  };

  const searchVehicle_action = async (plate: string) => {
    if (plate.length < 4) return;
    setSearching(true);
    try {
      const res = await vehicleService.searchByPlate(plate);
      const vehicle = res.data || res;
      if (vehicle && vehicle.id) {
        setBooking((prev: CreateBooking) => ({
          ...prev,
          vehicleBrand: vehicle.brand || prev.vehicleBrand,
          vehicleName: vehicle.model || vehicle.name || prev.vehicleName,
          plateNumber: vehicle.plateNumber || prev.plateNumber,
          customerName: vehicle.customer?.fullName || prev.customerName,
          customerPhone: vehicle.customer?.phoneNumber || prev.customerPhone,
        }));
        setVehicleFound(true);
        if (vehicle.customer) setCustomerFound(true);
        toast.success(`Vehicle found: ${vehicle.brand} ${vehicle.model || vehicle.name || ''}`);
      } else {
        setVehicleFound(false);
        // Silent failure - removed toast
      }
    } catch {
      setVehicleFound(false);
    } finally {
      setSearching(false);
    }
  };

  const getSelectedParkingName = () => {
    return (
      parkings.find((p) => p.id === booking.parkingId)?.name || "Unknown Parking"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Success view block removed to allow direct transition to Step 3 (Pulse) after creation

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-5 shrink-0 bg-white border-b shadow-sm z-20">
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest">
          Add New Booking
        </h2>
        <div className="flex items-center gap-3">
          {/* Buttons moved to footer */}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-12 md:pt-24">
        <div className="max-w-[1000px] mx-auto pb-20">
          <div className="bg-white p-6 md:p-8 rounded-2xl border shadow-sm space-y-8">

            {step === 0 && (
              <div className="space-y-8 min-h-[550px] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-full space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 font-bold">
                    {/* Parking Name */}
                    <div className="space-y-3">
                      <Label className="text-[11px] uppercase font-black text-slate-400 tracking-[0.2em]">Parking Name</Label>
                      <Input
                        readOnly
                        value={parkings.find(s => s.id === booking.parkingId)?.name || "Primary Terminal"}
                        className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 text-lg px-6"
                      />
                    </div>

                    {/* Parking Address */}
                    <div className="space-y-3">
                      <Label className="text-[11px] uppercase font-black text-slate-400 tracking-[0.2em]">Parking Address</Label>
                      <Input
                        readOnly
                        value={`${parkings.find(s => s.id === booking.parkingId)?.city || "Addis Ababa"}, ${parkings.find(s => s.id === booking.parkingId)?.subCity || "District"}`}
                        className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-500 text-lg px-6"
                      />
                    </div>

                    {/* Available Spots */}
                    <div className="space-y-3">
                      <Label className="text-[11px] uppercase font-black text-slate-400 tracking-[0.2em]">Available Spots</Label>
                      <Input
                        readOnly
                        value={`${parkings.find(s => s.id === booking.parkingId)?.availableSpots ?? 0} Vacant Slots`}
                        className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-primary text-lg px-6"
                      />
                    </div>

                    {/* Customer Phone */}
                    <div className="space-y-3">
                      <Label className="text-[11px] uppercase font-black text-primary tracking-[0.2em]">Customer Phone *</Label>
                      <Input
                        value={booking.customerPhone}
                        onChange={(e) => {
                          setBooking({ ...booking, customerPhone: e.target.value });
                          if (errors.customerPhone) setErrors({ ...errors, customerPhone: "" });
                        }}
                        placeholder="Enter Phone Number"
                        className={`h-14 rounded-2xl bg-white border-2 focus:border-[#0066FF]/50 focus:ring-4 focus:ring-[#0066FF]/5 transition-all font-bold text-lg px-6 ${errors.customerPhone ? "border-red-500 bg-red-50" : "border-[#0066FF]/5"}`}
                      />
                      {errors.customerPhone && <p className="text-xs text-red-500 font-medium">{errors.customerPhone}</p>}
                    </div>

                    {/* Vehicle Plate No */}
                    <div className="space-y-3">
                      <Label className="text-[11px] uppercase font-black text-primary tracking-[0.2em]">Vehicle Plate No *</Label>
                      <Input
                        value={booking.plateNumber}
                        onChange={(e) => {
                          setBooking({ ...booking, plateNumber: e.target.value.toUpperCase() });
                          if (errors.plateNumber) setErrors({ ...errors, plateNumber: "" });
                        }}
                        placeholder="Enter Plate Number"
                        className={`h-14 rounded-2xl bg-white border-2 focus:border-[#0066FF]/50 focus:ring-4 focus:ring-[#0066FF]/5 font-mono font-black uppercase tracking-widest text-2xl px-6 ${errors.plateNumber ? "border-red-500 bg-red-50" : "border-[#0066FF]/5"}`}
                      />
                      {errors.plateNumber && <p className="text-xs text-red-500 font-medium">{errors.plateNumber}</p>}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-8">
                    <Button
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                      className="h-14 px-10 rounded-2xl font-bold text-slate-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={searching}
                      className="h-14 px-14 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold flex items-center gap-3 active:scale-95 transition-all text-lg shadow-none border-none"
                    >
                      {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                      Verify & Continue
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8 min-h-[550px] flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-500 font-bold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Driver Name *</Label>
                      {customerFound ? (
                        <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1">
                          <CheckCircle className="h-2 w-2" /> Registered Profile
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-primary uppercase flex items-center gap-1">
                          <Zap className="h-2 w-2" /> New Enrolment
                        </span>
                      )}
                    </div>
                    <Input
                      value={booking.customerName}
                      readOnly={customerFound}
                      onChange={(e) => {
                        setBooking({ ...booking, customerName: e.target.value });
                        if (errors.customerName) setErrors({ ...errors, customerName: "" });
                      }}
                      placeholder="Enter Driver Name"
                      className={`h-12 rounded-xl bg-slate-50 border-none font-bold ${errors.customerName ? "border-2 border-red-500 bg-red-50" : ""} ${customerFound ? "bg-emerald-50 text-emerald-900" : ""}`}
                    />
                    {errors.customerName && <p className="text-xs text-red-500 font-medium">{errors.customerName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Vehicle Brand</Label>
                    <Input
                      value={booking.vehicleBrand}
                      readOnly={vehicleFound}
                      onChange={(e) => setBooking({ ...booking, vehicleBrand: e.target.value })}
                      placeholder="Enter Vehicle Brand"
                      className={`h-12 rounded-xl bg-slate-50 border-none font-bold ${vehicleFound ? "bg-emerald-50 text-emerald-900" : ""}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Model</Label>
                      {vehicleFound && (
                        <span className="text-[9px] font-black text-emerald-500 uppercase">Recognized Plate</span>
                      )}
                    </div>
                    <Input
                      value={booking.vehicleName}
                      readOnly={vehicleFound}
                      onChange={(e) => setBooking({ ...booking, vehicleName: e.target.value })}
                      placeholder="Enter Model"
                      className={`h-12 rounded-xl bg-slate-50 border-none font-bold ${vehicleFound ? "bg-emerald-50 text-emerald-900" : ""}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Start Time *</Label>
                    <Input
                      type="datetime-local"
                      value={booking.startTime}
                      onChange={(e) => setBooking({ ...booking, startTime: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">End Time *</Label>
                    <Input
                      type="datetime-local"
                      value={booking.endTime}
                      onChange={(e) => setBooking({ ...booking, endTime: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Booking Type</Label>
                    <Select value={booking.type} onValueChange={(v: BookingType) => setBooking({ ...booking, type: v })}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value={BookingType.HOURLY} className="font-bold">Hourly</SelectItem>
                        <SelectItem value={BookingType.DAILY} className="font-bold">Daily</SelectItem>
                        <SelectItem value={BookingType.MONTHLY} className="font-bold">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Payment Method</Label>
                    <Select
                      value={booking.paymentMethod === PaymentMethod.INCASH ? 'INCASH' : 'TRANSFER'}
                      onValueChange={(v) => {
                        if (v === 'INCASH') setBooking({ ...booking, paymentMethod: PaymentMethod.INCASH });
                        else setBooking({ ...booking, paymentMethod: PaymentMethod.TRANSFER });
                      }}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold">
                        <SelectValue placeholder="Select Payment Method" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value="INCASH" className="font-bold">Cash</SelectItem>
                        <SelectItem value="TRANSFER" className="font-bold">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-4 pt-6 border-t">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(0)}
                    className="h-12 px-6 rounded-xl font-bold text-slate-400 flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                      className="h-12 px-8 rounded-xl font-bold text-slate-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      className="h-12 px-10 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold flex items-center gap-3 shadow-none border-none"
                    >
                      Review & Proceed
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10 min-h-[550px] flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-8">
                  <div className="text-center space-y-2">
                    <div className="h-20 w-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto text-primary mb-6">
                      <Clock className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Booking Summary</h3>
                    <p className="text-slate-500 font-medium text-sm">Review the session parameters before verification.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2 border border-slate-100">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Driver Details</Label>
                      <p className="text-slate-900 font-bold text-base">{booking.customerName}</p>
                      <p className="text-slate-500 text-xs font-medium">{booking.customerPhone}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2 border border-slate-100">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Vehicle</Label>
                      <p className="text-slate-900 font-bold text-base uppercase font-mono tracking-widest">{booking.plateNumber}</p>
                      <p className="text-slate-500 text-xs font-medium">{booking.vehicleBrand} {booking.vehicleName}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2 border border-slate-100">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Session Time</Label>
                      <p className="text-slate-900 font-bold text-sm">{dayjs(booking.startTime).format("MMM D, HH:mm")}</p>
                      <p className="text-slate-500 text-xs font-medium">Until {dayjs(booking.endTime).format("HH:mm")}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border-2 border-slate-100 rounded-[2.5rem] space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.4em]">Est. Total Amount</Label>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900 tabular-nums tracking-tighter">{getPriceEstimate()}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase">ETB</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="h-14 px-10 rounded-2xl font-bold text-slate-400 flex items-center gap-2"
                  >
                    <ChevronLeft className="h-5 w-5" /> Back
                  </Button>
                  <Button
                    onClick={handleSaveAction}
                    disabled={isLoading}
                    className="h-16 px-16 rounded-[2rem] bg-[#0066FF] hover:bg-[#0052CC] text-white font-black transition-all active:scale-95 flex items-center gap-4 text-lg uppercase tracking-widest shadow-none border-none"
                  >
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6 fill-white" />}
                    Confirm & Start
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && createdBooking && (
              <div className="space-y-12 min-h-[550px] flex flex-col items-center justify-center animate-in fade-in duration-700 font-bold">
                <div className="text-center space-y-2">
                  <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 mb-6">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Session Pulse</h3>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">Hardware Link Synchronized</p>
                </div>

                <div className="relative">
                  <CircularSessionCounter
                    startTime={booking.startTime || new Date()}
                    endTime={booking.endTime || new Date()}
                    displayTime={sessionDuration}
                  />
                </div>

                <div className="w-full max-w-md grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest">Plate ID</p>
                    <p className="text-slate-900 font-black tracking-widest uppercase">{booking.plateNumber}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest">Pay Method</p>
                    <p className="text-slate-900 font-black">{booking.paymentMethod}</p>
                  </div>
                </div>

                <div className="w-full max-w-md flex flex-col gap-4">
                  <Button
                    onClick={handleEndParking}
                    className="w-full h-16 rounded-[2rem] bg-red-500 hover:bg-black text-white font-bold text-lg shadow-xl transition-all active:scale-95 uppercase tracking-[0.15em] border-none"
                  >
                    {createdBooking.status === 'WAITING_CONFIRMATION' ? 'VERIFY PAYMENT & RELEASE' : 'TERMINATE SESSION'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="w-full text-slate-300 font-black text-[9px] uppercase tracking-[0.4em]"
                  >
                    Keep session in background
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
