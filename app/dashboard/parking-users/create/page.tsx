"use client";
import { UserRole } from "@/lib/auth";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { ParkingUserForm } from "@/components/forms/parking-user-form";

export default function CreateParkingUserPage() {
    const router = useRouter();
    const { canAccess } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!canAccess([UserRole.SYSTEM_SUPER_ADMIN, UserRole.OWNER])) {
        return <div className="p-6 text-center">Access Denied</div>;
    }

    const handleSave = async (data: FormData) => {
        setLoading(true);
        const loadingToast = toast.loading("Registering parking manager...");

        try {
            await userService.registerUser(data);
            toast.success("Parking manager created and assigned!", { id: loadingToast });
            router.push("/dashboard/parking-users");
            router.refresh();
        } catch (err: any) {
            toast.error(err?.message || "Failed to create manager", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white">
            <ParkingUserForm
                onSave={handleSave}
                onOpenChange={() => router.push("/dashboard/parking-users")}
                isLoading={loading}
                isNew={true}
            />
        </div>
    );
}
