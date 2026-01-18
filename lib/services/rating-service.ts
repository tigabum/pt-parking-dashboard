import api from "../api-client";
import { API_ENDPOINTS } from "../api-config";
import { ServiceResponse } from "../api-types";
import { PaginatedResponse } from "@/components/types";

export interface Rating {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    customer: {
        id: string;
        fullName: string;
        profileImage?: string;
    };
}

export interface RatingStats {
    parkingId: string;
    averageRating: number | null;
    totalRatings: number;
}

export interface RateParkingDto {
    parkingId: string;
    rating: number;
    comment?: string;
}

export const ratingService = {
    /**
     * Get rating statistics for a parking
     */
    async getRatingStats(parkingId: string): Promise<ServiceResponse<RatingStats>> {
        const response = await api.get<ServiceResponse<RatingStats>>(
            API_ENDPOINTS.RATINGS.GET_STATS(parkingId)
        );
        return response.data;
    },

    /**
     * List ratings for a parking with pagination
     */
    async getParkingRatings(parkingId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Rating>> {
        const response = await api.get(API_ENDPOINTS.RATINGS.GET_BY_PARKING(parkingId), {
            params,
        });
        return response.data;
    },

    /**
     * Create or update rating for a parking
     */
    async rateParking(data: RateParkingDto): Promise<ServiceResponse<Rating>> {
        const response = await api.post<ServiceResponse<Rating>>(
            API_ENDPOINTS.RATINGS.CREATE,
            data
        );
        return response.data;
    },
};
