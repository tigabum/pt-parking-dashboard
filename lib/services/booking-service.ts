import apiClient from '../api-client';
import { API_ENDPOINTS } from '../api-config';
import { ServiceResponse } from '../api-types';
import { BookingResponse, PaginatedResponse, Booking, BookingFilterParams } from '@/components/types';

class BookingService {
    /**
     * Get all bookings
     */
    async getAllBookings(params?: BookingFilterParams): Promise<PaginatedResponse<BookingResponse>> {
        const response = await apiClient.get(API_ENDPOINTS.BOOKINGS.GET_ALL, { params });
        return response.data;
    }

    /**
     * Get booking by ID
     */
    async getBookingById(id: string): Promise<ServiceResponse<Booking>> {
        const response = await apiClient.get<ServiceResponse<Booking>>(
            API_ENDPOINTS.BOOKINGS.GET_BY_ID(id)
        );
        return response.data;
    }

    /**
     * Create booking
     */
    async createBooking(data: any): Promise<ServiceResponse<{ booking: Booking; currency: string }>> {
        const response = await apiClient.post<ServiceResponse<{ booking: Booking; currency: string }>>(
            API_ENDPOINTS.BOOKINGS.CREATE,
            data
        );
        return response.data;
    }

    /**
     * Update booking status
     */
    async updateBookingStatus(id: string, status: string, amount?: number | string): Promise<ServiceResponse<Booking>> {
        const response = await apiClient.patch<ServiceResponse<Booking>>(
            API_ENDPOINTS.BOOKINGS.UPDATE_STATUS(id),
            { status, amount }
        );
        return response.data;
    }

    /**
     * Extend booking
     */
    async extendBooking(id: string, newEndTime: string): Promise<ServiceResponse<Booking>> {
        const response = await apiClient.patch<ServiceResponse<Booking>>(
            API_ENDPOINTS.BOOKINGS.EXTEND(id),
            { newEndTime }
        );
        return response.data;
    }

    /**
     * Get revenue stats
     */
    async getRevenueStats(params: { parkingId?: string; startDate?: string; endDate?: string }): Promise<ServiceResponse<any>> {
        const response = await apiClient.get<ServiceResponse<any>>(API_ENDPOINTS.BOOKINGS.GET_STATS, { params });
        return response.data;
    }
}

export const bookingService = new BookingService();
