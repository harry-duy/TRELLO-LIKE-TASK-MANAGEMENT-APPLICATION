const List = require('../models/list.model');
const Board = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const Activity = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const ensureBoardAccess = async (boardId, user) => {
  const board = await Board.findById(boardId).select('workspace');
  if (!board) throw new AppError('Board not found', 404);
  if (user.role === 'admin') return board;
  const workspace = await Workspace.findById(board.workspace).select('owner members');
  if (!workspace) throw new AppError('Workspace not found', 404);
  const isOwner = workspace.owner?.toString() === user._id.toString();
  const isMember = (workspace.members || []).some(
    (m) => m.user?.toString() === user._id.toString()
  );
  if (!isOwner && !isMember) throw new AppError('You do not have access to this board', 403);
  return board;
};

// @desc    Tạo danh sách mới (cột)
// @route   POST /api/lists
exports.createList = asyncHandler(async (req, res, next) => {
  const { name, boardId } = req.body;
  if (!boardId) return next(new AppError('boardId is required', 400));
  await ensureBoardAccess(boardId, req.user);

  const list = await List.create({
    name,
    board: boardId
  });

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
  await ensureBoardAccess(boardId, req.user);

  const lists = await List.findByBoard(boardId, { withCards: true });

  res.status(200).json({ success: true, data: lists });
});

// @desc    Update list
// @route   PUT /api/lists/:id
exports.updateList = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const list = await List.findById(id);
  if (!list) return next(new AppError('Không tìm thấy danh sách', 404));
  await ensureBoardAccess(list.board, req.user);

  const ALLOWED_FIELDS = ['name', 'isArchived', 'position'];
  const updates = {};
  ALLOWED_FIELDS.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const updated = await List.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: updated });
});

// @desc    Xóa danh sách — nếu còn card thì phải truyền targetListId để chuyển card trước
// @route   DELETE /api/lists/:id
exports.deleteList = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { targetListId } = req.body;

  const list = await List.findById(id);
  if (!list) return next(new AppError('Không tìm thấy danh sách', 404));
  await ensureBoardAccess(list.board, req.user);

  const boardId = list.board;
  const Card    = require('../models/card.model');

  // Đếm card chưa archived còn trong list
  const cardCount = await Card.countDocuments({ list: list._id, isArchived: false });

  if (cardCount > 0) {
    // Bắt buộc phải có targetListId
    if (!targetListId) {
      return next(new AppError(
        `List này còn ${cardCount} card. Vui lòng chọn list khác để chuyển card trước khi xóa.`,
        400
      ));
    }

    // Kiểm tra targetList tồn tại và thuộc cùng board
    const targetList = await List.findById(targetListId);
    if (!targetList) return next(new AppError('List đích không tồn tại', 404));
    if (targetList.board.toString() !== boardId.toString()) {
      return next(new AppError('List đích phải thuộc cùng board', 400));
    }
    if (targetListId === id) {
      return next(new AppError('Không thể chuyển card sang chính list đang xóa', 400));
    }

    // Tính vị trí bắt đầu cho các card được chuyển sang
    const targetCardCount = await Card.countDocuments({ list: targetListId, isArchived: false });

    // Chuyển toàn bộ card (kể cả archived) sang list đích
    const cardsToMove = await Card.find({ list: list._id }).sort({ position: 1 });
    const bulkOps = cardsToMove.map((card, idx) => ({
      updateOne: {
        filter: { _id: card._id },
        update: { $set: { list: targetListId, position: targetCardCount + idx } },
      },
    }));
    if (bulkOps.length > 0) await Card.bulkWrite(bulkOps);
  } else {
    // Không còn card visible → xóa cả card archived trong list (nếu có)
    await Card.deleteMany({ list: list._id });
  }

  await List.deleteOne({ _id: list._id });

  await Activity.log({
    actor:      req.user._id,
    action:     'list_deleted',
    target:     id,
    targetType: 'List',
    board:      boardId,
    metadata:   targetListId ? { movedCardsTo: targetListId, cardCount } : {},
  });

  res.status(200).json({ success: true, data: { id, movedTo: targetListId || null } });
});
