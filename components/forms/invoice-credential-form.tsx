"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Receipt, Building2, ShieldCheck, Database } from "lucide-react";
import { toast } from "sonner";
import { invoiceService, InvoiceCredential } from "@/lib/services/invoice-service";

interface InvoiceCredentialFormProps {
    parkingId: string;
}

export function InvoiceCredentialForm({ parkingId }: InvoiceCredentialFormProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<InvoiceCredential>({
        clientId: "",
        clientSecret: "",
        apiKey: "",
        tin: "",
        vatNumber: "",
        systemNumber: "",
        systemType: "",
        signature: "",
        certificate: "",
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await invoiceService.getCredentials(parkingId);
                if (data) {
                    setFormData({
                        clientId: data.clientId || "",
                        clientSecret: data.clientSecret || "",
                        apiKey: data.apiKey || "",
                        tin: data.tin || "",
                        vatNumber: data.vatNumber || "",
                        systemNumber: data.systemNumber || "",
                        systemType: data.systemType || "",
                        signature: data.signature || "",
                        certificate: data.certificate || "",
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await invoiceService.saveCredentials(parkingId, formData);
            toast.success("Invoice credentials saved successfully");
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
                <span className="ml-2">Fetching agent configuration...</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-20">
            <Card className="border-slate-200 shadow-xl shadow-slate-200/50">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 text-primary rounded-lg">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">API Authentication</CardTitle>
                            <CardDescription className="text-slate-500 font-medium">MOR CORE API credentials provided during registration</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10">
                    <div className="space-y-3">
                        <Label htmlFor="clientId" className="text-xs font-black uppercase tracking-widest text-slate-400">Client ID *</Label>
                        <Input id="clientId" name="clientId" value={formData.clientId} onChange={handleChange} required className="h-12 font-mono bg-slate-50 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="clientSecret" className="text-xs font-black uppercase tracking-widest text-slate-400">Client Secret *</Label>
                        <Input id="clientSecret" name="clientSecret" type="password" value={formData.clientSecret} onChange={handleChange} required className="h-12 font-mono bg-slate-50 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="apiKey" className="text-xs font-black uppercase tracking-widest text-slate-400">API Key *</Label>
                        <Input id="apiKey" name="apiKey" value={formData.apiKey} onChange={handleChange} required className="h-12 font-mono bg-slate-50 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="tin" className="text-xs font-black uppercase tracking-widest text-slate-400">Seller TIN *</Label>
                        <Input id="tin" name="tin" value={formData.tin} onChange={handleChange} required className="h-12 font-bold border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="vatNumber" className="text-xs font-black uppercase tracking-widest text-slate-400">VAT Number</Label>
                        <Input id="vatNumber" name="vatNumber" value={formData.vatNumber} onChange={handleChange} className="h-12 font-bold border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="systemNumber" className="text-xs font-black uppercase tracking-widest text-slate-400">System Number</Label>
                        <Input id="systemNumber" name="systemNumber" value={formData.systemNumber} onChange={handleChange} className="h-12 font-bold border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="systemType" className="text-xs font-black uppercase tracking-widest text-slate-400">System Type</Label>
                        <Input id="systemType" name="systemType" value={formData.systemType} onChange={handleChange} className="h-12 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="signature" className="text-xs font-black uppercase tracking-widest text-slate-400">Signature</Label>
                        <Input id="signature" name="signature" value={formData.signature} onChange={handleChange} className="h-12 border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="certificate" className="text-xs font-black uppercase tracking-widest text-slate-400">Certificate</Label>
                        <Input id="certificate" name="certificate" value={formData.certificate} onChange={handleChange} className="h-12 border-slate-200 focus:ring-primary/20" />
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
                            Saving Credentials...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Credentials
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
