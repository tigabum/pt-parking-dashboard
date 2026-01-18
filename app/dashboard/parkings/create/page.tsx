"use client";
import { UserRole } from "@/lib/auth";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parkingService } from "@/lib/services/parking-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { ParkingForm } from "@/components/forms/parking-form";

export default function CreateParkingPage() {
    const router = useRouter();
    const { user, canAccess, hasPermission } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!hasPermission(PERMISSIONS.PARKING_CREATE)) {
        return <div className="p-6 text-center text-red-500 font-semibold">Access Denied: Missing PARKING_CREATE permission</div>;
    }

    const handleSave = async (data: any) => {
        if (!user) return;
        setLoading(true);
        const loadingToast = toast.loading("Creating parking...");

        try {
            const formData = new FormData();
            formData.append("name", data.name);
            formData.append("city", data.city || "");
            formData.append("region", data.region || "");
            formData.append("kebele", data.kebele || "");
            formData.append("woreda", data.woreda || "");
            formData.append("subCity", data.subCity || "");
            formData.append("neighbourhood", data.neighbourhood || "");
            formData.append("lat", String(data.lat || 0));
            formData.append("lng", String(data.lng || 0));
            formData.append("numberOfSpots", String(data.numberOfSpots));
            formData.append("description", data.description || "");
            if (data.commissionConfigId) {
                formData.append("commissionConfigId", data.commissionConfigId);
            }

            // New fields
            formData.append("parkingCode", data.parkingCode || "");
            formData.append("parkingType", data.parkingType || "");
            formData.append("licenseNumber", data.licenseNumber || "");
            formData.append("status", data.status || "");
            formData.append("country", data.country || "");
            formData.append("streetName", data.streetName || "");
            formData.append("tinNumber", data.tinNumber || "");
            formData.append("vatRegistrationNumber", data.vatRegistrationNumber || "");
            formData.append("landmark", data.landmark || "");
            formData.append("googleMapLink", data.googleMapLink || "");
            formData.append("reservedSpots", String(data.reservedSpots || 0));
            formData.append("disabledSpots", String(data.disabledSpots || 0));
            formData.append("isIndoor", String(data.isIndoor));
            formData.append("pricingModel", data.pricingModel || "");
            formData.append("gracePeriod", String(data.gracePeriod || 0));
            formData.append("overtimePrice", String(data.overtimePrice || 0));
            formData.append("spotTypes", JSON.stringify(data.spotTypes || {}));

            // License Files
            if (data.licenseFiles) {
                data.licenseFiles.forEach((file: any) => {
                    if (file instanceof File) {
                        formData.append("license", file);
                    }
                });
            }

            // Pricing as JSON string
            formData.append("pricing", JSON.stringify(data.pricing));

            // Amenities as JSON string
            if (data.amenities && Array.isArray(data.amenities)) {
                formData.append("amenities", JSON.stringify(data.amenities));
            }

            formData.append("isVatIncluded", String(data.isVatIncluded));

            // Feature Image
            if (data.featureImage instanceof File) {
                formData.append("image", data.featureImage);
            }

            // Gallery Images
            if (data.galleryImages) {
                data.galleryImages.forEach((img: any) => {
                    if (img instanceof File) {
                        formData.append("gallery", img);
                    }
                });
            }


            // Agreement Documents
            if (data.agreementDocuments) {
                data.agreementDocuments.forEach((doc: any) => {
                    if (doc instanceof File) {
                        formData.append("agreement", doc);
                    }
                });
            }

            const response = await parkingService.createParking(formData);
            toast.success(response.message || "Parking created successfully", { id: loadingToast });
            router.push("/dashboard/parkings");
        } catch (err: any) {
            // Error is already toasted by interceptor, but we replace the loading toast to clear it
            toast.error(err?.message || "Failed to create parking", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white">
            <ParkingForm
                onSave={handleSave}
                onOpenChange={() => router.push("/dashboard/parkings")}
                isLoading={loading}
            />
        </div>
    );
}
