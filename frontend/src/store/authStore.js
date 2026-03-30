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
          let token = get().accessToken;

          // If there is no in-memory/persisted access token yet, try restoring
          // the session from the refresh-token cookie first.
          if (!token) {
            try {
              token = await get().refreshToken();
            } catch (error) {
              set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
              return;
            }
          }

          const user = await authService.getMe();
          set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
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