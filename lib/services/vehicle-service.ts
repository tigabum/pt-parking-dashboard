import api from "../api-client";
import { API_ENDPOINTS } from "../api-config";
import { ServiceResponse } from "../api-types";
import { PaginatedResponse } from "@/components/types";

export interface Vehicle {
    id: string;
    plateNumber: string;
    brand: string;
    model: string;
    ownerId?: string;
    createdAt: string;
}

export interface VehicleFilterParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
}

export const vehicleService = {
    async getAllVehicles(params?: VehicleFilterParams): Promise<PaginatedResponse<Vehicle>> {
        const response = await api.get(API_ENDPOINTS.VEHICLES.GET_ALL, {
            params,
        });
        return response.data;
    },

    async updateVehicle(id: string, data: Partial<Vehicle>): Promise<ServiceResponse<Vehicle>> {
        const response = await api.patch<ServiceResponse<Vehicle>>(API_ENDPOINTS.VEHICLES.UPDATE(id), data);
        return response.data;
    },

    async getVehicleById(id: string): Promise<ServiceResponse<Vehicle>> {
        const response = await api.get<ServiceResponse<Vehicle>>(API_ENDPOINTS.VEHICLES.GET_BY_ID(id));
        return response.data;
    },

    async deleteVehicle(id: string): Promise<ServiceResponse<any>> {
        const response = await api.delete<ServiceResponse<any>>(API_ENDPOINTS.VEHICLES.DELETE(id)); // Assuming a DELETE endpoint exists
        return response.data;
    },

    async searchByPlate(plate: string) {
        const response = await api.get(API_ENDPOINTS.VEHICLES.SEARCH, {
            params: { plate },
        });
        return response.data;
    },
};
