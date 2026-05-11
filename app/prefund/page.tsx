"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, CreditCard, Lock, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TEST_PARKING_ID = "885b4cb6-f2aa-4d51-8a2c-fd558c547c5b";

function PrefundContent() {
    const searchParams = useSearchParams();
    const parkingCode = searchParams.get("parkingCode") || searchParams.get("parkingId") || DEFAULT_TEST_PARKING_ID;
    const tokenFromUrl = searchParams.get("token");
    const apiBaseFromUrl = searchParams.get("api_base");

    const [amount, setAmount] = useState<string>("50");
    const [jwt, setJwt] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const storedJwt = sessionStorage.getItem("parking_prefund_jwt");
        if (tokenFromUrl) {
            setJwt(tokenFromUrl);
        } else if (storedJwt) {
            setJwt(storedJwt);
        }

        const amountFromUrl = searchParams.get("amount");
        if (amountFromUrl) {
            setAmount(amountFromUrl);
        }
    }, [tokenFromUrl, searchParams]);

    const handleInitiatePayment = async () => {
        setError(null);
        setSuccess(null);

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum < 1) {
            toast.error("Please enter a valid amount (min 1 ETB)");
            return;
        }

        let cleanJwt = jwt.trim();
        if (/^bearer\s+/i.test(cleanJwt)) {
            cleanJwt = cleanJwt.replace(/^bearer\s+/i, "");
        }

        if (!cleanJwt) {
            setError("JWT Token is required. Please paste your bearer token.");
            return;
        }

        try {
            setLoading(true);
            sessionStorage.setItem("parking_prefund_jwt", cleanJwt);

            // Try direct backend first (works when token has an active Redis session).
            // Falls back to the Next.js proxy which also forwards auth headers server-side.
            const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://gelaglepark.com/api/parking";
            const DIRECT_URL = `${BASE_API_URL}/wallets/parking/${parkingCode}/prefund`;
            const PROXY_URL = `/api/parking-proxy/wallets/parking/${parkingCode}/prefund`;

            const requestInit: RequestInit = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${cleanJwt}`,
                },
                body: JSON.stringify({ amount: amountNum }),
            };

            let response: Response;
            try {
                // Direct call — succeeds when backend CORS allows this origin
                response = await fetch(DIRECT_URL, requestInit);
            } catch {
                // CORS / network error → fall through to proxy
                response = await fetch(PROXY_URL, requestInit);
            }

            // Handle token rotation (session.interceptor sends x-new-token header)
            const newToken = response.headers.get("x-new-token");
            if (newToken) {
                setJwt(newToken);
                sessionStorage.setItem("parking_prefund_jwt", newToken);
            }

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const serverMsg = data?.message || data?.error || "";
                const isSessionExpired =
                    response.status === 401 ||
                    serverMsg.toLowerCase().includes("session") ||
                    serverMsg.toLowerCase().includes("expired");

                const msg = isSessionExpired
                    ? "Token expired or session not found. Please paste a fresh token from the main app login, then try again."
                    : serverMsg || "Failed to initiate payment";
                throw new Error(msg);
            }

            const paymentUrl = data?.data?.paymentUrl || data?.paymentUrl;
            if (!paymentUrl) {
                throw new Error("Payment URL not found in response.");
            }

            setSuccess("Payment initiated! Redirecting to Telebirr...");
            toast.success("Redirecting to Telebirr...", {
                description: `Amount: ${amountNum} ETB`
            });

            setTimeout(() => {
                window.location.href = paymentUrl;
            }, 1000);
        } catch (err: any) {
            console.error(err);
            const errMsg = err.message || "An unexpected error occurred";
            setError(errMsg);
            toast.error("Payment Failed", { description: errMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 selection:bg-primary/30">
            {/* Background decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-indigo-900/5 blur-[160px]" />
            </div>

            <Card className="w-full max-w-md glass-dark border-white/5 relative z-10 overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1.5 premium-gradient" />

                <CardHeader className="text-center space-y-2 pb-8">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 animate-float border border-primary/20 shadow-[0_0_20px_rgba(79,60,194,0.1)]">
                        <Wallet className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                        Wallet Prefund
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-medium">
                        Securely top up your parking wallet via Telebirr
                    </CardDescription>

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            ID: <span className="text-primary font-mono">{parkingCode.substring(0, 12)}...</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            <ShieldCheck className="w-3 h-3 text-blue-400" />
                            API: <span className="text-blue-400 font-mono">{apiBaseFromUrl ? "Custom" : "Remote (8080)"}</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Custom Amount */}
                    <div className="space-y-3">
                        <Label htmlFor="amount" className="text-white/70 text-xs font-bold uppercase tracking-widest">
                            Enter top-up amount (ETB)
                        </Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Coins className="h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                            </div>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="Enter amount (e.g. 100)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-12 h-14 bg-white/5 border-white/10 text-white focus:ring-primary/50 focus:border-primary transition-all rounded-xl text-lg font-bold"
                            />
                        </div>
                    </div>

                    {/* JWT Token */}
                    <div className="space-y-3">
                        <Label htmlFor="token" className="text-white/70 text-xs font-bold uppercase tracking-widest flex items-center justify-between">
                            <span>Parking API Token (JWT)</span>
                            <Lock className="w-3 h-3 text-slate-500" />
                        </Label>
                        <div className="relative group">
                            <Input
                                id="token"
                                type="password"
                                placeholder="Paste Bearer token"
                                value={jwt}
                                onChange={(e) => setJwt(e.target.value)}
                                className="h-14 bg-white/5 border-white/10 text-white focus:ring-primary/50 focus:border-primary transition-all rounded-xl font-mono text-sm"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight italic px-1">
                            This token is required for parking API validation. It is not shared with Telebirr.
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-xs font-bold uppercase">Error</AlertTitle>
                            <AlertDescription className="text-xs font-medium">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-in fade-in slide-in-from-top-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle className="text-xs font-bold uppercase">Processing</AlertTitle>
                            <AlertDescription className="text-xs font-medium">
                                {success}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>

                <CardFooter className="pt-2 flex flex-col gap-4">
                    <Button
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-lg rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-[0.97] disabled:opacity-50 group overflow-hidden relative"
                        onClick={handleInitiatePayment}
                        disabled={loading}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                CONSTRUCTING ORDER...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                PAY WITH TELEBIRR
                            </span>
                        )}
                    </Button>

                    <div className="flex items-center justify-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Encrypted</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>Instant Settlement</span>
                    </div>
                </CardFooter>
            </Card>

            <style jsx global>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}

export default function PrefundPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <PrefundContent />
        </Suspense>
    );
}
