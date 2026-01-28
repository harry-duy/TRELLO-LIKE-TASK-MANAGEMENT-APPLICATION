import apiClient from '@config/api';

const authService = {
  // Register new user
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response;
  },

  // Get current user
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (updates) => {
    const response = await apiClient.put('/auth/update-profile', updates);
    return response.data;
  },

  // Change password
  changePassword: async (passwords) => {
    const response = await apiClient.put('/auth/change-password', passwords);
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response;
  },

  // Reset password
  resetPassword: async (token, password) => {
    const response = await apiClient.post(`/auth/reset-password/${token}`, {
      password,
      confirmPassword: password,
    });
    return response;
  },

  // Refresh token
  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh-token');
    return response.data;
  },
};

export default authService;