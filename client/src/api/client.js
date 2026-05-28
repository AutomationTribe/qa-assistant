import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
    withCredentials: true,
});
let refreshPromise = null;
apiClient.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    // Don't retry on rate limit errors
    if (error.response?.status === 429) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
    }
    // Only retry other 401 errors (not any auth endpoint itself)
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
        originalRequest._retry = true;
        try {
            // Prevent multiple simultaneous refresh requests
            if (!refreshPromise) {
                refreshPromise = (async () => {
                    const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
                    const { accessToken } = response.data;
                    const user = useAuthStore.getState().user;
                    if (user) {
                        useAuthStore.getState().setAuth(user, accessToken);
                    }
                    return accessToken;
                })();
            }
            const accessToken = await refreshPromise;
            refreshPromise = null;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
        }
        catch {
            refreshPromise = null;
            useAuthStore.getState().clearAuth();
            return Promise.reject(error);
        }
    }
    return Promise.reject(error);
});
export default apiClient;
