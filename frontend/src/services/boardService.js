// frontend/src/services/boardService.js
// ✅ toggleStar gọi PATCH /boards/:id/star

import apiClient from '@config/api';

const boardService = {
  getBoards: async (params = {}) => {
    const response = await apiClient.get('/boards', { params });
    return response?.data ?? response;
  },

  getBoardDetails: async (boardId) => {
    const response = await apiClient.get(`/boards/${boardId}`);
    return response.data;
  },

  createBoard: async (boardData) => {
    const response = await apiClient.post('/boards', boardData);
    return response.data;
  },

  updateBoard: async (boardId, updates) => {
    const response = await apiClient.put(`/boards/${boardId}`, updates);
    return response.data;
  },

  deleteBoard: async (boardId) => {
    const response = await apiClient.delete(`/boards/${boardId}`);
    return response?.data ?? response;
  },

  // ✅ Gọi PATCH /boards/:id/star — không cần userId, backend dùng JWT
  toggleStar: async (boardId) => {
    const response = await apiClient.patch(`/boards/${boardId}/star`);
    return response?.data ?? response;
  },
};

export default boardService;