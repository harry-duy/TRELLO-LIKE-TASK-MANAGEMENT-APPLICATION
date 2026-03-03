const express = require('express');
const router = express.Router();
const { protect, isBoardMember, isWorkspaceMember } = require('../middleware/auth.middleware');
const boardController = require('../controllers/board.controller');
const { validate, boardSchemas } = require('../middleware/validation.middleware');

router.get('/', protect, (req, res) => {
  res.json({ message: 'Get all boards - TODO' });
});

router.post(
  '/',
  protect,
  validate(boardSchemas.create),
  isWorkspaceMember,
  boardController.createBoard
);

router.get('/:id', protect, isBoardMember, boardController.getBoard);

module.exports = router;
