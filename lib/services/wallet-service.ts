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
};
