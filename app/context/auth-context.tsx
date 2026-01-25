"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type User, type UserRole, validateCredentials } from "@/lib/auth"
import { API_CONFIG } from "@/lib/api-config"

interface AuthContextType {
  user: User | null
  loading: boolean
  isServerActive: boolean
  isCheckingServer: boolean
  login: (email?: string, password?: string, phoneNumber?: string) => Promise<void>
  loginWithData: (user: User) => void
  logout: () => void
  canAccess: (requiredRoles: UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isServerActive, setIsServerActive] = useState(true)
  const [isCheckingServer, setIsCheckingServer] = useState(true)

  const checkServer = async () => {
    try {
      setIsCheckingServer(true)
      // Attempt to reach the backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      await fetch(`${API_CONFIG.BASE_URL}/auth/user/pre-login?email=ping_test`, {
        method: 'POST', // Try POST as GET might be rejected by some proxies/nest method guards
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ping_test' }),
        signal: controller.signal
      }).then(res => {
        // We don't care about the 404/400/401 here, just that we got a response
        return res;
      }).catch(err => {
        // If it's a network error, it will throw. We catch it here.
        throw err;
      });

      clearTimeout(timeoutId);
      setIsServerActive(true)
    } catch (error) {
      // console.warn("Backend connection check failed (silent):", error) 
      // Don't log error to avoid user confusion
      setIsServerActive(false)
    } finally {
      setIsCheckingServer(false)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check server status first
      await checkServer()

      // 2. Load stored user
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (error) {
          localStorage.removeItem("user")
        }
      }
      setLoading(false)
    }

    initAuth()

  }, [])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          console.warn("User inactive for 10 minutes. Logging out.");
          logout();
          window.location.href = "/";
        }, 10 * 60 * 1000); // 10 minutes
      }
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const handleActivity = () => resetTimer();

    if (user) {
      events.forEach((event) => window.addEventListener(event, handleActivity));
      resetTimer();
    }

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  const login = async (email?: string, password: string = "", phoneNumber?: string) => {
    try {
      const validatedUser = await validateCredentials(email, password, phoneNumber)
      if (validatedUser) {
        setUser(validatedUser)
        localStorage.setItem("user", JSON.stringify(validatedUser))
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Login failed";
      console.error("Login context error:", errorMessage, error);
      throw error;
    }
  }

  const loginWithData = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  }


  const logout = () => {
    const { authService } = require('@/lib/services/auth-service')
    authService.logout()
    setUser(null)
    localStorage.removeItem("user")
  }

  const canAccess = (requiredRoles: UserRole[]) => {
    if (!user) return false
    return requiredRoles.includes(user.role)
  }

  const hasPermission = (permission: string) => {
    if (!user) return false;

    // Super Admins have all permissions implicitly
    if (user.role === "SYSTEM-SUPER-ADMIN" || user.role === "PARKING-SUPER-ADMIN") {
      return true;
    }

    // Explicitly allow core items for Parking Managers even if permissions array is missing
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
        "SETTINGS_CHANGE_PASSWORD"
      ];
      if (basicPermissions.includes(permission)) return true;
    }

    // Check specific permissions array from backend
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes(permission);
    }

    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isServerActive,
      isCheckingServer,
      login,
      loginWithData,
      logout,
      canAccess,
      hasPermission
    }}>
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
