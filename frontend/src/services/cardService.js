import apiClient from '@config/api';

const cardService = {
  // Lấy chi tiết thẻ (bao gồm assignees và comments)
  getDetails: async (cardId) => {
    const response = await apiClient.get(`/cards/${cardId}`);
    return response.data;
  },

  // Tạo thẻ mới trong một danh sách
  create: async (cardData) => {
    const response = await apiClient.post('/cards', cardData);
    return response.data;
  },

  // Cập nhật thông tin thẻ (tiêu đề, mô tả, deadline...)
  update: async (cardId, updates) => {
    const response = await apiClient.put(`/cards/${cardId}`, updates);
    return response.data;
  },

  // Di chuyển thẻ (Thay đổi listId hoặc position) - Dùng cho Drag & Drop
  moveCard: async (cardId, moveData) => {
    const response = await apiClient.put(`/cards/${cardId}/move`, moveData);
    return response.data;
  },

  // Xóa thẻ
  delete: async (cardId) => {
    const response = await apiClient.delete(`/cards/${cardId}`);
    return response.data;
  },

  // Thêm bình luận mới
  addComment: async (cardId, commentData) => {
    const response = await apiClient.post(`/cards/${cardId}/comments`, commentId);
    return response.data;
  },

  // Tìm kiếm thẻ theo keyword/nhãn
  search: async (boardId, filters) => {
    const response = await apiClient.get(`/cards/search`, {
      params: { boardId, ...filters }
    });
    return response.data;
  }
};

export default cardService;