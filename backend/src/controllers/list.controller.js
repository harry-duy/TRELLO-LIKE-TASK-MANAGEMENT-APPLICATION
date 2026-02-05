const List = require('../models/list.model');
const Activity = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Tạo danh sách mới (cột)
// @route   POST /api/lists
exports.createList = asyncHandler(async (req, res, next) => {
  const { name, boardId } = req.body;

  const list = await List.create({
    name,
    board: boardId
  });

  // Ghi log hoạt động tạo danh sách [cite: 68, 89]
  await Activity.log({
    actor: req.user._id,
    action: 'list_created',
    target: list._id,
    targetType: 'List',
    board: boardId
  });

  res.status(201).json({ success: true, data: list });
});

// @desc    Lấy tất cả danh sách của một Board (kèm theo các Card)
// @route   GET /api/lists/board/:boardId
exports.getBoardLists = asyncHandler(async (req, res, next) => {
  const { boardId } = req.params;

  // Sử dụng static method findByBoard đã có trong Model [cite: 93, 94]
  const lists = await List.findByBoard(boardId, { withCards: true });

  res.status(200).json({ success: true, data: lists });
});