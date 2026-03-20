"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, CreditCard, ShieldCheck, Link2 } from "lucide-react";
import { toast } from "sonner";
import { telebirrService, TelebirrCredential } from "@/lib/services/telebirr-service";

interface TelebirrConfigFormProps {
    parkingId: string;
}

export function TelebirrConfigForm({ parkingId }: TelebirrConfigFormProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<TelebirrCredential>({
        appSecret: "",
        fabricAppId: "",
        merchantAppId: "",
        merchantCode: "",
        privateKey: "",
        redirectUrl: "",
        notifyUrl: "",
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await telebirrService.getCredentials(parkingId);
                if (data) {
                    setFormData({
                        appSecret: data.appSecret || "",
                        fabricAppId: data.fabricAppId || "",
                        merchantAppId: data.merchantAppId || "",
                        merchantCode: data.merchantCode || "",
                        privateKey: data.privateKey || "",
                        redirectUrl: data.redirectUrl || "",
                        notifyUrl: data.notifyUrl || "",
                    });
                }
            } catch (error) {
                console.error("Failed to load credentials", error);
                toast.error("Failed to load existing credentials");
            } finally {
                setLoading(false);
            }
        };

        if (parkingId) {
            loadData();
        }
    }, [parkingId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await telebirrService.saveCredentials(parkingId, formData);
            toast.success("Telebirr configuration saved successfully");
        } catch (error) {
            console.error("Failed to save credentials", error);
            toast.error("Failed to save credentials");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center font-bold">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Fetching Telebirr configuration...</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-20">
            <Card className="border-slate-200 shadow-xl shadow-slate-200/50">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 text-primary rounded-lg">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Telebirr Integration</CardTitle>
                            <CardDescription className="text-slate-500 font-medium">Configure Fabric and Merchant credentials for payments</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10">
                    <div className="space-y-3">
                        <Label htmlFor="fabricAppId" className="text-xs font-black uppercase tracking-widest text-slate-400">Fabric App ID *</Label>
                        <Input id="fabricAppId" name="fabricAppId" value={formData.fabricAppId} onChange={handleChange} required className="h-12 font-mono bg-slate-50 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="appSecret" className="text-xs font-black uppercase tracking-widest text-slate-400">App Secret *</Label>
                        <Input id="appSecret" name="appSecret" type="password" value={formData.appSecret} onChange={handleChange} required className="h-12 font-mono bg-slate-50 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="merchantAppId" className="text-xs font-black uppercase tracking-widest text-slate-400">Merchant App ID *</Label>
                        <Input id="merchantAppId" name="merchantAppId" value={formData.merchantAppId} onChange={handleChange} required className="h-12 font-mono bg-slate-50 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="merchantCode" className="text-xs font-black uppercase tracking-widest text-slate-400">Merchant Code *</Label>
                        <Input id="merchantCode" name="merchantCode" value={formData.merchantCode} onChange={handleChange} required className="h-12 font-bold border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <Label htmlFor="privateKey" className="text-xs font-black uppercase tracking-widest text-slate-400">Private Key (RSA) *</Label>
                        <Textarea id="privateKey" name="privateKey" value={formData.privateKey} onChange={handleChange} required className="min-h-[150px] font-mono bg-slate-50 border-slate-200 focus:ring-primary/20" placeholder="-----BEGIN PRIVATE KEY----- ..." />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="redirectUrl" className="text-xs font-black uppercase tracking-widest text-slate-400">Redirect URL (Optional)</Label>
                        <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input id="redirectUrl" name="redirectUrl" value={formData.redirectUrl} onChange={handleChange} className="h-12 pl-10 border-slate-200 focus:ring-primary/20" placeholder="https://..." />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="notifyUrl" className="text-xs font-black uppercase tracking-widest text-slate-400">Notify URL (Optional)</Label>
                        <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input id="notifyUrl" name="notifyUrl" value={formData.notifyUrl} onChange={handleChange} className="h-12 pl-10 border-slate-200 focus:ring-primary/20" placeholder="https://api..." />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4 pb-10">
                <Button
                    type="submit"
                    disabled={saving}
                    className="h-12 w-full md:w-64 bg-primary rounded px-8 shadow-lg shadow-primary/20 font-bold"
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving Configuration...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Configuration
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
