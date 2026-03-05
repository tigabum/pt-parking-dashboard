"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/auth-context";
import { InvoiceCredentialForm } from "@/components/forms/invoice-credential-form";
import { PageHeader } from "@/components/layouts/page-header";
import { Receipt, AlertCircle, Building2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/lib/auth";

export default function InvoiceCredentialsPage() {
    const { user } = useAuth();

    // For Parking Admins, orgId is their parking ID
    const [selectedParkingId, setSelectedParkingId] = useState<string>("");
    const isSystemAdmin = user?.role === UserRole.SYSTEM_ADMIN || user?.role === UserRole.SYSTEM_SUPER_ADMIN;

    useEffect(() => {
        if (user?.orgId) {
            setSelectedParkingId(user.orgId);
        }
    }, [user]);

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 animate-in fade-in duration-500">
            <PageHeader
                title="MOR Invoice Credentials"
                description="Configure your connection to the Ethiopian Ministry of Revenue CORE API"
            />

            {isSystemAdmin && (
                <div className="max-w-5xl mx-auto w-full space-y-4">
                    <Label className="text-sm font-bold uppercase tracking-tight text-slate-500">
                        Select Parking Agent to Configure
                    </Label>
                    <ParkingSelect
                        value={selectedParkingId}
                        onChange={setSelectedParkingId}
                    />
                </div>
            )}

            {!selectedParkingId && !isSystemAdmin && (
                <Alert variant="destructive" className="max-w-3xl mx-auto rounded">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Parking Assigned</AlertTitle>
                    <AlertDescription>
                        Your account is not assigned to any parking facility. Please contact your administrator to set up your parking association.
                    </AlertDescription>
                </Alert>
            )}

            {isSystemAdmin && !selectedParkingId && (
                <div className="flex flex-col items-center justify-center p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl max-w-4xl mx-auto w-full">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-6">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Select an Agent</h3>
                    <p className="text-slate-500 text-center max-w-md">
                        Please select a parking agent from the dropdown above to manage their specific invoice credentials.
                    </p>
                </div>
            )}

            {selectedParkingId && (
                <div className="space-y-6">
                    <Alert className="max-w-5xl mx-auto border-primary/20 bg-primary/5 rounded">
                        <Receipt className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-primary font-bold">Active Configuration Interface</AlertTitle>
                        <AlertDescription className="text-slate-600">
                            Editing these credentials will update the connection parameters for the selected agent.
                            Ensure all API keys and secrets are current to prevent invoice registration failures.
                        </AlertDescription>
                    </Alert>

                    <InvoiceCredentialForm parkingId={selectedParkingId} />
                </div>
            )}
        </div>
    );
}

function ParkingSelect({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    const [parkings, setParkings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { parkingService } = await import("@/lib/services/parking-service");
            const res = await parkingService.getAllParking({ limit: 1000 });
            if (res && res.data) setParkings(res.data);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-14 w-full bg-white border-slate-200 rounded shadow-sm text-lg font-bold">
                <SelectValue placeholder={loading ? "Loading agents..." : "Select a Parking Agent"} />
            </SelectTrigger>
            <SelectContent className="rounded shadow-2xl">
                {parkings.map(p => (
                    <SelectItem key={p.id} value={p.id} className="font-bold py-3">
                        {p.name} ({p.parkingCode})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
