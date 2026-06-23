"use client";

import { AuthLayout } from "@/components/layouts/auth-layout";
import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { authService } from "@/lib/services/auth-service";
import { LoginStep } from "@/components/types";

const RESET_TOKEN_KEY = "pendingSetPasswordResetToken";

export function LoginForm() {
  const [step, setStep] = useState<LoginStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithData, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setErrors({ identifier: "Email or Phone is required" });
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Determine if identifier is email or phone
      const isEmail = identifier.includes("@");

      const { nextStep, token } = await authService.preLogin(
        isEmail ? identifier.trim().toLowerCase() : undefined,
        !isEmail ? identifier.trim() : undefined,
      );

      setPassword("");
      setConfirmPassword("");
      if (nextStep === "password") {
        sessionStorage.removeItem(RESET_TOKEN_KEY);
        setStep("password");
      } else {
        setResetToken(token);
        sessionStorage.setItem(RESET_TOKEN_KEY, token);
        setStep("set-password");
      }
    } catch (err: any) {
      const errorMessage = err?.message || "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isEmail = identifier.includes("@");
      await login(
        isEmail ? identifier.trim().toLowerCase() : undefined,
        password,
        !isEmail ? identifier.trim() : undefined,
      );
      // Redirect immediately — no need to wait for useEffect
      router.replace("/dashboard");
    } catch (err: any) {
      const errorMessage = err?.message || "Login failed. Please try again.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const getSetPasswordResetToken = async () => {
    const existingToken = resetToken || sessionStorage.getItem(RESET_TOKEN_KEY);
    if (existingToken) return existingToken;

    if (!identifier.trim()) {
      throw new Error("Please enter your email or phone number again.");
    }

    const isEmail = identifier.includes("@");
    const { nextStep, token } = await authService.preLogin(
      isEmail ? identifier.trim().toLowerCase() : undefined,
      !isEmail ? identifier.trim() : undefined,
    );

    if (nextStep !== "set-password" || !token) {
      throw new Error("Your account already has a password. Please sign in.");
    }

    setResetToken(token);
    sessionStorage.setItem(RESET_TOKEN_KEY, token);
    return token;
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      setError("Password must contain uppercase, lowercase, number, and special character");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = await getSetPasswordResetToken();

      const { user: userData } = await authService.setPassword(token, password);

      sessionStorage.removeItem(RESET_TOKEN_KEY);
      loginWithData(userData);
      // Redirect immediately — no need to wait for useEffect
      router.replace("/dashboard");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to set password.";
      setError(errorMessage);
      setLoading(false);
    }
  };
  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center mb-8">
        {/* Desktop Form Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded overflow-hidden border-2 border-primary/20 shadow-lg">
            <img
              src="/login-brand.png"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground">
          {step === "identifier" && "Welcome Back"}
          {step === "password" && "Enter Password"}
          {step === "set-password" && "Set Password"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {step === "identifier" && "Sign in using your phone or email"}
          {step === "password" && `Welcome back! Please enter your password.`}
          {step === "set-password" &&
            "Choose a strong password for your new account."}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm mb-6">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* STEP 0: IDENTIFIER (Email or Phone) */}
      {step === "identifier" && (
        <form onSubmit={handleIdentifierSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-left text-foreground pl-4 mb-1 block uppercase tracking-wider opacity-90">
              Email
            </label>
            <Input
              type="text"
              placeholder="Enter Email"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) setErrors({ ...errors, identifier: "" });
              }}
              disabled={loading}
              className={`h-12 bg-muted/20 border-input ${errors.identifier ? "border-red-500 bg-red-50" : ""}`}
              autoFocus
              required
            />
            {errors.identifier && (
              <p className="text-xs text-red-500 font-medium pl-2">
                {errors.identifier}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-12 text-base font-bold bg-primary text-white transition-all rounded opacity-100"
            disabled={loading || !identifier}
          >
            {loading ? "Checking..." : "Continue"}
          </Button>
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      )}

      {/* STEP 1: PASSWORD */}
      {step === "password" && (
        <form onSubmit={handleLoginSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-left text-foreground pl-4 mb-1 block uppercase tracking-wider opacity-90">
                Password
              </label>
            </div>
            <Input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: "" });
              }}
              disabled={loading}
              className={`h-12 bg-muted/20 border-input ${errors.password ? "border-red-500 bg-red-50" : ""}`}
              autoFocus
              required
            />
            {errors.password && (
              <p className="text-xs text-red-500 font-medium pl-2">
                {errors.password}
              </p>
            )}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-primary text-white transition-all rounded opacity-100 disabled:bg-primary/60"
              disabled={loading || !password}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={() => {
                sessionStorage.removeItem(RESET_TOKEN_KEY);
                setResetToken(undefined);
                setStep("identifier");
              }}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Use different account
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: SET PASSWORD */}
      {step === "set-password" && (
        <form onSubmit={handleSetPasswordSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-left text-foreground pl-4 mb-1 block uppercase tracking-wider opacity-90">
              New Password
            </label>
            <Input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12 bg-muted/20 border-input"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-left text-foreground pl-4 mb-1 block uppercase tracking-wider opacity-90">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Enter Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="h-12 bg-muted/20 border-input"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-primary text-white transition-all rounded opacity-100 disabled:bg-primary/60"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? "Setting Password..." : "Set Password & Login"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={() => {
                sessionStorage.removeItem(RESET_TOKEN_KEY);
                setResetToken(undefined);
                setStep("identifier");
              }}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
