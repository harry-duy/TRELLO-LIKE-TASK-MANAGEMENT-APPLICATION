const express = require('express');
const router = express.Router();
const cardController = require('../controllers/card.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, cardSchemas } = require('../middleware/validation.middleware');

// Tất cả các route bên dưới đều yêu cầu đăng nhập
router.use(protect);

/**
 * @route   POST /api/cards
 * @desc    Tạo thẻ mới
 * @access  Private
 */
router.post(
  '/',
  validate(cardSchemas.create), // Kiểm tra title, listId, boardId... 
  cardController.createCard
);

/**
 * @route   PUT /api/cards/:id/move
 * @desc    Di chuyển thẻ giữa các danh sách hoặc thay đổi vị trí
 * @access  Private
 */
router.put(
  '/:id/move',
  validate(cardSchemas.move), // Kiểm tra listId và position mới 
  cardController.moveCard
);

// Bạn có thể thêm các route bổ sung sau này (ví dụ: lấy chi tiết, xóa thẻ)
router.get('/:id', (req, res) => {
  res.json({ message: 'Lấy chi tiết thẻ - TODO' });
});

module.exports = router;