// backend/src/routes/board.routes.js
// ✅ Thêm route PATCH /:id/star

const express        = require('express');
const router         = express.Router();
const { protect, isBoardMember, isWorkspaceMember, canManageBoard } = require('../middleware/auth.middleware');
const boardController = require('../controllers/board.controller');
const { validate, boardSchemas } = require('../middleware/validation.middleware');

router.get('/',    protect, boardController.getBoards);

router.post(
  '/',
  protect,
  validate(boardSchemas.create),
  isWorkspaceMember,
  boardController.createBoard
);

router.get(    '/:id', protect, isBoardMember, boardController.getBoard);
router.put(    '/:id', protect, validate(boardSchemas.update), isBoardMember, canManageBoard, boardController.updateBoard);
router.delete( '/:id', protect, isBoardMember, canManageBoard, boardController.deleteBoard);

// Star/unstar chỉ dành cho user có quyền truy cập board
router.patch('/:id/star', protect, isBoardMember, boardController.toggleStar);

module.exports = router;