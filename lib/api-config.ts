export const API_CONFIG = {
    // Force local backend if env var is missing or empty
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    TIMEOUT: 30000,
} as const;

// console.log('API config loaded. BASE_URL:', API_CONFIG.BASE_URL);

// API Endpoints
export const API_ENDPOINTS = {
    // Auth
    AUTH: {
        USER_LOGIN: '/auth/user/login',
        USER_PRE_LOGIN: '/auth/user/pre-login',
        CUSTOMER_LOGIN: '/auth/customer/login',
        USER_VERIFY: '/auth/user/verify',
        USER_SET_PASSWORD: '/auth/user/set-password',
        USER_PASSWORD_RESET_REQUEST: '/auth/user/password-reset/request',
        USER_PASSWORD_RESET_CONFIRM: '/auth/user/password-reset/confirm',
        USER_PASSWORD_CHANGE: '/auth/user/password/change',
        USER_REFRESH: '/auth/user/refresh',
    },
    // Users
    USERS: {
        REGISTER: '/users/register',
        GET_ALL: '/users/all',
        GET_PROFILE: '/users/profile',
        UPDATE_PROFILE: '/users/profile',
        GET_BY_ID: (id: string) => `/users/${id}`,
        TOGGLE_STATUS: (id: string) => `/users/${id}/toggle-status`,
    },
    // Parking
    PARKING: {
        GET_ALL: '/parking/all',
        CREATE: '/parking/create',
        GET_BY_ID: (id: string) => `/parking/${id}`,
        UPDATE: (id: string) => `/parking/update/${id}`,
        APPROVE: (id: string) => `/parking/approve/${id}`,
        DELETE: (id: string) => `/parking/${id}`,
    },
    // Bookings
    BOOKINGS: {
        GET_ALL: '/bookings/all',
        CREATE: '/bookings/create',
        GET_BY_ID: (id: string) => `/bookings/${id}`,
        UPDATE_STATUS: (id: string) => `/bookings/${id}/status`,
        EXTEND: (id: string) => `/bookings/${id}/extend`,
        GET_STATS: '/bookings/stats',
    },
    // Customers
    CUSTOMERS: {
        GET_ALL: '/customers/all',
        GET_BY_ID: (id: string) => `/customers/${id}`,
        CREATE: '/customers',
        UPDATE: (id: string) => `/customers/${id}`,
        SEARCH: '/customers/search',
    },
    // Vehicles
    VEHICLES: {
        GET_ALL: '/vehicles/all',
        GET_BY_ID: (id: string) => `/vehicles/${id}`,
        CREATE: '/vehicles',
        UPDATE: (id: string) => `/vehicles/${id}`,
        DELETE: (id: string) => `/vehicles/${id}`,
        SEARCH: '/vehicles/search',
    },
    // Ratings
    RATINGS: {
        GET_STATS: (parkingId: string) => `/ratings/parking/${parkingId}/stats`,
        GET_BY_PARKING: (parkingId: string) => `/ratings/parking/${parkingId}`,
        CREATE: '/ratings',
    },
} as const;
