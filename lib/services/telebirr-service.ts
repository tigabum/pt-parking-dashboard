import apiClient from "../api-client";

export interface TelebirrCredential {
    appSecret: string;
    fabricAppId: string;
    merchantAppId: string;
    merchantCode: string;
    privateKey: string;
    redirectUrl?: string;
    notifyUrl?: string;
}

export const telebirrService = {
    getCredentials: async (parkingId: string) => {
        try {
            const response = await apiClient.get(`/system-config/telebirr-credentials/${parkingId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    saveCredentials: async (parkingId: string, data: TelebirrCredential) => {
        const response = await apiClient.post(`/system-config/telebirr-credentials/${parkingId}`, data);
        return response.data;
    },
};
