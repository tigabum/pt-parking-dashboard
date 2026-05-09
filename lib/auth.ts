export enum UserStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}
export enum UserRole {
  SYSTEM_SUPER_ADMIN = "SYSTEM-SUPER-ADMIN",
  SYSTEM_ADMIN = "SYSTEM-ADMIN",
  OWNER = "OWNER",
  ATTENDANT = "ATTENDANT",
  CUSTOMER = "CUSTOMER",
}

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  plateNumber: string;
}

export interface User {
  id: string;
  userCode?: string;
  email: string;
  fullName?: string;
  role: UserRole;
  phoneNumber?: string;
  password?: string;
  isPasswordSet?: boolean;
  address?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  status?: UserStatus;
  profileImage?: string;
  orgId?: string;
  isVatIncluded?: boolean;
  permissions?: string[];
  createdAt: string | Date;
  updatedAt?: string | Date;
  vehicles?: Vehicle[];
  parking?: {
    id: string;
    name: string;
    agentType: string;
  };
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isServerActive: boolean;
  isCheckingServer: boolean;
  login: (
    email: string,
    password: string,
    phoneNumber?: string
  ) => Promise<void>;
  loginWithData: (user: User) => void;
  logout: () => void;
  canAccess: (requiredRoles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

export async function validateCredentials(
  email?: string,
  password?: string,
  phoneNumber?: string
): Promise<User> {
  const { authService } = await import("./services/auth-service");
  const { user } = await authService.login({ email, password: password || "", phoneNumber });
  return user;
}

export const rolePermissions: Record<UserRole, string[]> = {
  "SYSTEM-SUPER-ADMIN": [
    "dashboard",
    "staff_management",
    "platform_users",
    "parking_owners",
    "parking_spaces",
    "booking_logs",
    "revenue",
    "settings",
  ],
  "SYSTEM-ADMIN": [
    "dashboard",
    "staff_management",
    "platform_users",
    "parking_owners",
    "parking_spaces",
    "booking_logs",
    "revenue",
    "settings",
  ],
  "OWNER": ["dashboard", "parking_spaces", "booking_logs"],
  "ATTENDANT": [
    "dashboard",
    "parking_spaces",
    "booking_logs",
    "staff_management",
    "pricing",
    "reviews",
    "my_stats",
  ],
  "CUSTOMER": ["dashboard", "parking_spaces", "booking_logs"],
};
