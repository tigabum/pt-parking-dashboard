import type React from "react";
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gelagle Park",
  description: "Professional parking management system",
  generator: "gelagle.app",
  manifest: "/manifest.json", // Add manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gelagle Park",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F3CC2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { ClientProviders } from "@/components/providers/client-providers";
import { PWARegistration } from "@/components/pwa-registration"; // Import

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} font-sans antialiased text-foreground bg-background`}
      >
        <PWARegistration /> {/* Register SW */}
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
