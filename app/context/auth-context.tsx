"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { type User, type UserRole, validateCredentials } from "@/lib/auth"
import { API_CONFIG, API_ENDPOINTS } from "@/lib/api-config"
import axios from "axios"

interface AuthContextType {
  user: User | null
  loading: boolean
  isServerActive: boolean
  isCheckingServer: boolean
  login: (email?: string, password?: string, phoneNumber?: string) => Promise<void>
  loginWithData: (user: User) => void
  logout: () => Promise<void>
  canAccess: (requiredRoles: UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Constants ────────────────────────────────────────────────────────────────
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000  // 5 minutes – must match backend SESSION_TTL
const HEARTBEAT_INTERVAL_MS = 60 * 1000       // Touch session every 60 seconds when active
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

// ─── AuthProvider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isServerActive, setIsServerActive] = useState(true)
  const [isCheckingServer, setIsCheckingServer] = useState(true)

  // Refs so we can safely reference inside closures without stale state
  const userRef = useRef<User | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    userRef.current = user
  }, [user])

  // ── Server health check ──────────────────────────────────────────────────
  const checkServer = async () => {
    try {
      setIsCheckingServer(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch(`${API_CONFIG.BASE_URL}/auth/user/pre-login?email=ping_test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ping_test" }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      setIsServerActive(true)
    } catch {
      setIsServerActive(false)
    } finally {
      setIsCheckingServer(false)
    }
  }

  // ── Touch session (heartbeat) ─────────────────────────────────────────────
  const touchSession = useCallback(async () => {
    if (!userRef.current) return

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (!token) return

    try {
      console.log(
        `[SessionManager] 💓 Heartbeat – calling session/touch for userId=${userRef.current.id}`,
      )
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.SESSION_TOUCH}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      const data = response.data
      if (data?.success && data?.data) {
        if (data.data.tokenRotated && data.data.accessToken) {
          // Backend issued a new token proactively – update localStorage
          localStorage.setItem("accessToken", data.data.accessToken)
          if (data.data.refreshToken) {
            localStorage.setItem("refreshToken", data.data.refreshToken)
          }
          console.log(
            `[SessionManager] 🔄 Proactive token rotation received – new accessToken stored`,
          )
        } else {
          console.log(`[SessionManager] ✅ Session touch OK – inactivity timer reset on server`)
        }
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        console.warn(
          `[SessionManager] ⚠️  Session touch returned 401 – session expired. Logging out.`,
        )
        await logout()
        if (typeof window !== "undefined") window.location.href = "/"
      } else {
        console.warn(`[SessionManager] ⚠️  Session touch failed (non-401):`, err?.message)
      }
    }
  }, [])

  // ── Reset inactivity timer ────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (!userRef.current) return

    lastActivityRef.current = Date.now()

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(async () => {
      console.warn(
        `[SessionManager] ⏰ User inactive for ${INACTIVITY_TIMEOUT_MS / 1000}s – logging out`,
      )
      await logout()
      if (typeof window !== "undefined") window.location.href = "/"
    }, INACTIVITY_TIMEOUT_MS)
  }, [])

  // ── Start heartbeat ───────────────────────────────────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    console.log(
      `[SessionManager] 💓 Heartbeat started (interval=${HEARTBEAT_INTERVAL_MS / 1000}s)`,
    )
    heartbeatTimerRef.current = setInterval(async () => {
      if (!userRef.current) return
      await touchSession()
    }, HEARTBEAT_INTERVAL_MS)
  }, [touchSession])

  // ── Stop heartbeat ────────────────────────────────────────────────────────
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
      console.log(`[SessionManager] 🛑 Heartbeat stopped`)
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
  }, [])

  // ── handleActivity: stable reference needed for add/remove listener symmetry
  const handleActivity = useCallback(() => {
    resetInactivityTimer()
  }, [resetInactivityTimer])

  // ── Set up activity listeners when user is logged in ─────────────────────
  useEffect(() => {
    if (!user) {
      stopHeartbeat()
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, handleActivity),
      )
      return
    }

    console.log(
      `[SessionManager] 🟢 Session management started for userId=${user.id} (inactivity=${INACTIVITY_TIMEOUT_MS / 1000}s)`,
    )
    resetInactivityTimer()
    startHeartbeat()
    // Immediately touch on login
    touchSession()

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, handleActivity),
    )

    return () => {
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, handleActivity),
      )
      stopHeartbeat()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, handleActivity, stopHeartbeat, resetInactivityTimer, startHeartbeat, touchSession])

  // ── Initial auth hydration ────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          setUser(parsed)
          console.log(`[SessionManager] 📦 Restored user from localStorage: userId=${parsed?.id}`)
        } catch {
          localStorage.removeItem("user")
        }
      }
      setLoading(false)
      checkServer()
    }

    initAuth()
  }, [])


  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email?: string, password: string = "", phoneNumber?: string) => {
    try {
      console.log(`[SessionManager] 🔐 Login attempt: email=${email ?? phoneNumber}`)
      const validatedUser = await validateCredentials(email, password, phoneNumber)
      if (validatedUser) {
        setUser(validatedUser)
        localStorage.setItem("user", JSON.stringify(validatedUser))
        console.log(
          `[SessionManager] ✅ Login success: userId=${validatedUser.id} role=${validatedUser.role}`,
        )
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Login failed"
      console.error("[SessionManager] ❌ Login failed:", errorMessage, error)
      throw error
    }
  }

  const loginWithData = (userData: User) => {
    console.log(`[SessionManager] ✅ loginWithData: userId=${userData.id} role=${userData.role}`)
    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    console.log(`[SessionManager] 🚪 Logout initiated for userId=${userRef.current?.id}`)
    stopHeartbeat()
    try {
      const { authService } = require("@/lib/services/auth-service")
      await authService.logout()
    } catch (e) {
      console.warn("[SessionManager] ⚠️  Logout API call failed (ignored):", e)
    }
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    console.log(`[SessionManager] ✅ Logout complete – tokens and user cleared`)
  }

  // ── Role / Permission helpers ─────────────────────────────────────────────
  const canAccess = (requiredRoles: UserRole[]) => {
    if (!user) return false
    return requiredRoles.includes(user.role)
  }

  const hasPermission = (permission: string) => {
    if (!user) return false

    if (user.role === "SYSTEM-SUPER-ADMIN" || user.role === "PARKING-SUPER-ADMIN") {
      return true
    }

    if (user.role === "PARKING-MANAGER") {
      const basicPermissions = [
        "DASHBOARD_VIEW",
        "DASHBOARD_TOTAL_BOOKINGS",
        "DASHBOARD_TOTAL_REVENUE",
        "DASHBOARD_DAILY_STATS",
        "DASHBOARD_MONTHLY_STATS",
        "DASHBOARD_YEARLY_STATS",
        "REVENUE_VIEW",
        "BOOKING_VIEW",
        "SETTINGS_VIEW",
        "SETTINGS_CHANGE_PASSWORD",
      ]
      if (basicPermissions.includes(permission)) return true
    }

    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes(permission)
    }

    return false
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isServerActive,
        isCheckingServer,
        login,
        loginWithData,
        logout,
        canAccess,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
