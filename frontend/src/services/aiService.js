import apiClient from '@config/api';

const aiService = {
  searchCards: async ({ boardId, query }) => {
    const response = await apiClient.post('/ai/search', { boardId, query });
    return response?.data ?? response;
  },

  getChecklistSuggestions: async ({ title, description }) => {
    const response = await apiClient.post('/ai/checklist-suggestions', {
      title,
      description,
    });
    return response?.data ?? response;
  },

  chatAssistant: async ({ message, boardId }) => {
    const response = await apiClient.post('/ai/assistant', {
      message,
      boardId,
    });
    return response?.data ?? response;
  },
};

export default aiService;
