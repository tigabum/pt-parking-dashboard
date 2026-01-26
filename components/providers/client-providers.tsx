"use client";

import { AuthProvider } from "@/app/context/auth-context";
import { SystemLivenessWrapper } from "@/components/auth/system-liveness-wrapper";
import { Toaster } from "sonner";
import NextProgress from "../next-progress";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SystemLivenessWrapper>
        <Toaster position="top-right" />
        <NextProgress />
        {children}
      </SystemLivenessWrapper>
    </AuthProvider>
  );
}
