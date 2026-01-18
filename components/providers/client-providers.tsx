"use client"

import { AuthProvider } from "@/app/context/auth-context"
import { SystemLivenessWrapper } from "@/components/auth/system-liveness-wrapper"
import { Toaster } from "sonner"

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SystemLivenessWrapper>
                {children}
                <Toaster position="top-right" richColors />
            </SystemLivenessWrapper>
        </AuthProvider>
    )
}
