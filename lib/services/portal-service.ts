import apiClient from "../api-client";
import { Booking, Parking } from "@/components/types";
import { AxiosResponse } from "axios";

const handleResponse = (response: AxiosResponse) => response.data;


export const portalService = {
    // 1. Get Public Parking Details
    getParkingDetails: async (id: string) => {
        return apiClient.get<Parking>(`/parking/public-details/${id}`).then(handleResponse);
    },

    // 2. Check Customer Status
    checkCustomer: async (phone?: string, plate?: string) => {
        let url = `/customers/check-status?`;
        if (phone) url += `phone=${phone}&`;
        if (plate) url += `plate=${plate}&`;
        return apiClient.get<{ exists: boolean; fullName?: string; phoneNumber?: string; vehicles?: any[] }>(
            url
        ).then(handleResponse);
    },

    // 2.1 Find Active Guest Booking
    getActiveBooking: async (phone: string | null, parkingId: string, id?: string) => {
        let url = `/bookings/public/active?parkingId=${parkingId}`;
        if (id) url += `&id=${id}`;
        if (phone) url += `&phone=${phone}`;
        return apiClient.get<Booking | null>(url).then(handleResponse);
    },

    // 3. Register Guest Customer (if needed via public endpoint? Or use bookings/create implied creation?)
    // Actually, bookings/create handles creation. But if we want to "Register" explicitly step,
    // we might use customers/create (public).
    registerCustomer: async (data: FormData) => {
        // data should have fullName, phoneNumber, plateNumber etc.
        // The public create endpoint expects FormData if file upload, or JSON if not.
        // Let's assume JSON for now or FormData as controller consumes multipart.
        return apiClient.post("/customers/create", data).then(handleResponse);
    },

    // 4. Create Booking
    createBooking: async (data: any): Promise<{ success: boolean; message: string; data?: { booking: Booking; currency: string } }> => {
        return apiClient.post(
            "/bookings/create",
            data
        ).then(handleResponse);
    },

    // 5. Get Booking Details (for active session polling)
    // This might be tricky for guest if getting by ID requires auth.
    // We verified bookings/:id requires JwtAuthGuard.
    // We need a solution for polling active session for guest without token.
    // Option A: Use the creation response and local timer.
    // Option B: Public endpoint for booking status by ID (maybe secured by phone number matching?).
    // Let's assume we rely on local state for now, or add a public status check.
    // *Decision*: Add public status check or just use local calculation.
    // For "Stop Parking", we need an endpoint.
    // user flow: "Stop Parking" -> calc amount -> Pay.
    // If we can't call getBooking, we can't get true server time/price.
    // I should add a public booking status endpoint or rely on `updateStatus` (checkout) to return final calc.

    // 6. Checkout (Stop Session / Request Payment)
    stopSession: async (id: string, phone: string, paymentMethod?: string) => {
        return apiClient.patch(
            `/bookings/public/${id}/checkout`,
            { customerPhone: phone, paymentMethod }
        ).then(handleResponse);
    },

    extendBooking: async (id: string, phone: string, newEndTime: string) => {
        return apiClient.patch(
            `/bookings/public/${id}/extend`,
            { customerPhone: phone, newEndTime }
        ).then(handleResponse);
    },

    // 7. Verify Payment (Simulate Payment Callback)
    verifyPayment: async (id: string, provider: string, refId?: string) => {
        return apiClient.post(
            `/bookings/public/${id}/pay`,
            { provider, refId }
        ).then(handleResponse);
    },

    initializeTelebirrPayment: async (orderId: string, amount: string) => {
        // Calling the user's real telebirr test endpoint
        return apiClient.post<{ paymentUrl: string }>(`/payments/create/order`, {
            title: "Parking Payment",
            amount: amount,
            orderId: orderId,
        }).then(response => {
            return response.data as any as string;
        });
    }
};
