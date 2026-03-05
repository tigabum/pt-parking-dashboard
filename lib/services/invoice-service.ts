import apiClient from "../api-client";

export interface InvoiceCredential {
    clientId: string;
    clientSecret: string;
    apiKey: string;
    tin: string;
    vatNumber?: string;
    systemNumber?: string;
    systemType?: string;
    signature?: string;
    certificate?: string;
}

export const invoiceService = {
    getCredentials: async (parkingId: string) => {
        try {
            const response = await apiClient.get(`/invoice/credentials/${parkingId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    saveCredentials: async (parkingId: string, data: InvoiceCredential) => {
        const response = await apiClient.post(`/invoice/credentials/${parkingId}`, data);
        return response.data;
    },

    getHistory: async (parkingId: string, params: any = {}) => {
        const response = await apiClient.get(`/invoice/history/${parkingId}`, { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/invoice/${id}`);
        return response.data;
    },

    registerInvoice: async (data: any) => {
        const response = await apiClient.post(`/invoice/register`, data);
        return response.data;
    },

    verifyInvoice: async (id: string) => {
        const response = await apiClient.post(`/invoice/verify/${id}`);
        return response.data;
    },

    cancelInvoice: async (id: string, reason: string) => {
        const response = await apiClient.post(`/invoice/cancel/${id}`, { reason });
        return response.data;
    },

    generateReceipt: async (id: string, data: any = {}) => {
        const response = await apiClient.post(`/invoice/receipt/${id}`, data);
        return response.data;
    },

    generateWithholdingReceipt: async (id: string, data: any = {}) => {
        const response = await apiClient.post(`/invoice/withholding/${id}`, data);
        return response.data;
    },
};
