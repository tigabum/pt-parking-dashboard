import apiClient from "../api-client";
import { ServiceResponse } from "@/lib/api-types";
import { Commission } from "@/components/types";

export const commissionService = {
    getCommissions: async (params?: any) => {
        const res = await apiClient.get<ServiceResponse<any>>("/commissions", { params });
        return res.data;
    },

    getCommission: async (id: string) => {
        const res = await apiClient.get<ServiceResponse<Commission>>(`/commissions/${id}`);
        return res.data;
    },

    createCommission: async (data: Partial<Commission>) => {
        const res = await apiClient.post<ServiceResponse<Commission>>("/commissions/create", data);
        return res.data;
    },

    updateCommission: async (id: string, data: Partial<Commission>) => {
        const res = await apiClient.patch<ServiceResponse<Commission>>(`/commissions/${id}`, data);
        return res.data;
    },

    deleteCommission: async (id: string) => {
        const res = await apiClient.delete<ServiceResponse<null>>(`/commissions/${id}`);
        return res.data;
    },
};
