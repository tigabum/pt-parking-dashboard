import apiClient from "../api-client";

export const walletService = {
    getAllWallets: async (params?: any) => {
        const response = await apiClient.get("/wallets/all", { params });
        return response.data;
    },

    getWalletByParkingId: async (parkingId: string) => {
        const response = await apiClient.get(`/wallets/parking/${parkingId}`);
        return response.data;
    },

    getTransactions: async (parkingId: string, config?: any) => {
        const response = await apiClient.get(`/wallets/parking/${parkingId}/transactions`, config);
        return response.data;
    },

    addFunds: async (parkingId: string, amount: number, description?: string) => {
        const response = await apiClient.post(`/wallets/parking/${parkingId}/add-funds`, { amount, description });
        return response.data;
    },

    initiateTelebirrPrefund: async (parkingIdOrCode: string, amount: number) => {
        // Hardcoding the 'working' API endpoint as requested, mirror the HTML page implementation
        const WORKING_API_URL = `http://157.180.114.86:8080/api/parking/wallets/parking/${parkingIdOrCode}/prefund`;
        const response = await apiClient.post(WORKING_API_URL, { amount });
        return response.data;
    },
};
