import api from "../api-client";
import { API_ENDPOINTS } from "../api-config";
import { PaginatedResponse, Customer, CustomerFilterParams } from "@/components/types";
import { ServiceResponse } from "../api-types";

export const customerService = {
    async getAllCustomers(params?: CustomerFilterParams): Promise<PaginatedResponse<Customer>> {
        const response = await api.get(API_ENDPOINTS.CUSTOMERS.GET_ALL, {
            params,
        });
        return response.data;
    },

    async getCustomerById(id: string): Promise<ServiceResponse<Customer>> {
        const response = await api.get<ServiceResponse<Customer>>(API_ENDPOINTS.CUSTOMERS.GET_BY_ID(id));
        return response.data;
    },

    async searchByPhone(phone: string) {
        const response = await api.get(API_ENDPOINTS.CUSTOMERS.SEARCH, {
            params: { phone },
        });
        return response.data;
    },
};
