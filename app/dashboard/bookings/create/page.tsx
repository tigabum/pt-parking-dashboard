"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bookingService } from "@/lib/services/booking-service";
import { parkingService } from "@/lib/services/parking-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { BookingForm } from "@/components/forms/booking.form";
import { ParkingResponse } from "@/components/types";

export default function CreateBookingPage() {
    const router = useRouter();
    const { canAccess } = useAuth();
    const [loading, setLoading] = useState(false);
    const [spaces, setSpaces] = useState<ParkingResponse[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await parkingService.getAllParking({ limit: 1000 });
            if (res && res.data) {
                setSpaces(res.data);
            }
        } catch (err) {
            toast.error("Failed to load parking spaces");
        }
    };

    if (!canAccess([UserRole.SYSTEM_SUPER_ADMIN, UserRole.PARKING_MANAGER, UserRole.PARKING_SUPER_ADMIN])) {
        return <div className="p-6 text-center">Access Denied</div>;
    }

    const handleSave = async (data: any): Promise<any> => {
        setLoading(true);
        const loadingToast = toast.loading("Creating reservation...");

        try {
            const res = await bookingService.createBooking(data);
            if (res.success && res.data) {
                toast.success(res.message || "Booking created successfully", { id: loadingToast });
                return res.data.booking;
            }
            // Error is already toasted by interceptor if success is false, but we replace the loading toast here
            toast.error(res.message || "Failed to create booking", { id: loadingToast });
            return null;
        } catch (err: any) {
            toast.error(err?.message || "Failed to save booking", { id: loadingToast });
            return null;
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white">
            <BookingForm
                parkings={spaces}
                onSave={handleSave}
                onOpenChange={() => {
                    router.push("/dashboard/bookings");
                    router.refresh();
                }}
                isLoading={loading}
            />
        </div>
    );
}
