"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { commissionService } from "@/lib/services/commission-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { CommissionForm } from "@/components/forms/commission-form";
import { Loader2 } from "lucide-react";

export default function EditCommissionPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { canAccess } = useAuth();

    const [commission, setCommission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id) {
            loadCommission();
        }
    }, [id]);

    const loadCommission = async () => {
        try {
            setLoading(true);
            const res = await commissionService.getCommission(id);
            if (res && res.data) {
                setCommission(res.data);
            } else {
                toast.error("Configuration not found");
                router.push("/dashboard/configurations");
            }
        } catch (err) {
            toast.error("Failed to load configuration");
            router.push("/dashboard/configurations");
        } finally {
            setLoading(false);
        }
    };

    if (!canAccess([UserRole.SYSTEM_SUPER_ADMIN])) {
        return <div className="p-6 text-center font-bold text-slate-500">Access Denied</div>;
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const handleSave = async (data: any) => {
        setSaving(true);
        const loadingToast = toast.loading("Updating commission configuration...");

        try {
            const res = await commissionService.updateCommission(id, data);
            if (res.success) {
                toast.success("Configuration updated successfully", { id: loadingToast });
                router.push("/dashboard/configurations");
            } else {
                toast.error(res.message || "Failed to update configuration", { id: loadingToast });
            }
        } catch (err: any) {
            toast.error(err?.message || "Something went wrong", { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-hidden">
            <CommissionForm
                initialData={commission}
                onSave={handleSave}
                onCancel={() => router.push("/dashboard/configurations")}
                isLoading={saving}
            />
        </div>
    );
}
