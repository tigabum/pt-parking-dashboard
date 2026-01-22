declare global {
  interface Window {
    google: any;
  }
}

export enum OTPType {
  FORGOT_PASSWORD_OTP = "FORGOT-PASSWORD-OTP",
  REGISTRATION_OTP = "REGISTRATION-OTP",
}

export enum BookingMethod {
  QR = "QR",
  APP = "MOBILEAPP",
  DASHBOARD = "DASHBOARD",
}

export enum BookingStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  REFUNDED = "REFUNDED",
}

export enum ParkingStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
  INACTIVE = "INACTIVE",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
}

export enum ParkingType {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  COMMERCIAL = "COMMERCIAL",
  RESIDENTIAL = "RESIDENTIAL",
}

export enum PricingModel {
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
  FLAT_RATE = "FLAT_RATE",
}

export enum CommissionType {
  FLAT = "FLAT",
  PERCENTAGE = "PERCENTAGE",
  TIER = "TIER",
}

export enum OTPStatus {
  REQUESTED = "REQUESTED",
  EXPIRED = "EXPIRED",
  USED = "USED",
}

export enum TokenType {
  ACCESS = "ACCESS",
  REFRESH = "REFRESH",
  PASSWORD_RESET = "PASSWORD_RESET",
  REGISTRATION = "REGISTRATION",
  SET_PASSWORD = "SET_PASSWORD",
}

export enum PaymentStatus {
  INITIATED = "INITIATED",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
  INCASH = "INCASH",
  TRANSFER = "TRANSFER",
  TELEBIRR = "TELEBIRR",
}

export enum BookingType {
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
  FLAT_RATE = "FLAT_RATE",
}

export interface Wallet {
  id: string;
  ownerId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialInstitution {
  id: string;
  name: string;
  logo?: string;
  type: "BANK" | "WALLET";
  checkoutUrl?: string; // For digital redirect
}

export enum UserRole {
  SYSTEM_SUPER_ADMIN = "SYSTEM-SUPER-ADMIN",
  SYSTEM_ADMIN = "SYSTEM-ADMIN",
  PARKING_SUPER_ADMIN = "PARKING-SUPER-ADMIN",
  PARKING_MANAGER = "PARKING-MANAGER",
  CUSTOMER = "CUSTOMER",
}

export enum UserStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}

export interface CreateUser {
  id: string;
  fullName: string;
  orgId: string;
  phoneNumber?: string;
  email: string;
  role: UserRole;
  password?: string;
  status: UserStatus;
  profileImage?: string;
  isPasswordSet: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  id: string;
  fullName: string;
  phoneNumber?: string;
  email: string;
  role: UserRole;
  orgId: string;
  password?: string;
  status: UserStatus;
  isPasswordSet: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  permissions?: string[];
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingSuperAdminData {
  name: string;
  phoneNumber: string;
  role: string;
  email: string;
  orgId: string;
}

export interface CreateParking {
  name: string;
  lat?: number;
  lng?: number;
  numberOfSpots: number;
  availableSpots: number;
  description?: string;

  // Location
  country?: string;
  city?: string;
  region?: string;
  subCity?: string
  woreda?: string;
  kebele?: string;
  streetName?: string;

  // Basic Info
  parkingCode?: string;
  parkingType?: ParkingType;
  licenseNumber?: string;
  status?: ParkingStatus;

  // Assets
  featureImage?: File | string | null;
  galleryImages?: (File | string)[];
  licenseFiles?: (File | string)[];
  amenities?: { name: string; value?: string }[];
  amenityIds?: string[];

  // Business
  commissionConfigId?: string;
  isVatIncluded: boolean;
  isIndoor?: boolean;
  pricing: Pricing;
}

export interface Pricing {
  hourly?: {
    price: number;
    discount: number;
    currency: string;
  };
  daily?: {
    price: number;
    discount: number;
    currency: string;
  };
  monthly?: {
    price: number;
    discount: number;
    currency: string;
  };
  flat?: {
    price: number;
    discount: number;
    currency: string;
  };
}

export type Parking = ParkingResponse;

export interface ParkingResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  lat?: number;
  lng?: number;
  numberOfSpots: number;
  availableSpots: number;
  averageRating?: number | null;
  ratingsCount: number;

  featureImage?: string;
  galleryImages?: string[];
  description?: string;
  amenities: { name: string; value?: string }[];
  amenitiesList?: { id: string; name: string; icon?: string }[];
  createdBy?: UserResponse;
  approvedBy?: UserResponse;
  vatRegistrationNumber?: string;
  agreementDocuments?: string[];
  bookings?: BookingResponse[];
  commissionConfig?: Commission;
  status: ParkingStatus;
  // All new fields added to response
  parkingCode?: string;
  parkingType?: ParkingType;
  licenseNumber?: string;
  country?: string;
  region?: string;
  city?: string;
  subCity?: string;
  woreda?: string;
  kebele?: string;
  streetName?: string;
  tinNumber?: string;
  commission?: number;
  isVatIncluded?: boolean;
  isIndoor: boolean;
  licenseFiles?: string[];
  pricing?: Pricing;
  wallet?: Wallet;
}

export interface CreateBooking {
  parkingId: string;
  customerPhone: string;
  phoneNumber?: string; // Alias for compatibility
  plateNumber: string;
  customerName?: string;
  vehicleName?: string;
  vehicleBrand?: string; // Legacy
  vehicleModel?: string;
  startTime: string;
  endTime?: string;
  type: BookingType;
  bookingType?: BookingType; // Backend compatibility
  bookingMethod: BookingMethod;
  paymentMethod?: string | PaymentMethod;
  paymentType?: string;
  commission?: number;
  isVatIncluded?: boolean;
  status?: BookingStatus;
  userId?: string;
  referenceNo?: string;
  totalAmount?: number | string;
}

export interface BookingResponse {
  id: string;
  createdAt: string;
  updatedAt: string;

  parkingId: string;
  customerName: string;
  customerPhone: string;
  plateNumber: string;
  vehicleName?: string;
  vehicleBrand?: string;
  vehicleModel?: string | null;

  startTime: string;
  endTime?: string | null;

  bookingMethod: BookingMethod;
  paymentMethod?: string;
  status: BookingStatus;
  type: BookingType;
  bookingType?: BookingType; // Backend compatibility

  totalAmount: string;
  referenceNo: string;
  commission?: number | null;
  isVatIncluded?: boolean;
  commissionAmount?: number | null;
  vatAmount?: number | null;
  totalDurationMinutes?: number;
  parking?: {
    name: string;
    amenities?: string[];
  };
  createdBy?: UserResponse | null;
  confirmedBy?: UserResponse | null;
  updatedBy?: UserResponse | null;
}

export interface Review {
  id: string;
  spaceId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data?: T[]; // Legacy field for backward compatibility
  users?: T[]; // New field from updated API
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  previousPage?: number | null;
  nextPage?: number | null;
}

// --- Combined Interfaces from Components and Services ---

export interface ParkingUserFormData {
  orgId: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  profileImage?: File | null;
}

export interface ParkingUserFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  initialData?: any; // Generic User from lib/auth
  isLoading?: boolean;
}

export interface ParkingFormProps {
  initialData?: any;
  onSave: (data: any) => Promise<void> | void;
  onOpenChange: (v: boolean) => void;
  isLoading?: boolean;
}

export interface UserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  orgId?: string;
  status?: string;
  isStaffUser?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface ParkingSpace {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  numberOfSpots: number;
  description?: string;
  amenities?: string[];
  featureImage?: string;
  galleryImages?: string[];
  status: string;
  isVatIncluded?: boolean;
  commission?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingFilterParams {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: "hourly" | "monthly" | "numberOfSpots" | "createdAt";
  sortOrder?: "ASC" | "DESC";
  minPrice?: number;
  maxPrice?: number;
  commission?: number;
  isVatIncluded?: boolean;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  referenceNo?: string;
  parkingId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  plateNumber?: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleBrand?: string;
  vehicleModel?: string | null;
  startTime: string;
  endTime: string | null;
  status: string;
  type?: string;
  bookingType?: string;
  totalAmount: number | string;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentType?: string;
  bookingMethod?: string;
  commission?: number | null;
  isVatIncluded?: boolean;
  commissionAmount?: number | null;
  vatAmount?: number | null;
  totalDurationMinutes?: number;
  parking?: {
    name: string;
    amenities?: string[];
  };
  createdBy?: UserResponse | null;
  confirmedBy?: UserResponse | null;
  updatedBy?: UserResponse | null;
  customer?: {
    fullName: string;
    phoneNumber: string;
  };
  vehicle?: {
    plateNumber: string;
    brand: string;
    model?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilterParams {
  page?: number;
  limit?: number;
  q?: string;
  parkingId?: string;
  orgId?: string;
  managerUserId?: string;
  plateNumber?: string;
  customerPhone?: string;
  status?: string;
  type?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: "createdAt" | "startTime" | "endTime" | "totalAmount";
  sortOrder?: "ASC" | "DESC";
  createdById?: string;
  updatedById?: string;
  confirmedById?: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  isActive: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  profileImage?: string | null;
  status?: string; // Legacy/Alias
  createdAt: string;
  updatedAt?: string;
  vehicles?: any[];
}

export interface CustomerFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export type LoginStep = "identifier" | "password" | "set-password";

export interface TierConfig {
  minAmount: number;
  maxAmount: number;
  commission: number;
}

export interface Commission {
  id: string;
  name: string;
  type: CommissionType;
  value?: number;
  tierConfig?: TierConfig[];
  aboveThreshold: number;
  aboveCommission: number;
  includeVAT: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookingCommission {
  id: string;
  bookingId: string;
  parkingId: string;
  totalAmount: number;
  commissionAmount: number;
  vatAmount?: number;
  referenceNo: string;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
  parking?: Parking;
}
