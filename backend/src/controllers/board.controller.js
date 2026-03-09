const Board = require('../models/board.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Lấy chi tiết một bảng
// @route   GET /api/boards/:id
exports.getBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id)
    .populate('workspace')
    .populate({
      path: 'lists',
      populate: { path: 'cards' } // Lấy sâu đến tận Card [cite: 91, 94]
    });

  if (!board) return next(new AppError('Không tìm thấy bảng', 404));

  res.status(200).json({ success: true, data: board });
});