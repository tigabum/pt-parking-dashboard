"use client";

import { AuthLayout } from "@/components/layouts/auth-layout";
import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/lib/services/auth-service";
import { LoginStep } from "@/components/types";

const demoAccounts = [
  { email: "admin@example.com", password: "Admin@12345", role: "Super Admin" },
];

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
      router.push("/dashboard");
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
      const credentials = isEmail
        ? { email: identifier.trim().toLowerCase() }
        : { phoneNumber: identifier.trim() };

      const { isPasswordSet, setPasswordToken: token } =
        await authService.preLogin(
          isEmail ? identifier.trim().toLowerCase() : undefined,
          !isEmail ? identifier.trim() : undefined,
        );


      if (isPasswordSet) {
        setStep("password");
      } else {
        setResetToken(token);
        setStep("set-password");
        toast.info("Please set your password to continue.");
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
      const credentials = isEmail
        ? { email: identifier.trim().toLowerCase(), password }
        : { phoneNumber: identifier.trim(), password };

      await login(
        isEmail ? identifier.trim().toLowerCase() : undefined,
        password,
        !isEmail ? identifier.trim() : undefined,
      );

      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (err: any) {
      const errorMessage = err?.message || "Login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (!resetToken) {
        console.error("Missing reset token in handleSetPasswordSubmit");
        throw new Error("Missing reset token");
      }
      console.log(
        "Setting password with token:",
        resetToken.substring(0, 20) + "...",
      );

      // Use the returned user data directly for login
      const { user } = await authService.setPassword(resetToken, password);

      toast.success("Password set successfully! Logging in...");

      // Immediate login with data
      if (typeof loginWithData === "function") {
        loginWithData(user);
      } else {
        // Fallback if context not updated yet (hot reload lag)
        const isEmail = identifier.includes("@");
        const loginEmail = isEmail ? identifier.trim().toLowerCase() : "";
        const loginPhone = !isEmail ? identifier.trim() : undefined;
        await login(loginEmail, password, loginPhone);
      }

      router.push("/dashboard");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to set password.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center mb-8">
        {/* Mobile Logo */}
        {/* <div className="w-16 h-16 rounded-full overflow-hidden mb-4 lg:hidden border-2 border-primary">
          <img
            src="/login-brand.png"
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div> */}

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
              onClick={() => setStep("identifier")}
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
              onClick={() => setStep("identifier")}
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
