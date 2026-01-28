import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '@services/authService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,

      // Initialize auth state
      initialize: async () => {
        try {
          const token = get().accessToken;
          if (token) {
            const user = await authService.getMe();
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      // Login
      login: async (credentials) => {
        const { user, accessToken } = await authService.login(credentials);
        set({ user, accessToken, isAuthenticated: true });
        return user;
      },

      // Register
      register: async (userData) => {
        const { user, accessToken } = await authService.register(userData);
        set({ user, accessToken, isAuthenticated: true });
        return user;
      },

      // Logout
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      // Update user profile
      updateProfile: async (updates) => {
        const updatedUser = await authService.updateProfile(updates);
        set({ user: updatedUser });
        return updatedUser;
      },

      // Set access token
      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      // Refresh token
      refreshToken: async () => {
        try {
          const { accessToken } = await authService.refreshToken();
          set({ accessToken });
          return accessToken;
        } catch (error) {
          set({ user: null, accessToken: null, isAuthenticated: false });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);