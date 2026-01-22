import api from "../api-client";
import { ServiceResponse } from "../api-types";

export interface Amenity {
    id: string;
    name: string;
    icon?: string;
    isActive: boolean;
}

export const amenityService = {
    getAmenities: async (): Promise<ServiceResponse<Amenity[]>> => {
        try {
            const response = await api.get("/amenities");
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch amenities",
                data: [],
            };
        }
    },
};
