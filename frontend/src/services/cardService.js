import apiClient from '@config/api';

const cardService = {
  getDetails: async (cardId) => {
    const response = await apiClient.get(`/cards/${cardId}`);
    return response?.data ?? response;
  },

  create: async (cardData) => {
    const response = await apiClient.post('/cards', cardData);
    return response?.data ?? response;
  },

  update: async (cardId, updates) => {
    const response = await apiClient.put(`/cards/${cardId}`, updates);
    return response?.data ?? response;
  },

  moveCard: async (cardId, moveData) => {
    const response = await apiClient.put(`/cards/${cardId}/move`, moveData);
    return response?.data ?? response;
  },

  delete: async (cardId) => {
    const response = await apiClient.delete(`/cards/${cardId}`);
    return response?.data ?? response;
  },

  addComment: async (cardId, commentData) => {
    const response = await apiClient.post(`/cards/${cardId}/comments`, commentData);
    return response?.data ?? response;
  },

  updateComment: async (cardId, commentId, content) => {
    const response = await apiClient.put(`/cards/${cardId}/comments/${commentId}`, { content });
    return response?.data ?? response;
  },

  deleteComment: async (cardId, commentId) => {
    const response = await apiClient.delete(`/cards/${cardId}/comments/${commentId}`);
    return response?.data ?? response;
  },

  addChecklistItem: async (cardId, text) => {
    const response = await apiClient.post(`/cards/${cardId}/checklist`, { text });
    return response?.data ?? response;
  },

  toggleChecklistItem: async (cardId, itemId) => {
    const response = await apiClient.patch(`/cards/${cardId}/checklist/${itemId}`);
    return response?.data ?? response;
  },

  moveChecklistItem: async (cardId, itemId, targetCardId) => {
    const response = await apiClient.post(`/cards/${cardId}/checklist/${itemId}/move`, {
      targetCardId,
    });
    return response?.data ?? response;
  },

  search: async (boardId, filters) => {
    const response = await apiClient.get('/cards/search', {
      params: { boardId, ...filters },
    });
    return response?.data ?? response;
  },

  getArchived: async (boardId) => {
    const response = await apiClient.get('/cards/archived', { params: { boardId } });
    return response?.data ?? response;
  },

  restore: async (cardId) => {
    const response = await apiClient.put(`/cards/${cardId}/restore`);
    return response?.data ?? response;
  },

  duplicate: async (cardId) => {
    const response = await apiClient.post(`/cards/${cardId}/duplicate`);
    return response?.data ?? response;
  },

  toggleWatch: async (cardId) => {
    const response = await apiClient.post(`/cards/${cardId}/watch`);
    return response?.data ?? response;
  },

  getActivity: async (cardId) => {
    const response = await apiClient.get(`/cards/${cardId}/activity`);
    return response?.data ?? response;
  },
};

export default cardService;
