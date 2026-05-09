"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { parkingService } from "@/lib/services/parking-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { ParkingForm } from "@/components/forms/parking-form";
import { Loader2 } from "lucide-react";

export default function EditParkingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, canAccess } = useAuth();

  const [parking, setParking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadParking();
    }
  }, [id]);

  const loadParking = async () => {
    try {
      setLoading(true);
      const response = await parkingService.getParkingById(id);
      if (response && response.data) {
        setParking(response.data);
      } else {
        toast.error("Parking not found");
        router.push("/dashboard/parkings");
      }
    } catch (err) {
      toast.error("Failed to load parking");
      router.push("/dashboard/parkings");
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess([UserRole.SYSTEM_SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OWNER])) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p className="text-slate-500">You do not have permission to edit this parking.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async (data: any) => {
    if (!user) return;
    setSaving(true);
    const loadingToast = toast.loading("Updating parking...");

    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("city", data.city || "");
      formData.append("region", data.region || "");
      formData.append("kebele", data.kebele || "");
      formData.append("woreda", data.woreda || "");
      formData.append("subCity", data.subCity || "");
      formData.append("lat", String(data.lat || 0));
      formData.append("lng", String(data.lng || 0));
      formData.append("numberOfSpots", String(data.numberOfSpots));
      formData.append("description", data.description || "");
      formData.append("commissionConfigId", data.commissionConfigId || "");
      formData.append("parkingCode", data.parkingCode || "");
      formData.append("parkingType", data.parkingType || "");
      formData.append("licenseNumber", data.licenseNumber || "");
      formData.append("tinNumber", data.tinNumber || "");
      formData.append("vatRegistrationNumber", data.vatRegistrationNumber || "");
      formData.append("status", data.status || "");
      formData.append("country", data.country || "");
      formData.append("streetName", data.streetName || "");
      formData.append("reservedSpots", String(data.reservedSpots || 0));
      formData.append("isIndoor", String(data.isIndoor));
      formData.append("pricingModel", data.pricingModel || "");
      formData.append("gracePeriod", String(data.gracePeriod || 0));
      formData.append("overtimePrice", String(data.overtimePrice || 0));
      formData.append("landmark", data.landmark || "");

      // License Files
      if (data.licenseFiles) {
        data.licenseFiles.forEach((file: any) => {
          if (file instanceof File) {
            formData.append("license", file);
          }
        });
      }

      formData.append("pricing", JSON.stringify(data.pricing));

      if (data.amenities && Array.isArray(data.amenities)) {
        formData.append("amenities", JSON.stringify(data.amenities));
      }
      if (data.amenityIds && Array.isArray(data.amenityIds)) {
        formData.append("amenityIds", JSON.stringify(data.amenityIds));
      }

      formData.append("isVatIncluded", String(data.isVatIncluded));

      if (data.featureImage instanceof File) {
        formData.append("image", data.featureImage);
      }

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

      await parkingService.updateParking(id, formData);
      toast.success("Parking updated successfully", { id: loadingToast });
      router.push("/dashboard/parkings");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update parking", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white">
      <ParkingForm
        initialData={parking}
        onSave={handleSave}
        onOpenChange={() => router.push("/dashboard/parkings")}
        isLoading={saving}
      />
    </div>
  );
}
