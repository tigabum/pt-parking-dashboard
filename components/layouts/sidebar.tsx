"use client";

import { useAuth } from "@/app/context/auth-context";
import { UserRole } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  ParkingCircle,
  Calendar,
  Star,
  UserCog,
  KeyRound,
  UserRound,
  Car,
  Settings2,
  Wallet,
  FileText,
  Receipt,
  ChevronDown,
  BarChart2,
  Upload,
  FileOutput,
  FileMinus,
} from "lucide-react";

// ─── Flat navigation items ────────────────────────────────────────────────────
const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
    showInParkingDashboard: true,
  },
  {
    label: "Staff Users",
    href: "/dashboard/users",
    icon: Users,
    permission: PERMISSIONS.USER_VIEW,
    showInParkingDashboard: false,
  },
  {
    label: "Parking Users",
    href: "/dashboard/parking-users",
    icon: UserCog,
    permission: PERMISSIONS.USER_VIEW,
    showInParkingDashboard: true,
  },
  {
    label: "Parkings",
    href: "/dashboard/parkings",
    icon: ParkingCircle,
    permission: PERMISSIONS.PARKING_VIEW,
    showInParkingDashboard: true,
  },
  {
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: Calendar,
    permission: PERMISSIONS.BOOKING_VIEW,
    showInParkingDashboard: true,
  },
  {
    label: "Commission",
    href: "/dashboard/configurations/commissions",
    icon: Star,
    permission: PERMISSIONS.REVENUE_VIEW,
    showInParkingDashboard: false,
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: UserRound,
    permission: PERMISSIONS.CUSTOMER_VIEW,
    showInParkingDashboard: false,
  },
  {
    label: "Vehicles",
    href: "/dashboard/vehicles",
    icon: Car,
    permission: PERMISSIONS.VEHICLE_VIEW,
    showInParkingDashboard: false,
  },
  {
    label: "Wallets",
    href: "/dashboard/wallets",
    icon: Wallet,
    permission: PERMISSIONS.REVENUE_VIEW,
    showInParkingDashboard: false,
  },
  {
    label: "Reset Password",
    href: "/dashboard/forgot-password",
    icon: KeyRound,
    permission: PERMISSIONS.SETTINGS_RESET_PASSWORD,
    showInParkingDashboard: true,
  },
  {
    label: "Configurations",
    href: "/dashboard/configurations",
    icon: Settings2,
    permission: PERMISSIONS.CONFIGURATION_VIEW,
    showInParkingDashboard: false,
  },
  {
    label: "Invoice Credentials",
    href: "/dashboard/invoice-credentials",
    icon: Receipt,
    permission: PERMISSIONS.INVOICE_CREDENTIAL_VIEW,
    showInParkingDashboard: true,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
    showInParkingDashboard: true,
  },
];

// ─── Invoice group (collapsible) ─────────────────────────────────────────────
const invoiceGroup = {
  label: "Invoice",
  icon: FileText,
  permission: PERMISSIONS.INVOICE_VIEW,
  showInParkingDashboard: true,
  children: [
    { label: "Report", href: "/dashboard/invoices", icon: BarChart2 },
    { label: "Upload", href: "/dashboard/invoices/upload", icon: Upload },
    { label: "Receipt", href: "/dashboard/invoices/receipt", icon: FileOutput },
    { label: "Withholding Receipt", href: "/dashboard/invoices/withholding", icon: FileMinus },
  ],
};

interface SidebarProps {
  onItemClick?: () => void;
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const { user, logout, canAccess, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isParkingSuperAdmin = user?.role === UserRole.PARKING_SUPER_ADMIN;
  const isParkingManager = user?.role === UserRole.PARKING_MANAGER;
  const isParkingLevelUser = isParkingSuperAdmin || isParkingManager;

  // Determine if Invoice group is open by default (if currently on any invoice route)
  const isOnInvoicePage = pathname.startsWith("/dashboard/invoices") || pathname.startsWith("/dashboard/invoice");
  const [invoiceOpen, setInvoiceOpen] = useState(isOnInvoicePage);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Filter flat navigation items
  const filteredItems = navigationItems.filter((item) => {
    if (!hasPermission(item.permission)) return false;
    if (isParkingManager) {
      const allowedForManager = [
        "/dashboard",
        "/dashboard/bookings",
        "/dashboard/settings",
      ];
      return allowedForManager.includes(item.href);
    }
    if (isParkingSuperAdmin) return item.showInParkingDashboard === true;
    return true;
  });

  // Whether the Invoice group should show
  const showInvoiceGroup =
    hasPermission(invoiceGroup.permission) &&
    (isParkingManager
      ? false
      : isParkingSuperAdmin
        ? invoiceGroup.showInParkingDashboard
        : true);

  return (
    <div className="w-full md:w-64 border-r border-border bg-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 md:h-20 flex items-center px-4 md:px-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 md:gap-3 group">
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded md:rounded bg-primary text-primary-foreground shadow-sm shadow-primary/25 overflow-hidden">
            <img src="/login-brand.png" alt="Gelagle Park" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-bold text-base md:text-lg tracking-tight text-sidebar-foreground group-hover:text-primary transition-colors block truncate">
              Gelagle Park
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 md:px-4 py-4 md:py-8 space-y-1 md:space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          // Inject Invoice collapsible group before Settings
          const isSettingsItem = item.href === "/dashboard/settings";

          return (
            <div key={item.href}>
              {/* Insert Invoice group before Settings */}
              {isSettingsItem && showInvoiceGroup && (
                <div className="mb-0.5 md:mb-1">
                  {/* Group Header */}
                  <button
                    onClick={() => setInvoiceOpen((o) => !o)}
                    className={cn(
                      "w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded text-sm md:text-base font-medium transition-colors my-0.5 md:my-1",
                      isOnInvoicePage
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    <FileText className="w-5 h-5 md:w-5.5 md:h-5.5 shrink-0" />
                    <span className="flex-1 text-left">Invoice</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        invoiceOpen ? "rotate-180" : "",
                      )}
                    />
                  </button>

                  {/* Sub-items */}
                  {invoiceOpen && (
                    <div className="ml-4 md:ml-6 pl-4 border-l border-slate-200 space-y-0.5 mt-0.5 mb-1">
                      {invoiceGroup.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;
                        return (
                          <button
                            key={child.href}
                            onClick={() => {
                              router.push(child.href);
                              onItemClick?.();
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors",
                              isChildActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                            )}
                          >
                            <ChildIcon className="w-4 h-4 shrink-0" />
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Regular flat item */}
              <Link href={item.href}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.label === "Parkings" && isParkingLevelUser && user?.orgId) {
                      router.push(`/dashboard/parkings/${user.orgId}`);
                    } else {
                      router.push(item.href);
                    }
                    onItemClick?.();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded text-sm md:text-base font-medium transition-colors my-0.5 md:my-1",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:pl-5 md:hover:pl-7",
                  )}
                >
                  <Icon className="w-5 h-5 md:w-5.5 md:h-5.5" />
                  {item.label}
                </button>
              </Link>
            </div>
          );
        })}

        {/* Fallback: show Invoice group even if Settings is not in the list */}
        {showInvoiceGroup && !filteredItems.some((i) => i.href === "/dashboard/settings") && (
          <div className="mb-0.5 md:mb-1">
            <button
              onClick={() => setInvoiceOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded text-sm md:text-base font-medium transition-colors my-0.5 md:my-1",
                isOnInvoicePage
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">Invoice</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", invoiceOpen ? "rotate-180" : "")} />
            </button>
            {invoiceOpen && (
              <div className="ml-4 md:ml-6 pl-4 border-l border-slate-200 space-y-0.5 mt-0.5 mb-1">
                {invoiceGroup.children.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActive = pathname === child.href;
                  return (
                    <button
                      key={child.href}
                      onClick={() => { router.push(child.href); onItemClick?.(); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors",
                        isChildActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <ChildIcon className="w-4 h-4 shrink-0" />
                      <span>{child.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
