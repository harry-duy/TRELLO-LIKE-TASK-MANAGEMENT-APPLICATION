// frontend/src/services/workspaceService.js
import apiClient from '@config/api';

const workspaceService = {
  // Lấy tất cả workspace của user hiện tại
  getMyWorkspaces: async () => {
    const res = await apiClient.get('/workspaces');
    return res?.data ?? res;
  },

  // Tạo workspace mới
  createWorkspace: async (data) => {
    const res = await apiClient.post('/workspaces', data);
    return res?.data ?? res;
  },

  // Xem chi tiết workspace
  getWorkspace: async (workspaceId) => {
    const res = await apiClient.get(`/workspaces/${workspaceId}`);
    return res?.data ?? res;
  },

  // ✅ Cập nhật workspace — gọi PUT /workspaces/:id (đã có backend)
  updateWorkspace: async (workspaceId, updates) => {
    const res = await apiClient.put(`/workspaces/${workspaceId}`, updates);
    return res?.data ?? res;
  },

  // ✅ Xoá workspace — gọi DELETE /workspaces/:id (đã có backend)
  deleteWorkspace: async (workspaceId) => {
    const res = await apiClient.delete(`/workspaces/${workspaceId}`);
    return res?.data ?? res;
  },

  // Thêm member (gửi email)
  addMember: async (workspaceId, email, role = 'member') => {
    const res = await apiClient.post(`/workspaces/${workspaceId}/members`, {
      email,
      role,
    });
    return res?.data ?? res;
  },

  // Xoá member
  removeMember: async (workspaceId, userId) => {
    const res = await apiClient.delete(
      `/workspaces/${workspaceId}/members/${userId}`
    );
    return res?.data ?? res;
  },

  // Đổi role member
  updateMemberRole: async (workspaceId, userId, role) => {
    const res = await apiClient.patch(
      `/workspaces/${workspaceId}/members/${userId}/role`,
      { role }
    );
    return res?.data ?? res;
  },
};

export default workspaceService;