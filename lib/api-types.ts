// Backend API Response Types

// Backend uses different role names than frontend
export enum UserRole {
    SYSTEM_SUPER_ADMIN = 'SYSTEM-SUPER-ADMIN',
    SYSTEM_ADMIN = 'SYSTEM-ADMIN',
    OWNER = 'OWNER',
    ATTENDANT = 'ATTENDANT',
    CUSTOMER = 'CUSTOMER'
}

export interface ServiceResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    error?: any;
}

export interface BackendUser {
    id: string;
    email?: string;
    phoneNumber?: string;
    fullName: string;
    role: UserRole;
    profileImage?: string;
    orgId?: string;
    permissions?: string[];
    status?: string;
    isPasswordSet: boolean;
    isPhoneVerified?: boolean;
    isEmailVerified?: boolean;
    isVatIncluded?: boolean;
    needInvoice?: boolean;
    needSms?: boolean;
    createdAt: string | Date;
    updatedAt?: string | Date;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        phoneNumber?: string;
        email?: string;
        role: UserRole;
        profileImage?: string;
        orgId?: string;
        isVatIncluded?: boolean;
        needInvoice?: boolean;
        needSms?: boolean;
        permissions?: string[];
    };
}

export interface UserListResponse {
    users: BackendUser[];
    total: number;
    page?: number;
    limit?: number;
}
