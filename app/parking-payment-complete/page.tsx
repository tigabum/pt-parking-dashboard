"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentCompletePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="h-2 bg-green-500 w-full" />
        <CardContent className="flex flex-col items-center pt-10 pb-10 gap-6">
          <div className="rounded-full bg-green-100 p-4 animate-bounce">
            <CheckCircle className="w-16 h-16 text-green-600" strokeWidth={2.5} />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Payment Completed
            </h1>
            <p className="text-slate-500 text-lg max-w-[280px] mx-auto leading-relaxed">
              Your payment has been successfully processed. Thank you for using our service.
            </p>
          </div>

          <div className="w-full pt-4 space-y-3">
            <Button asChild className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
            
            <p className="text-center text-sm text-slate-400 pt-2">
              Redirecting to dashboard in 5 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-slate-400 text-sm">
        © {new Date().getFullYear()} Gelagle Park. All rights reserved.
      </p>
    </div>
  );
}
