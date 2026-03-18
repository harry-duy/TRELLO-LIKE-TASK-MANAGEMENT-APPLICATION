// frontend/src/services/boardService.js
// COPY FILE NÀY VÀO: frontend/src/services/boardService.js

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

  // ✅ Toggle star/unstar một board
  // Backend: board.starredBy là mảng userId
  // Vì backend chưa có route /star riêng, ta dùng PUT updateBoard
  // Nếu backend có route riêng thì đổi lại đây
  toggleStar: async (boardId, userId) => {
    // Lấy board hiện tại
    const res = await apiClient.get(`/boards/${boardId}`);
    const board = res?.data ?? res;
    const starredBy = board?.starredBy || [];
    const isStarred = starredBy.some(id => id === userId || id?._id === userId || id?.toString() === userId?.toString());

    let newStarredBy;
    if (isStarred) {
      // Unstar: remove userId
      newStarredBy = starredBy.filter(id => {
        const sid = id?._id || id;
        return sid?.toString() !== userId?.toString();
      });
    } else {
      // Star: add userId
      newStarredBy = [...starredBy, userId];
    }

    const updated = await apiClient.put(`/boards/${boardId}`, { starredBy: newStarredBy });
    return { board: updated?.data ?? updated, isStarred: !isStarred };
  },
};

export default boardService;