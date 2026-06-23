"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { authService } from "@/lib/services/auth-service";

const RESET_TOKEN_KEY = "pendingPasswordResetToken";

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState<string | undefined>();
  const [deliveryChannel, setDeliveryChannel] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"request" | "confirm" | "success">("request");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePassword = () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
      setError("Password must contain uppercase, lowercase, number, and special character");
      return false;
    }
    return true;
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrors({ identifier: "Email or phone is required" });
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await authService.requestPasswordReset(identifier);
      setResetToken(result.resetToken);
      sessionStorage.setItem(RESET_TOKEN_KEY, result.resetToken);
      setDeliveryChannel(result.deliveryChannel);
      setStep("confirm");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to send reset OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = resetToken || sessionStorage.getItem(RESET_TOKEN_KEY) || undefined;
    if (!token) {
      setError("Missing reset token. Please request a new OTP.");
      return;
    }
    if (!otpCode.trim()) {
      setErrors({ otpCode: "OTP code is required" });
      return;
    }
    if (!validatePassword()) return;

    setError("");
    setLoading(true);
    try {
      const response = await authService.confirmPasswordReset(
        token,
        otpCode.trim(),
        newPassword
      );
      if (!response.success) {
        throw new Error(response.message || "Failed to reset password");
      }
      sessionStorage.removeItem(RESET_TOKEN_KEY);
      setStep("success");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showBranding={false}>
      <div className="flex flex-col items-center text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Reset Password</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {step === "request" && "Enter your email or phone to receive an OTP"}
          {step === "confirm" && "Enter the OTP and choose a new password"}
          {step === "success" && "Your password has been updated"}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm mb-6">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {step === "success" ? (
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2">Password reset successful</h3>
            <p className="text-muted-foreground text-sm">
              You can now sign in with your new password.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      ) : step === "request" ? (
        <form onSubmit={handleRequestSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="identifier"
              className="text-sm font-semibold text-foreground"
            >
              Email or Phone
            </label>
            <Input
              id="identifier"
              type="text"
              placeholder="Enter email or phone"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) setErrors({ ...errors, identifier: "" });
              }}
              disabled={loading}
              className={`h-12 bg-muted/30 border-input/50 ${errors.identifier ? "border-red-500 bg-red-50" : ""}`}
              required
            />
            {errors.identifier && (
              <p className="text-xs text-red-500 font-medium mt-1">
                {errors.identifier}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-primary text-white transition-all rounded shadow-none border-none"
            disabled={loading}
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </Button>

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          <div className="rounded-md bg-primary/5 border border-primary/10 p-3 text-sm text-muted-foreground">
            OTP sent by {deliveryChannel || "SMS"}.
          </div>

          <div className="space-y-2">
            <label htmlFor="otpCode" className="text-sm font-semibold text-foreground">
              OTP Code
            </label>
            <Input
              id="otpCode"
              type="text"
              inputMode="numeric"
              placeholder="Enter OTP"
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value);
                if (errors.otpCode) setErrors({ ...errors, otpCode: "" });
              }}
              disabled={loading}
              className={`h-12 bg-muted/30 border-input/50 ${errors.otpCode ? "border-red-500 bg-red-50" : ""}`}
              required
            />
            {errors.otpCode && (
              <p className="text-xs text-red-500 font-medium mt-1">
                {errors.otpCode}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-semibold text-foreground">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="h-12 bg-muted/30 border-input/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="h-12 bg-muted/30 border-input/50"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-primary text-white transition-all rounded shadow-none border-none"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => {
              sessionStorage.removeItem(RESET_TOKEN_KEY);
              setResetToken(undefined);
              setStep("request");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Use different account
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
