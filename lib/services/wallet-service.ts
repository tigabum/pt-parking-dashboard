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
        const token = localStorage.getItem("accessToken");
        // On production, the base is /api/ and the wallet endpoint is /wallets/...
        const WORKING_URL = `https://gelaglepark.com/api/wallets/parking/${parkingIdOrCode}/prefund`;
        
        const response = await fetch(WORKING_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ amount }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.message || `Request failed with status ${response.status}`);
        }

        return data;
    },
};
