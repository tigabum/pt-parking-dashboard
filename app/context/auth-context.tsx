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
        method: 'GET',
        signal: controller.signal
      }).catch(err => {
        // If it's just a 4xx/5xx it means server is up
        // If it's a network error (failed to fetch), it's down
        if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
          throw err;
        }
      });

      clearTimeout(timeoutId);
      setIsServerActive(true)
    } catch (error) {
      console.error("Backend server is unreachable:", error)
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

  // Inactivity Timer (30 minutes)
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          // Auto logout
          logout();
          // Optional: Show toast before redirecting?
          if (typeof window !== 'undefined') {
            window.location.href = "/";
          }
        }, INACTIVITY_TIMEOUT);
      }
    };

    const handleUserActivity = () => {
      resetTimer();
    };

    if (user) {
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('mousedown', handleUserActivity);
      window.addEventListener('keypress', handleUserActivity);
      window.addEventListener('scroll', handleUserActivity);
      window.addEventListener('touchmove', handleUserActivity); // changed touchstart to touchmove/click usually better but safe enough

      resetTimer();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchmove', handleUserActivity);
    };
  }, [user]); // Re-run when user changes

  const login = async (email?: string, password: string = "", phoneNumber?: string) => {
    try {
      const validatedUser = await validateCredentials(email, password, phoneNumber)
      if (validatedUser) {
        setUser(validatedUser)
        localStorage.setItem("user", JSON.stringify(validatedUser))
      }
    } catch (error: any) {
      console.error("Login context error:", error);
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

    // Check specific permissions array
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
