"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { commissionService } from "@/lib/services/commission-service";
import { Commission, CommissionType } from "@/components/types";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    ArrowLeft,
    Settings2,
    Percent,
    Coins,
    Layers,
    ShieldCheck,
    Calendar,
    Edit3
} from "lucide-react";
import { DetailLayout, DetailSection, DetailItem } from "@/components/layouts/detail-layout";

export default function CommissionDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { canAccess } = useAuth();

    const [commission, setCommission] = useState<Commission | null>(null);
    const [loading, setLoading] = useState(true);

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
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-bold text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                <p className="uppercase tracking-widest text-[10px]">Accessing Governance Rules...</p>
            </div>
        );
    }

    if (!commission) return null;

    return (
        <DetailLayout
            backLink={{ label: "Configurations", href: "/dashboard/configurations" }}
            title={commission.name}
            subtitle="Platform Commission Configuration"
            actions={
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => router.push(`/dashboard/configurations/${id}/edit`)}
                        className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-primary/10"
                    >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Rule
                    </Button>
                    <Badge
                        className={`h-10 px-5 rounded-xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest border-none ${commission.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                        {commission.isActive ? "Active" : "Inactive"}
                    </Badge>
                </div>
            }
        >
            <DetailSection title="Configuration Detail">
                <DetailItem label="Rule Name" value={commission.name} />
                <DetailItem label="Calculation Type" value={
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
                            {commission.type === CommissionType.PERCENTAGE && <Percent className="h-4 w-4 text-primary" />}
                            {commission.type === CommissionType.FLAT && <Coins className="h-4 w-4 text-primary" />}
                            {commission.type === CommissionType.TIER && <Layers className="h-4 w-4 text-primary" />}
                        </div>
                        <span className="font-bold uppercase tracking-wide">{commission.type}</span>
                    </div>
                } />
                <DetailItem label="Status" value={commission.isActive ? "Active Configuration" : "Restricted"} />
                <DetailItem label="VAT Inclusion" value={commission.includeVAT ? "Yes (15% Integrated)" : "Excluded"} />
                <DetailItem label="Registration Date" value={new Date(commission.createdAt).toLocaleDateString()} />

                {commission.type !== CommissionType.TIER ? (
                    <DetailItem label="Base Value" value={
                        <span className="text-2xl font-black text-primary">
                            {commission.value}
                            <span className="text-sm text-slate-400 ml-1 uppercase">{commission.type === CommissionType.PERCENTAGE ? '%' : 'ETB'}</span>
                        </span>
                    } />
                ) : (
                    <div className="col-span-full mt-6">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Bracket Definition</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {commission.tierConfig?.map((tier, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="font-bold text-slate-600 text-xs">
                                        {tier.minAmount} — {tier.maxAmount === -1 ? '∞' : tier.maxAmount} ETB
                                    </span>
                                    <span className="font-black text-primary text-sm">{tier.commission} ETB</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(commission.aboveThreshold > 0 && commission.aboveCommission > 0) && (
                    <div className="col-span-full mt-6 p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Global Overflow Surcharge</p>
                            <p className="text-xl font-black text-indigo-900 mt-1">+{commission.aboveCommission} ETB Extra</p>
                            <p className="text-[10px] font-bold text-indigo-300 mt-1">Applied when booking total exceeds {commission.aboveThreshold} ETB</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                            <Layers className="h-6 w-6 text-indigo-600" />
                        </div>
                    </div>
                )}
            </DetailSection>
        </DetailLayout>
    );
}

import { Label } from "@/components/ui/label";
