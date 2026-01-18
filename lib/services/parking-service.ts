import apiClient from '../api-client';
import { API_ENDPOINTS } from '../api-config';
import { ServiceResponse } from '../api-types';
import { ParkingResponse, PaginatedResponse, ParkingSpace, ParkingFilterParams } from '@/components/types';

class ParkingService {
    /**
     * Get all parking spaces
     */
    async getAllParking(params?: ParkingFilterParams): Promise<PaginatedResponse<ParkingResponse>> {
        const response = await apiClient.get(API_ENDPOINTS.PARKING.GET_ALL, { params });
        return response.data;
    }

    /**
     * Get parking by ID
     */
    async getParkingById(id: string): Promise<ServiceResponse<ParkingResponse>> {
        const response = await apiClient.get<ServiceResponse<ParkingResponse>>(
            API_ENDPOINTS.PARKING.GET_BY_ID(id)
        );
        return response.data;
    }

    /**
     * Create parking space
     */
    async createParking(formData: FormData): Promise<ServiceResponse<ParkingSpace>> {
        const response = await apiClient.post<ServiceResponse<ParkingSpace>>(
            API_ENDPOINTS.PARKING.CREATE,
            formData
        );
        return response.data;
    }

    /**
     * Update parking space
     */
    async updateParking(id: string, formData: FormData): Promise<ServiceResponse<ParkingSpace>> {
        const response = await apiClient.patch<ServiceResponse<ParkingSpace>>(
            API_ENDPOINTS.PARKING.UPDATE(id),
            formData
        );
        return response.data;
    }

    /**
     * Approve parking
     */
    async approveParking(id: string): Promise<ServiceResponse<any>> {
        const response = await apiClient.patch<ServiceResponse<any>>(
            API_ENDPOINTS.PARKING.APPROVE(id)
        );
        return response.data;
    }

    /**
     * Delete parking space
     */
    async deleteParking(id: string): Promise<ServiceResponse<any>> {
        const response = await apiClient.delete<ServiceResponse<any>>(
            API_ENDPOINTS.PARKING.DELETE(id)
        );
        return response.data;
    }
}

export const parkingService = new ParkingService();
