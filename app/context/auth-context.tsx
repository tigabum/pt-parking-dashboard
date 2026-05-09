"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { type User, type UserRole, validateCredentials } from "@/lib/auth"
import { API_CONFIG, API_ENDPOINTS } from "@/lib/api-config"
import apiClient from "@/lib/api-client"

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
// Must match SESSION_TTL in backend .env (3600 seconds = 1 hour)
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000  // 1 hour – matches Redis SESSION_TTL
const HEARTBEAT_INTERVAL_MS = 90 * 1000       // Touch session every 90 s (well within 5-min window)
const TOUCH_THROTTLE_MS = 2 * 60 * 1000       // Throttle activity-triggered Redis touch to once per 2 min
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
  const lastTouchRef = useRef<number>(0)  // Tracks last Redis touch to throttle activity-triggered touches

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
      // Heartbeat touch
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.SESSION_TOUCH,
        {}
      )

      const data = response.data
      if (data?.success && data?.data) {
        if (data.data.tokenRotated && data.data.accessToken) {
          // New token rotated from interceptor or proactive refresh
          localStorage.setItem("accessToken", data.data.accessToken)
          if (data.data.refreshToken) {
            localStorage.setItem("refreshToken", data.data.refreshToken)
          }
        }
      }
    } catch (err: any) {
      // apiClient handles 401s globally (refreshes if possible, then logs out)
    }
  }, [])

  // ── Reset inactivity timer ────────────────────────────────────────────────
  // NOTE: We must NOT call logout() inside a stale setTimeout closure;
  // instead we clean up directly and redirect – logout() will be called
  // by the redirect (page unmount) or we do an explicit cleanup here.
  const resetInactivityTimer = useCallback(() => {
    if (!userRef.current) return

    lastActivityRef.current = Date.now()

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(() => {
      // Clear timers before any async work
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
      // Clear local storage directly (avoids stale closure issues with setUser)
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        // Redirect to login – AuthProvider will re-hydrate with no user
        window.location.href = "/"
      }
    }, INACTIVITY_TIMEOUT_MS)
  }, [])

  // ── Start heartbeat ───────────────────────────────────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
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
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
  }, [])

  // ── handleActivity: stable reference needed for add/remove listener symmetry
  // Also throttles a Redis session touch to once every 2 minutes on activity.
  const handleActivity = useCallback(() => {
    resetInactivityTimer()
    // Throttled touch: keeps Redis TTL alive on user activity without spamming
    const now = Date.now()
    if (now - lastTouchRef.current > TOUCH_THROTTLE_MS) {
      lastTouchRef.current = now
      touchSession()
    }
  }, [resetInactivityTimer, touchSession])

  // ── Set up activity listeners when user is logged in ─────────────────────
  useEffect(() => {
    if (!user) {
      stopHeartbeat()
      ACTIVITY_EVENTS.forEach((e) => {
        if (typeof handleActivity === "function") {
          window.removeEventListener(e, handleActivity)
        }
      })
      return
    }

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
      const validatedUser = await validateCredentials(email, password, phoneNumber)
      if (validatedUser) {
        setUser(validatedUser)
        localStorage.setItem("user", JSON.stringify(validatedUser))
      }
    } catch (error: any) {
      throw error
    }
  }

  const loginWithData = (userData: User) => {
    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    stopHeartbeat()
    try {
      const { authService } = require("@/lib/services/auth-service")
      await authService.logout()
    } catch (e) {
      // Quiet fail
    }
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  }

  // ── Role / Permission helpers ─────────────────────────────────────────────
  const canAccess = (requiredRoles: UserRole[]) => {
    if (!user) return false
    return requiredRoles.includes(user.role)
  }

  const hasPermission = (permission: string) => {
    if (!user) return false

    if (user.role === "SYSTEM-SUPER-ADMIN" || user.role === "SYSTEM-ADMIN" || user.role === "OWNER") {
      return true
    }

    if (user.role === "ATTENDANT") {
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
