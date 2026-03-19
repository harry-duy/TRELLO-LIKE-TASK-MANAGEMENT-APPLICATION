import apiClient from '@config/api';

const boardService = {
  getBoards: async (params = {}) => {
    const response = await apiClient.get('/boards', { params });
    return response?.data ?? response;
  },

  // Lấy chi tiết một bảng kèm theo lists và cards
  getBoardDetails: async (boardId) => {
    const response = await apiClient.get(`/boards/${boardId}`);
    return response.data; // API trả về { success: true, data: { ...board } }
  },

  // Tạo bảng mới
  createBoard: async (boardData) => {
    const response = await apiClient.post('/boards', boardData);
    return response.data;
  },
  
  // Cập nhật thông tin bảng (tên, background...)
  updateBoard: async (boardId, updates) => {
    const response = await apiClient.put(`/boards/${boardId}`, updates);
    return response.data;
  },

  deleteBoard: async (boardId) => {
    const response = await apiClient.delete(`/boards/${boardId}`);
    return response?.data ?? response;
  },
};

export default boardService;
