import apiClient from '@config/api';

const adminService = {
  getUsers: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.role) query.set('role', params.role);
    if (params.isActive !== undefined && params.isActive !== '') {
      query.set('isActive', String(params.isActive));
    }

    const queryString = query.toString();
    const path = queryString ? `/users?${queryString}` : '/users';

    return apiClient.get(path);
  },

  updateUserRole: async (userId, role) => {
    return apiClient.patch(`/users/${userId}/role`, { role });
  },

  updateUserStatus: async (userId, isActive) => {
    return apiClient.patch(`/users/${userId}/status`, { isActive });
  },

  deleteUser: async (userId) => {
    return apiClient.delete(`/users/${userId}`);
  },

  getWorkspaces: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.search) query.set('search', params.search);
    if (params.visibility) query.set('visibility', params.visibility);
    if (params.isActive !== undefined && params.isActive !== '') {
      query.set('isActive', String(params.isActive));
    }

    const queryString = query.toString();
    const path = queryString ? `/admin/workspaces?${queryString}` : '/admin/workspaces';

    return apiClient.get(path);
  },

  addWorkspaceMember: async (workspaceId, payload) => {
    return apiClient.post(`/admin/workspaces/${workspaceId}/members`, payload);
  },

  updateWorkspaceMemberRole: async (workspaceId, userId, role) => {
    return apiClient.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
  },

  transferWorkspaceOwnership: async (workspaceId, userId) => {
    return apiClient.patch(`/workspaces/${workspaceId}/transfer-ownership`, { userId });
  },

  removeWorkspaceMember: async (workspaceId, userId) => {
    return apiClient.delete(`/admin/workspaces/${workspaceId}/members/${userId}`);
  },

  deleteWorkspace: async (workspaceId) => {
    return apiClient.delete(`/admin/workspaces/${workspaceId}`);
  },

  getBoards: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.workspaceId) query.set('workspaceId', params.workspaceId);
    if (params.search) query.set('search', params.search);
    if (params.isClosed !== undefined && params.isClosed !== '') {
      query.set('isClosed', String(params.isClosed));
    }

    const queryString = query.toString();
    const path = queryString ? `/admin/boards?${queryString}` : '/admin/boards';

    return apiClient.get(path);
  },

  updateBoardStatus: async (boardId, isClosed) => {
    return apiClient.patch(`/admin/boards/${boardId}/status`, { isClosed });
  },

  deleteBoard: async (boardId) => {
    return apiClient.delete(`/admin/boards/${boardId}`);
  },

  getSystemOverview: async () => {
    return apiClient.get('/admin/analytics/overview');
  },

  getSystemTrends: async (days = 7) => {
    return apiClient.get(`/admin/analytics/trends?days=${days}`);
  },

  getAIUsageStats: async (days = 30) => {
    return apiClient.get(`/admin/analytics/ai-usage?days=${days}`);
  },

  getSystemActivities: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.action) query.set('action', params.action);

    const queryString = query.toString();
    const path = queryString ? `/admin/activities?${queryString}` : '/admin/activities';
    return apiClient.get(path);
  },

  getSystemResources: async () => {
    return apiClient.get('/admin/system-resources');
  },
};

export default adminService;
