"use client"

import { useAuth } from "@/app/context/auth-context"
import { ServerDown } from "@/components/ui/server-down"
import { Loader2 } from "lucide-react"

export function SystemLivenessWrapper({ children }: { children: React.ReactNode }) {
    const { isServerActive, isCheckingServer } = useAuth()



    // if (!isServerActive) {
    //     return <ServerDown />
    // }

    return <>{children}</>


}
