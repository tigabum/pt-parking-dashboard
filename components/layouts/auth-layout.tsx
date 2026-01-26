import type React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function AuthLayout({
  children,
  showBranding = true,
}: {
  children: React.ReactNode;
  showBranding?: boolean;
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Branding */}
      {showBranding && (
        <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden">
          <Image
            src="/login-brand.png"
            alt="CarPark Branding"
            className="absolute inset-0 w-full h-full object-cover"
            width={5000}
            height={5000}
            priority
          />
        </div>
      )}

      {/* Right Panel - Content */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center bg-background p-8",
          !showBranding && "w-full"
        )}
      >
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>
    </div>
  );
}
