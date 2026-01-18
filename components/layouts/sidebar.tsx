"use client";

import { useAuth } from "@/app/context/auth-context";
import { UserRole } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
    showInParkingDashboard: false, // Hide dashboard for parking users
  },
  {
    label: "Staff Users",
    href: "/dashboard/users",
    icon: Users,
    permission: PERMISSIONS.USER_VIEW,
    showInParkingDashboard: false, // Only for system admins
  },
  {
    label: "Parking Users",
    href: "/dashboard/parking-users",
    icon: UserCog,
    permission: PERMISSIONS.USER_VIEW,
    showInParkingDashboard: true, // Parking staff can manage their team
  },
  {
    label: "Parkings",
    href: "/dashboard/parkings",
    icon: ParkingCircle,
    permission: PERMISSIONS.PARKING_VIEW,
    showInParkingDashboard: false, // Parking staff assigned to specific parking
  },
  {
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: Calendar,
    permission: PERMISSIONS.BOOKING_VIEW,
    showInParkingDashboard: true, // Core feature for parking dashboard
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: UserRound,
    permission: PERMISSIONS.CUSTOMER_VIEW,
    showInParkingDashboard: false, // View through bookings
  },
  {
    label: "Vehicles",
    href: "/dashboard/vehicles",
    icon: Car,
    permission: PERMISSIONS.VEHICLE_VIEW,
    showInParkingDashboard: false, // View through bookings
  },
  {
    label: "Wallets",
    href: "/dashboard/wallets",
    icon: Wallet,
    permission: PERMISSIONS.REVENUE_VIEW,
    showInParkingDashboard: false, // Only for system admins
  },
  {
    label: "Password Reset",
    href: "/dashboard/forgot-password",
    icon: KeyRound,
    permission: PERMISSIONS.SETTINGS_RESET_PASSWORD,
    showInParkingDashboard: false, // Only for system admins
  },
  {
    label: "Configurations",
    href: "/dashboard/configurations",
    icon: Settings2,
    permission: PERMISSIONS.CONFIGURATION_VIEW,
    showInParkingDashboard: false, // Only for system admins
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
    showInParkingDashboard: true, // Everyone needs settings
  },
];

interface SidebarProps {
  onItemClick?: () => void;
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const { user, logout, canAccess, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Determine if user is a parking dashboard user
  const isParkingUser = user?.role === UserRole.PARKING_SUPER_ADMIN || user?.role === UserRole.PARKING_MANAGER;

  // Filter navigation items based on role and permissions
  const filteredItems = navigationItems.filter((item) => {
    // Check permission first
    if (!hasPermission(item.permission)) {
      return false;
    }

    // For parking users, only show items marked as showInParkingDashboard
    if (isParkingUser) {
      return item.showInParkingDashboard === true;
    }

    // System users see all items they have permission for
    return true;
  });

  return (
    <div className="w-full md:w-64 border-r border-border bg-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 md:h-20 flex items-center px-4 md:px-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 md:gap-3 group">
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 overflow-hidden flex-shrink-0">
            <img
              src="/login-brand.png"
              alt="Gelagle Park"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="font-bold text-base md:text-lg tracking-tight text-sidebar-foreground group-hover:text-primary transition-colors block truncate">
              Gelagle Park
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 md:px-4 py-4 md:py-8 space-y-1 md:space-y-2 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                onItemClick?.();
              }}
              className={cn(
                "w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded-lg text-sm md:text-base font-medium transition-colors my-0.5 md:my-1",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:pl-5 md:hover:pl-7"
              )}
            >
              <Icon className="w-5 h-5 md:w-[22px] md:h-[22px]" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
