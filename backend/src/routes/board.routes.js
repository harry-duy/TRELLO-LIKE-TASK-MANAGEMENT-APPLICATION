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

router.get('/:id/members', protect, isBoardMember, boardController.getBoardMembers);
router.post('/:id/members', protect, isBoardMember, canManageBoard, boardController.addBoardMember);
router.delete('/:id/members/:userId', protect, isBoardMember, canManageBoard, boardController.removeBoardMember);

// Star/unstar chỉ dành cho user có quyền truy cập board
router.patch('/:id/star', protect, isBoardMember, boardController.toggleStar);

module.exports = router;