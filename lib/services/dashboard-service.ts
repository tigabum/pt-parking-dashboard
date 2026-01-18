import apiClient from '../api-client';
import { ServiceResponse } from '../api-types';

export interface DashboardStats {
    totalBookings: number;
    activeBookings: number;
    revenue: number;
    commission: number;
    totalCapacity: number;
    totalAvailableSpots: number;
    totalParkings: number;
    activeParkings: number;
    totalParkingUsers: number;
    trends: {
        weekly: Array<{ name: string; total: number }>;
        monthly: Array<{ name: string; total: number }>;
        yearly: Array<{ name: string; total: number }>;
    };
    paymentStats: Array<{ name: string; value: number }>;
}

class DashboardService {
    async getDashboardStats(params?: { parkingId?: string; managerUserId?: string; parkingStatus?: string }): Promise<DashboardStats> {
        const response = await apiClient.get<DashboardStats>('/dashboard/stats', { params });
        return response.data;
    }
}

export const dashboardService = new DashboardService();
