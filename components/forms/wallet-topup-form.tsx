"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { walletService } from "@/lib/services/wallet-service";
import { toast } from "sonner";
import { Loader2, DollarSign, Wallet } from "lucide-react";

interface WalletTopupFormProps {
    parkingId: string;
    parkingName?: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function WalletTopupForm({
    parkingId,
    parkingName,
    onSuccess,
    onCancel,
}: WalletTopupFormProps) {
    const [amount, setAmount] = useState<string>("");
    const [description, setDescription] = useState<string>("Manual Topup");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error("Please enter a valid positive amount");
            return;
        }

        try {
            setIsLoading(true);
            await walletService.addFunds(parkingId, numAmount, description);
            toast.success("Wallet topped up successfully");
            onSuccess();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to top up wallet");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-1">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Allocated Parking
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <Wallet className="h-5 w-5 text-primary opacity-50" />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{parkingName || "Selected Parking"}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{parkingId}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="amount" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Topup Amount (ETB) *
                    </Label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="1"
                            placeholder="Enter amount (e.g. 500)"
                            className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-bold"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Reference / Note
                    </Label>
                    <Input
                        id="description"
                        placeholder="Manual credit topup"
                        className="h-14 rounded-2xl border-slate-200 bg-white font-bold"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="flex-1 h-14 rounded-2xl font-bold text-slate-500"
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        "Confirm Topup"
                    )}
                </Button>
            </div>
        </form>
    );
}
