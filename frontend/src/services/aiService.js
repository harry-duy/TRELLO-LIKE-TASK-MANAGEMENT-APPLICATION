import apiClient from '@config/api';

const aiService = {
  searchCards: async ({ boardId, query }) => {
    const response = await apiClient.post('/ai/search', { boardId, query });
    return response?.data ?? response;
  },

  getChecklistSuggestions: async ({ title, description, language }) => {
    const response = await apiClient.post('/ai/checklist-suggestions', {
      title,
      description,
      language: language || 'vi',
    });
    return response?.data ?? response;
  },

  chatAssistant: async ({ message, boardId, language }) => {
    const response = await apiClient.post('/ai/assistant', {
      message,
      boardId,
      language: language || 'vi',
    });
    return response?.data ?? response;
  },
};

export default aiService;
