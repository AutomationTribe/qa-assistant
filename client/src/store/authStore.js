import { create } from 'zustand';
export const useAuthStore = create((set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    setAuth: (user, accessToken) => {
        localStorage.setItem('regi_had_session', 'true');
        set({
            user,
            accessToken,
            isAuthenticated: true,
        });
    },
    clearAuth: () => {
        localStorage.removeItem('regi_had_session');
        set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
        });
    },
}));
