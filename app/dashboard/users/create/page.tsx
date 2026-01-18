"use client";
import { UserRole } from "@/lib/auth";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { UserForm } from "@/components/forms/user-form";

export default function CreateUserPage() {
    const router = useRouter();
    const { canAccess } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!canAccess([UserRole.SYSTEM_SUPER_ADMIN])) {
        return <div className="p-6 text-center">Access Denied</div>;
    }

    const handleSave = async (data: FormData) => {
        setLoading(true);
        const loadingToast = toast.loading("Creating system user...");

        try {
            await userService.registerUser(data);
            toast.success("User created successfully", { id: loadingToast });
            router.push("/dashboard/users");
            router.refresh();
        } catch (err: any) {
            toast.error(err?.message || "Failed to create user", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white">
            <UserForm
                onSave={handleSave}
                onOpenChange={() => router.push("/dashboard/users")}
                isLoading={loading}
                isNew={true}
            />
        </div>
    );
}
