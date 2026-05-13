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
  UserRound,
  Car,
  Settings2,
  Wallet,
  FileText,
  CreditCard,
  Receipt,
  ChevronDown,
  BarChart2,
  Upload,
  FileOutput,
  FileMinus,
  User,
  Lock,
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
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: Calendar,
    permission: PERMISSIONS.BOOKING_VIEW,
    showInParkingDashboard: true,
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
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
    permission: PERMISSIONS.USER_VIEW,
    showInParkingDashboard: false,
  },
  {
    label: "Parking Users",
    href: "/dashboard/parking-users",
    icon: Users,
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
    label: "Wallets",
    href: "/dashboard/wallets",
    icon: Wallet,
    permission: PERMISSIONS.REVENUE_VIEW,
    showInParkingDashboard: true,
  },
  {
    label: "Commissions",
    href: "/dashboard/commissions",
    icon: FileText,
    permission: PERMISSIONS.REVENUE_VIEW,
    showInParkingDashboard: false,
  },
];

// ─── Settings group (collapsible) ─────────────────────────────────────────────
const settingsGroup = {
  label: "Settings",
  icon: Settings,
  permission: PERMISSIONS.SETTINGS_VIEW,
  showInParkingDashboard: true,
  children: [
    { label: "Profile", href: "/dashboard/settings", icon: User },
    { label: "Reset Password", href: "/dashboard/settings", icon: Lock },
  ],
};

// ─── Configuration group (collapsible) ─────────────────────────────────────────────
const configurationsGroup = {
  label: "Configurations",
  icon: Settings2,
  permission: PERMISSIONS.CONFIGURATION_VIEW,
  showInParkingDashboard: true,
  children: [
    { label: "Commission Config", href: "/dashboard/configurations", icon: Star },
    { label: "Invoice Config", href: "/dashboard/invoice-credentials", icon: Receipt },
    { label: "Telebirr Config", href: "/dashboard/telebirr-config", icon: CreditCard },
  ],
};

// ─── Invoice group (collapsible) ─────────────────────────────────────────────
const invoicesGroup = {
  label: "Invoices",
  icon: Receipt,
  permission: PERMISSIONS.INVOICE_VIEW,
  showInParkingDashboard: true,
  children: [
    { label: "Report", href: "/dashboard/invoices", icon: BarChart2 },
    { label: "Upload", href: "/dashboard/invoices/upload", icon: Upload },
    { label: "Receipts", href: "/dashboard/invoices/receipt", icon: FileOutput },
    { label: "Withholding", href: "/dashboard/invoices/withholding", icon: FileMinus },
  ],
};

interface SidebarProps {
  onItemClick?: () => void;
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const { user, logout, canAccess, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isSystemAdmin = user?.role === UserRole.SYSTEM_SUPER_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;
  const isParkingSuperAdmin = user?.role === UserRole.OWNER;
  const isParkingManager = user?.role === UserRole.ATTENDANT;
  const isParkingLevelUser = isParkingSuperAdmin || isParkingManager;

  // Determine if groups are open by default
  const isOnInvoicePage =
    pathname.startsWith("/dashboard/invoices") ||
    pathname.startsWith("/dashboard/invoice-upload") ||
    pathname.startsWith("/dashboard/invoices/receipt") ||
    pathname.startsWith("/dashboard/invoices/withholding");
  const [invoicesOpen, setInvoicesOpen] = useState(isOnInvoicePage);

  const isOnConfigPage =
    pathname.startsWith("/dashboard/configurations") ||
    pathname.startsWith("/dashboard/telebirr-config") ||
    pathname.startsWith("/dashboard/invoice-credentials");
  const [configsOpen, setConfigsOpen] = useState(isOnConfigPage);

  const isOnSettingsPage = pathname.startsWith("/dashboard/settings");
  const [settingsOpen, setSettingsOpen] = useState(isOnSettingsPage);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Filter flat navigation items
  const filteredItems = navigationItems.filter((item) => {
    if (!hasPermission(item.permission)) return false;

    // Logic for Invoice visibility based on VAT (Bypass for System Admins)
    const isInvoiceRelated = item.label.toLowerCase().includes("invoice");
    if (isInvoiceRelated && !isSystemAdmin && isParkingLevelUser && user?.needInvoice !== true) {
      return false;
    }

    if (isParkingManager) {
      const allowedForManager = [
        "/dashboard",
        "/dashboard/bookings",
        "/dashboard/settings",
      ];
      return allowedForManager.includes(item.href);
    }
    if (isParkingSuperAdmin) {
      if (item.label === "Wallets") return true;
      return item.showInParkingDashboard === true;
    }

    // Restrict Commissions to SYSTEM_SUPER_ADMIN only
    if (item.label === "Commissions" && user?.role !== UserRole.SYSTEM_SUPER_ADMIN) {
      return false;
    }

    return true;
  });

  const showConfigsGroup =
    hasPermission(configurationsGroup.permission) &&
    (isParkingManager
      ? false
      : isParkingSuperAdmin
        ? configurationsGroup.showInParkingDashboard
        : true);

  const showInvoicesGroup =
    hasPermission(invoicesGroup.permission) &&
    (isParkingManager
      ? false
      : isParkingSuperAdmin
        ? (invoicesGroup.showInParkingDashboard && user?.needInvoice === true)
        : true);

  const showSettingsGroup =
    hasPermission(settingsGroup.permission) &&
    (isParkingSuperAdmin
      ? settingsGroup.showInParkingDashboard
      : true);

  const renderGroup = (group: any, isOpen: boolean, setIsOpen: (o: any) => void, active: boolean) => {
    const GroupIcon = group.icon;
    return (
      <div className="mb-0.5 md:mb-1">
        <button
          onClick={() => setIsOpen((o: boolean) => !o)}
          className={cn(
            "w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded text-sm md:text-base font-medium transition-colors my-0.5 md:my-1",
            active
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50",
          )}
        >
          <GroupIcon className="w-5 h-5 md:w-5.5 md:h-5.5 shrink-0" />
          <span className="flex-1 text-left whitespace-nowrap truncate">{group.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen ? "rotate-180" : "",
            )}
          />
        </button>

        {isOpen && (
          <div className="ml-4 md:ml-6 pl-4 border-l border-slate-200 space-y-0.5 mt-0.5 mb-1">
            {group.children.map((child: any) => {
              const ChildIcon = child.icon;
              const isChildActive = pathname === child.href;
              return (
                <button
                  key={child.href + child.label}
                  onClick={() => {
                    router.push(child.href);
                    onItemClick?.();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors",
                    isChildActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-primary hover:bg-primary/5",
                  )}
                >
                  <ChildIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full md:w-72 border-r border-border bg-sidebar flex flex-col h-full shrink-0">
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

          return (
            <div key={item.href}>
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
                  <Icon className="w-5 h-5 md:w-5.5 md:h-5.5 shrink-0" />
                  <span className="flex-1 text-left whitespace-nowrap truncate">{item.label}</span>
                </button>
              </Link>
            </div>
          );
        })}

        {/* Groups */}
        {showInvoicesGroup && renderGroup(invoicesGroup, invoicesOpen, setInvoicesOpen, isOnInvoicePage)}
        {showConfigsGroup && renderGroup(configurationsGroup, configsOpen, setConfigsOpen, isOnConfigPage)}
        {showSettingsGroup && renderGroup(settingsGroup, settingsOpen, setSettingsOpen, isOnSettingsPage)}

      </nav>
    </div>
  );
}
