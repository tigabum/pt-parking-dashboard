"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { commissionService } from "@/lib/services/commission-service";
import { Commission, CommissionType } from "@/components/types";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";
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
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!commission) return null;

    return (
        <div className="min-h-screen bg-slate-50/30 p-8 pt-12">
            <div className="max-w-4xl mx-auto space-y-10">
                {/* Navigation */}
                <button
                    onClick={() => router.push("/dashboard/configurations")}
                    className="flex items-center gap-2 text-slate-500 font-bold hover:text-primary transition-colors group"
                >
                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-primary/5">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    Back to Rules
                </button>

                {/* Header Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <Settings2 className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{commission.name}</h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-1">Platform Commission Configuration</p>
                    </div>

                    <Button
                        onClick={() => router.push(`/dashboard/configurations/${id}/edit`)}
                        className="h-12 px-8 rounded-2xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold shadow-sm"
                    >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Rule
                    </Button>
                </div>

                {/* Content Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Strategy Card */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Strategy Overview</h3>
                                <div className="flex items-center gap-6">
                                    <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                        {commission.type === CommissionType.PERCENTAGE && <Percent className="h-10 w-10 text-indigo-600" />}
                                        {commission.type === CommissionType.FLAT && <Coins className="h-10 w-10 text-indigo-600" />}
                                        {commission.type === CommissionType.TIER && <Layers className="h-10 w-10 text-indigo-600" />}
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">{commission.type}</p>
                                        <p className="text-slate-500 font-bold">Calculation Strategy</p>
                                    </div>
                                </div>
                            </div>

                            {commission.type !== CommissionType.TIER ? (
                                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Base Value</p>
                                    <p className="text-5xl font-black text-primary">
                                        {commission.value}
                                        <span className="text-xl text-slate-400 ml-2 uppercase font-bold">
                                            {commission.type === CommissionType.PERCENTAGE ? '%' : 'ETB'}
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bracket Definition</p>
                                    <div className="grid gap-3">
                                        {commission.tierConfig?.map((tier, i) => (
                                            <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                                <span className="font-bold text-slate-600">
                                                    {tier.minAmount} — {tier.maxAmount === -1 ? '∞' : tier.maxAmount} ETB
                                                </span>
                                                <span className="font-black text-primary">{tier.commission} ETB Base Fee</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Global Threshold Display */}
                            {(commission.aboveThreshold > 0 && commission.aboveCommission > 0) && (
                                <div className="p-8 rounded-3xl bg-indigo-50 border border-indigo-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Global Overflow Surcharge</p>
                                            <p className="text-xl font-black text-indigo-900 mt-1">+{commission.aboveCommission} ETB Extra</p>
                                        </div>
                                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                            <Layers className="h-6 w-6 text-indigo-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-indigo-400">Applied when booking total exceeds {commission.aboveThreshold} ETB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metrics/Sidebar */}
                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Attributes</h4>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Status</p>
                                        <p className="font-bold text-slate-900">{commission.isActive ? "Active Configuration" : "Inactive"}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                        <Percent className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">VAT Integration</p>
                                        <p className="font-bold text-slate-900">{commission.includeVAT ? "Yes (15%)" : "Excluded"}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Created On</p>
                                        <p className="font-bold text-slate-900">{new Date(commission.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-200">
                            <h4 className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-4">Quick Tip</h4>
                            <p className="text-sm font-medium leading-relaxed opacity-90">
                                This rule is linked to multiple parking entities. Updating it will affect all future booking fees for those facilities.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
