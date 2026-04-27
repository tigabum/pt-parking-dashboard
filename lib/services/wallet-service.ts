import axios from "axios";
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
        // Use a direct axios call to the local proxy to avoid CORS 'Network Error' 
        // and bypass the apiClient's remote baseURL.
        const token = localStorage.getItem('accessToken');
        const response = await axios.post(`/api/parking-proxy/wallets/parking/${parkingIdOrCode}/prefund`, 
            { amount },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },
};
