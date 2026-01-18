"use client";
import { UserRole } from "@/lib/auth";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { commissionService } from "@/lib/services/commission-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { CommissionForm } from "@/components/forms/commission-form";

export default function CreateCommissionPage() {
    const router = useRouter();
    const { canAccess } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!canAccess([UserRole.SYSTEM_SUPER_ADMIN])) {
        return <div className="p-6 text-center font-bold text-slate-500">Access Denied</div>;
    }

    const handleSave = async (data: any) => {
        setLoading(true);
        const loadingToast = toast.loading("Creating commission configuration...");

        try {
            const res = await commissionService.createCommission(data);
            if (res.success) {
                toast.success("Commission configuration created successfully", { id: loadingToast });
                router.push("/dashboard/configurations");
            } else {
                toast.error(res.message || "Failed to create configuration", { id: loadingToast });
            }
        } catch (err: any) {
            toast.error(err?.message || "Something went wrong", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-hidden">
            <CommissionForm
                onSave={handleSave}
                onCancel={() => router.push("/dashboard/configurations")}
                isLoading={loading}
            />
        </div>
    );
}
