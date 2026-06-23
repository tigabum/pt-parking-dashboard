import apiClient from "../api-client";
import { API_ENDPOINTS } from "../api-config";
import {
  ServiceResponse,
  LoginResponse,
  BackendUser,
  PreLoginResponse,
  AuthTokenPayload,
} from "../api-types";
import { User, UserRole } from "../auth";

export interface LoginCredentials {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface PasswordResetRequestResult {
  resetToken: string;
  deliveryChannel?: "SMS" | "EMAIL" | "BOTH";
}

class AuthService {
  /**
   * Login with email or phone number
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const response = await apiClient.post<ServiceResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.USER_LOGIN,
      credentials
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Login failed");
    }

    const { accessToken, refreshToken, user } = this.extractAuthPayload(response.data.data);

    // Store tokens
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    const authUser = user
      ? this.transformBackendUser(user)
      : this.transformTokenToUser(accessToken);

    return { user: authUser, accessToken, refreshToken };
  }

  /**
   * Pre-login check to see if password is set
   */
  async preLogin(
    email?: string,
    phoneNumber?: string
  ): Promise<{ nextStep: "password" | "set-password"; token: string }> {
    const response = await apiClient.post<ServiceResponse<PreLoginResponse & {
      resetToken?: string;
      setPasswordToken?: string;
      isPasswordSet?: boolean;
    }>>(
      API_ENDPOINTS.AUTH.USER_PRE_LOGIN,
      { email, phoneNumber }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Pre-login failed");
    }

    const data = response.data.data;
    const token = data.token || data.setPasswordToken || data.resetToken || "";
    const payload = token ? this.decodeToken(token) : null;
    const isPasswordSet = payload?.isPasswordSet ?? data.isPasswordSet;

    if (!isPasswordSet && !token) {
      throw new Error("Set password token is missing from server response");
    }

    return {
      nextStep: isPasswordSet ? "password" : "set-password",
      token,
    };
  }

  /**
   * Set user password using token
   */
  async setPassword(
    token: string,
    password: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const response = await apiClient.post<ServiceResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.USER_SET_PASSWORD,
      { password },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to set password");
    }

    const { accessToken, refreshToken, user } = this.extractAuthPayload(response.data.data);

    // Store tokens
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    const authUser = user
      ? this.transformBackendUser(user)
      : this.transformTokenToUser(accessToken);

    return { user: authUser, accessToken, refreshToken };
  }

  private extractAuthPayload(data: any): {
    accessToken: string;
    refreshToken: string;
    user?: any;
  } {
    const accessToken = data?.accessToken || data?.tokens?.accessToken;
    const refreshToken = data?.refreshToken || data?.tokens?.refreshToken;

    if (!accessToken || !refreshToken) {
      throw new Error("Authentication tokens are missing from backend response");
    }

    return {
      accessToken,
      refreshToken,
      user: data?.user,
    };
  }

  private decodeToken(token: string): AuthTokenPayload {
    const [, payload] = token.split(".");
    if (!payload) {
      throw new Error("Invalid token received from server");
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );

    return JSON.parse(json);
  }

  private transformTokenToUser(token: string): User {
    return this.transformBackendUser(this.decodeToken(token));
  }

  /**
   * Transform backend user to frontend user format
   */
  private transformBackendUser(backendUser: any): User {
    if (!backendUser) {
      throw new Error("User data is missing from backend response");
    }

    // Map backend role to frontend role
    const role = backendUser.role as UserRole;

    return {
      id: backendUser.id || backendUser.sub,
      email: backendUser.email || backendUser.phoneNumber || "",
      fullName: backendUser.fullName,
      role,
      phoneNumber: backendUser.phoneNumber,
      profileImage: backendUser.profileImage,
      orgId: backendUser.orgId,
      isVatIncluded: backendUser.isVatIncluded,
      needInvoice: backendUser.needInvoice,
      needSms: backendUser.needSms,
      permissions: backendUser.permissions || [],
      createdAt: backendUser.createdAt || new Date().toISOString(),
      isPasswordSet: backendUser.isPasswordSet,
      isPhoneVerified: backendUser.isPhoneVerified,
      isEmailVerified: backendUser.isEmailVerified,
    };
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {}, { skipToast: true } as any);
    } catch (e) {
      // Ignore errors if session already expired or server unreachable
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<ServiceResponse<BackendUser>>(
        API_ENDPOINTS.USERS.GET_PROFILE
      );

      if (!response.data.success || !response.data.data) {
        return null;
      }

      return this.transformBackendUser(response.data.data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ServiceResponse<any>> {
    const response = await apiClient.patch<ServiceResponse<any>>(
      API_ENDPOINTS.AUTH.USER_PASSWORD_CHANGE,
      { currentPassword, newPassword }
    );
    return response.data;
  }

  async requestPasswordReset(identifier: string): Promise<PasswordResetRequestResult> {
    const value = identifier.trim();
    const isEmail = value.includes("@");
    const response = await apiClient.post<
      ServiceResponse<{ resetToken?: string; token?: string; deliveryChannel?: "SMS" | "EMAIL" | "BOTH" }>
    >(
      API_ENDPOINTS.AUTH.USER_PASSWORD_RESET_REQUEST,
      isEmail ? { email: value.toLowerCase() } : { phoneNumber: value }
    );

    const token = response.data.data?.resetToken || response.data.data?.token;
    if (!response.data.success || !token) {
      throw new Error(response.data.message || "Failed to request password reset");
    }

    return {
      resetToken: token,
      deliveryChannel: response.data.data?.deliveryChannel,
    };
  }

  async confirmPasswordReset(resetToken: string, otpCode: string, newPassword: string): Promise<ServiceResponse<any>> {
    const response = await apiClient.post<ServiceResponse<any>>(
      API_ENDPOINTS.AUTH.USER_PASSWORD_RESET_CONFIRM,
      { otpCode, newPassword },
      {
        headers: {
          Authorization: `Bearer ${resetToken}`,
        },
      }
    );

    return response.data;
  }
}

export const authService = new AuthService();
