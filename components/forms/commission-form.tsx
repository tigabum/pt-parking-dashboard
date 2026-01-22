"use client";

import { useEffect, useState } from "react";
import { Commission, CommissionType, TierConfig } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Check,
    Loader2,
    Plus,
    Trash2,
    X,
    Wallet,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommissionFormProps {
    initialData?: any;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export function CommissionForm({
    initialData,
    onSave,
    onCancel,
    isLoading = false,
}: CommissionFormProps) {
    const [form, setForm] = useState<Partial<Commission>>({
        name: "",
        type: CommissionType.PERCENTAGE,
        value: 0,
        tierConfig: [{ minAmount: 0, maxAmount: -1, commission: 0 }],
        aboveThreshold: 0,
        aboveCommission: 0,
        includeVAT: false,
        isActive: true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setForm(initialData);
        }
    }, [initialData]);



    const addTier = () => {
        const tiers = [...(form.tierConfig || [])];
        const lastTier = tiers[tiers.length - 1];
        let nextMin = 0;
        if (lastTier) {
            // Validate last tier before adding new one
            if (lastTier.maxAmount !== -1 && lastTier.maxAmount <= lastTier.minAmount) {
                toast.error("Max amount must be greater than min amount");
                return;
            }

            if (lastTier.maxAmount === -1) {
                // If last was infinity, we convert it to a range to allow adding more
                lastTier.maxAmount = lastTier.minAmount + 1000;
                nextMin = lastTier.maxAmount + 1;
            } else {
                nextMin = lastTier.maxAmount + 1;
            }
        }
        tiers.push({ minAmount: nextMin, maxAmount: -1, commission: 0 });
        setForm({ ...form, tierConfig: tiers });
    };

    const removeTier = (idx: number) => {
        const tiers = form.tierConfig?.filter((_, i) => i !== idx);
        setForm({ ...form, tierConfig: tiers });
    };

    const updateTier = (idx: number, field: keyof TierConfig, val: number) => {
        const tiers = [...(form.tierConfig || [])];
        tiers[idx] = { ...tiers[idx], [field]: val } as any;

        if (field === "maxAmount" && tiers[idx + 1]) {
            if (val !== -1) tiers[idx + 1].minAmount = val + 1;
        }
        if (field === "minAmount" && idx > 0) {
            if (val > 0) tiers[idx - 1].maxAmount = val - 1;
        }
        setForm({ ...form, tierConfig: tiers });
    };



    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!form.name) {
            newErrors.name = "Rule name is required";
            toast.error("Rule name is required");
        }

        if (form.type === CommissionType.TIER) {
            if (!form.tierConfig || form.tierConfig.length === 0) {
                toast.error("At least one tier is required");
                // We return false immediately for complex array validation to avoid complex state for now
                setErrors(newErrors);
                return false;
            }

            for (let i = 0; i < form.tierConfig.length; i++) {
                const tier = form.tierConfig[i];
                if (tier.maxAmount !== -1 && tier.maxAmount <= tier.minAmount) {
                    toast.error(`Tier ${i + 1}: Max amount must be greater than min amount`);
                    setErrors(newErrors);
                    return false;
                }
                if (tier.commission < 0) {
                    toast.error(`Tier ${i + 1}: Fee amount cannot be negative`);
                    setErrors(newErrors);
                    return false;
                }
            }

            const lastTier = form.tierConfig[form.tierConfig.length - 1];
            if ((form.aboveThreshold ?? 0) > 0) {
                if (lastTier.maxAmount === -1) {
                    toast.error("Final tier cannot be infinity if a threshold surcharge is defined. Please set a max value for the last tier.");
                    setErrors(newErrors);
                    return false;
                }
                if ((form.aboveThreshold ?? 0) <= lastTier.maxAmount) {
                    toast.error(`Threshold value must be greater than the final tier's max amount (${lastTier.maxAmount} ETB)`);
                    setErrors(newErrors);
                    return false;
                }
                if ((form.aboveCommission ?? 0) <= 0) {
                    toast.error("Please set a valid fee for the threshold surcharge");
                    setErrors(newErrors);
                    return false;
                }
            }
        } else {
            if ((form.value ?? 0) <= 0) {
                newErrors.value = "Please set a valid commission value";
                toast.error("Please set a valid commission value");
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        onSave({ ...form });
    };

    return (
        <div className="w-full h-full bg-slate-50 overflow-y-auto">
            <div className="min-h-full w-full flex flex-col items-center py-12 px-6">
                <div className="w-full max-w-[850px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Visual Header */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner group">
                            <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Wallet className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {initialData ? "Update Policy" : "Add Commission Rule"}
                            </h2>
                            <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto uppercase tracking-widest">
                                Configure payout logic for assigned parking.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-12">

                        {/* Basic Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-widest text-[10px]">Rule Name*</Label>
                                <Input
                                    className={`h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold ${errors.name ? "border-red-500 bg-red-50" : ""}`}
                                    placeholder="Enter Rule Name"
                                    value={form.name}
                                    onChange={(e) => {
                                        setForm({ ...form, name: e.target.value });
                                        if (errors.name) setErrors({ ...errors, name: "" });
                                    }}
                                    required
                                />
                                {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                            </div>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-widest text-[10px]">Commission Strategy*</Label>
                                <Select
                                    value={form.type}
                                    onValueChange={(val) => setForm({ ...form, type: val as CommissionType })}
                                >
                                    <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-slate-50/50 font-bold focus:ring-[#0066FF]">
                                        <SelectValue placeholder="Enter Strategy Selection" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value={CommissionType.PERCENTAGE}>Percentage (%)</SelectItem>
                                        <SelectItem value={CommissionType.FLAT}>Flat Fee (ETB)</SelectItem>
                                        <SelectItem value={CommissionType.TIER}>Tiered Brackets</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>


                        {/* VAT & TAX SECTION */}
                        <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-between relative transition-all hover:bg-primary/10">
                            <div className="flex gap-5 items-center">
                                <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary border border-primary/10">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-base font-black text-slate-900">Include Base VAT (15%)</h4>
                                    <p className="text-[11px] text-primary/60 font-bold uppercase tracking-widest italic">
                                        Enable to automatically add 15% tax on top of commission
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={form.includeVAT}
                                onCheckedChange={(val) => setForm({ ...form, includeVAT: val })}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        {/* Tiers Section */}
                        {form.type === CommissionType.TIER && (
                            <div className="space-y-8 pt-4">
                                <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-3">
                                    <Plus className="h-5 w-5 text-primary" />
                                    Price brackets
                                </h3>

                                <div className="space-y-8">
                                    {form.tierConfig?.map((tier, i) => (
                                        <div key={i} className="group relative animate-in fade-in slide-in-from-left-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Min Amount*</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-lg"
                                                        placeholder="Enter Min Amount"
                                                        value={tier.minAmount}
                                                        onChange={(e) => updateTier(i, "minAmount", +e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Max Amount*</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-lg"
                                                        placeholder="Enter Max Amount"
                                                        value={tier.maxAmount}
                                                        onChange={(e) => updateTier(i, "maxAmount", +e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-3 relative">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fee Amount*</Label>
                                                    <div className="flex gap-3">
                                                        <Input
                                                            type="number"
                                                            className="h-14 rounded-xl border-primary/20 bg-primary/5 font-black text-primary text-xl px-4"
                                                            placeholder="Enter Fee"
                                                            value={tier.commission}
                                                            onChange={(e) => updateTier(i, "commission", +e.target.value)}
                                                        />
                                                        {form.tierConfig!.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeTier(i)}
                                                                className="h-14 w-14 shrink-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addTier}
                                            className="h-12 px-8 rounded-xl border-[#0066FF] text-[#0066FF] font-black hover:bg-[#0066FF]/5 border-2"
                                        >
                                            <Plus className="h-4 w-4 mr-2 stroke-[3]" /> Add Tier
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Single Value Calculation (Percentage/Flat) */}
                        {form.type !== CommissionType.TIER && (
                            <div className="p-10 rounded-[2.5rem] bg-primary/5 border border-primary/10 space-y-6">
                                <div className="flex items-center gap-3 text-primary/70 font-black text-sm uppercase tracking-[0.2em]">
                                    <AlertCircle className="h-5 w-5" />
                                    Platform Revenue Cut
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Set Flat Fee or Percentage</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            className={`h-24 rounded-3xl border-indigo-200 bg-white text-6xl font-black text-primary px-10 tracking-tighter ${errors.value ? "border-red-500 bg-red-50" : ""}`}
                                            value={form.value}
                                            onChange={(e) => {
                                                setForm({ ...form, value: +e.target.value });
                                                if (errors.value) setErrors({ ...errors, value: "" });
                                            }}
                                        />
                                        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-3xl font-black text-primary/10 select-none">
                                            {form.type === CommissionType.PERCENTAGE ? '%' : 'ETB'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Above Some Value Section - OUTSIDE loop */}
                        {form.type === CommissionType.TIER && (
                            <div className="space-y-8 pt-8 border-t border-slate-100">
                                <div className="flex items-center">
                                    <div className="bg-primary/5 text-primary/70 px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-black border border-primary/10 shadow-sm transition-transform hover:scale-105 cursor-default">
                                        Above Some Value
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Above Value</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                className="h-16 rounded-2xl border-slate-200 bg-slate-50/50 font-black text-2xl px-6"
                                                placeholder="Enter Threshold"
                                                value={form.aboveThreshold}
                                                onChange={(e) => setForm({ ...form, aboveThreshold: +e.target.value })}
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-300">ETB</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fee Value</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                className="h-16 rounded-2xl border-slate-200 bg-slate-50/50 font-black text-2xl px-6 text-primary"
                                                placeholder="Enter Fee"
                                                value={form.aboveCommission}
                                                onChange={(e) => setForm({ ...form, aboveCommission: +e.target.value })}
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-primary/30">ETB</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-slate-400 italic">
                                    This surcharge applies to any booking total exceeding the specified threshold, after base tiers are calculated.
                                </p>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-4 pt-12 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onCancel}
                                className="h-14 px-8 rounded-xl font-bold text-slate-400 hover:text-slate-900"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="h-14 px-12 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold transition-all flex items-center justify-center gap-3 min-w-[180px] shadow-none border-none"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Check className="h-5 w-5" />
                                )}
                                {initialData ? "Save Changes" : "Create Policy"}
                            </Button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
