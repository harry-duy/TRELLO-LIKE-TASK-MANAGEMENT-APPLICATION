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
};

export default cardService;
