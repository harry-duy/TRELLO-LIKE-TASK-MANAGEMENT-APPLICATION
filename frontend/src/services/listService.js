import apiClient from '@config/api';

const listService = {
  createList: async (listData) => {
    const response = await apiClient.post('/lists', listData);
    return response?.data ?? response;
  },

  getBoardLists: async (boardId) => {
    const response = await apiClient.get(`/lists/board/${boardId}`);
    return response?.data ?? response;
  },

  deleteList: async (listId, payload = {}) => {
    const response = await apiClient.delete(`/lists/${listId}`, {
      data: payload,
    });
    return response?.data ?? response;
  },

  updateList: async (listId, updates) => {
    const response = await apiClient.put(`/lists/${listId}`, updates);
    return response?.data ?? response;
  },
};

export default listService;
