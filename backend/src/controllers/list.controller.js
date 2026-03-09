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

// @desc    Update list
// @route   PUT /api/lists/:id
exports.updateList = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const list = await List.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!list) return next(new AppError('Không tìm thấy danh sách', 404));

  res.status(200).json({ success: true, data: list });
});

// @desc    Xóa danh sách
// @route   DELETE /api/lists/:id
exports.deleteList = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const list = await List.findById(id);
  if (!list) return next(new AppError('Không tìm thấy danh sách', 404));

  const boardId = list.board;

  // Manually cascade delete cards (avoid deprecated remove in newer Mongoose)
  const Card = require('../models/card.model');
  await Card.deleteMany({ list: list._id });
  await List.deleteOne({ _id: list._id });

  await Activity.log({
    actor: req.user._id,
    action: 'list_deleted',
    target: id,
    targetType: 'List',
    board: boardId,
  });

  res.status(200).json({ success: true, data: { id } });
});
