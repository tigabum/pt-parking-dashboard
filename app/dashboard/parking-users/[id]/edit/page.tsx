"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { ParkingUserForm } from "@/components/forms/parking-user-form";
import { Loader2 } from "lucide-react";

export default function EditParkingUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { canAccess } = useAuth();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id) {
            loadUser();
        }
    }, [id]);

    const loadUser = async () => {
        try {
            setLoading(true);
            const response = await userService.getUserById(id);
            if (response && response.data) {
                setUser(response.data);
            } else {
                toast.error("User not found");
                router.push("/dashboard/parking-users");
            }
        } catch (err) {
            toast.error("Failed to load user data");
            router.push("/dashboard/parking-users");
        } finally {
            setLoading(false);
        }
    };

    if (!canAccess([UserRole.SYSTEM_SUPER_ADMIN, UserRole.PARKING_SUPER_ADMIN])) {
        return <div className="p-6 text-center">Access Denied</div>;
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleSave = async (data: FormData) => {
        setSaving(true);
        const loadingToast = toast.loading("Updating manager assignment...");

        try {
            await userService.updateUser(id, data);
            toast.success("Assignment updated successfully", { id: loadingToast });
            router.push("/dashboard/parking-users");
            router.refresh();
        } catch (err: any) {
            toast.error(err?.message || "Failed to update assignment", { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white">
            <ParkingUserForm
                initialData={user}
                onSave={handleSave}
                onOpenChange={() => router.push("/dashboard/parking-users")}
                isLoading={saving}
                isNew={false}
            />
        </div>
    );
}
