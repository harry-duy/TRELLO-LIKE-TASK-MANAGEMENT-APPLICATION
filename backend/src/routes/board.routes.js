const express = require('express');
const router = express.Router();
const { protect, isBoardMember, isWorkspaceMember } = require('../middleware/auth.middleware');
const boardController = require('../controllers/board.controller');
const { validate, boardSchemas } = require('../middleware/validation.middleware');

router.get('/', protect, boardController.getBoards);

router.post(
  '/',
  protect,
  validate(boardSchemas.create),
  isWorkspaceMember,
  boardController.createBoard
);

router.get('/:id', protect, isBoardMember, boardController.getBoard);
router.put(
  '/:id',
  protect,
  validate(boardSchemas.update),
  isBoardMember,
  boardController.updateBoard
);
router.delete('/:id', protect, isBoardMember, boardController.deleteBoard);

module.exports = router;
