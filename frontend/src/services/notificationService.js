// frontend/src/services/notificationService.js
import apiClient from '@config/api';

const notificationService = {
  // Lấy danh sách thông báo
  getAll: async ({ page = 1, limit = 20, unread = false } = {}) => {
    const params = { page, limit };
    if (unread) params.unread = 'true';
    const res = await apiClient.get('/notifications', { params });
    return res?.data ?? res;
  },

  // Đếm chưa đọc
  getUnreadCount: async () => {
    const res = await apiClient.get('/notifications/unread-count');
    return res?.data ?? res;
  },

  // Đánh dấu 1 thông báo đã đọc
  markRead: async (id) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res?.data ?? res;
  },

  // Đánh dấu tất cả đã đọc
  markAllRead: async () => {
    const res = await apiClient.patch('/notifications/read-all');
    return res?.data ?? res;
  },

  // Xoá 1 thông báo
  delete: async (id) => {
    const res = await apiClient.delete(`/notifications/${id}`);
    return res?.data ?? res;
  },

  // Xoá tất cả
  clearAll: async () => {
    const res = await apiClient.delete('/notifications');
    return res?.data ?? res;
  },
};

export default notificationService;