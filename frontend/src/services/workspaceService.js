import apiClient from '@config/api';

const workspaceService = {
  getMyWorkspaces: async () => {
    const response = await apiClient.get('/workspaces');
    return response?.data ?? response;
  },

  createWorkspace: async (workspaceData) => {
    const response = await apiClient.post('/workspaces', workspaceData);
    return response?.data ?? response;
  },

  getWorkspace: async (workspaceId) => {
    const response = await apiClient.get(`/workspaces/${workspaceId}`);
    return response?.data ?? response;
  },

  deleteWorkspace: async (workspaceId) => {
    const response = await apiClient.delete(`/workspaces/${workspaceId}`);
    return response?.data ?? response;
  },
};

export default workspaceService;
