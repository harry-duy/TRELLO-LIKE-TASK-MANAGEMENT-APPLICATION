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

  const Card = require('../models/card.model');
  const cardsInList = await Card.find({ list: list._id })
    .select('_id isArchived position')
    .sort({ position: 1 });
  const { strategy, targetListId } = req.body || {};

  if (cardsInList.length > 0) {
    if (strategy === 'move') {
      if (!targetListId) {
        return next(new AppError('Thiáº¿u danh sÃ¡ch Ä‘Ã­ch Ä‘á»ƒ di chuyá»ƒn card', 400));
      }

      if (String(targetListId) === String(list._id)) {
        return next(new AppError('KhÃ´ng thá»ƒ di chuyá»ƒn card sang chÃ­nh danh sÃ¡ch nÃ y', 400));
      }

      const targetList = await List.findOne({ _id: targetListId, board: boardId });
      if (!targetList) {
        return next(new AppError('KhÃ´ng tÃ¬m tháº¥y danh sÃ¡ch Ä‘Ã­ch', 404));
      }

      await Card.updateMany(
        { list: list._id },
        { $set: { list: targetList._id } }
      );

      await Card.reorderCards(targetList._id);
    } else if (strategy === 'archive') {
      await Card.updateMany(
        { list: list._id, isArchived: false },
        { $set: { isArchived: true } }
      );
    } else {
      return next(new AppError('Danh sÃ¡ch nÃ y cÃ²n card. HÃ£y di chuyá»ƒn hoáº·c lÆ°u trá»¯ card trÆ°á»›c khi xÃ³a.', 400));
    }
  }

  await List.deleteOne({ _id: list._id });

  await Activity.log({
    actor: req.user._id,
    action: 'list_deleted',
    target: id,
    targetType: 'List',
    board: boardId,
    metadata: {
      strategy: strategy || 'empty',
      movedToList: targetListId || null,
      cardCount: cardsInList.length,
    },
  });

  res.status(200).json({ success: true, data: { id } });
});
