// backend/src/controllers/board.controller.js
// ✅ Thêm pagination/filter/sort cho getBoards
// ✅ toggleStar export

const Board     = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const List      = require('../models/list.model');
const Card      = require('../models/card.model');
const Activity  = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const notify    = require('../utils/notifyHelper');

const getAccessibleWorkspaceIds = async (user) => {
  if (user.role === 'admin') return null;
  const workspaces = await Workspace.find({
    $or: [{ owner: user._id }, { 'members.user': user._id }],
  }).select('_id');
  return workspaces.map((w) => w._id);
};

// @desc  Get boards the current user can access (with pagination, filter, sort)
// @route GET /api/boards
exports.getBoards = asyncHandler(async (req, res) => {
  const query = {};
  const accessibleWorkspaceIds = await getAccessibleWorkspaceIds(req.user);
  if (accessibleWorkspaceIds && accessibleWorkspaceIds.length === 0)
    return res.status(200).json({ success: true, data: [], meta: { total: 0 } });

  if (req.query.workspaceId) {
    query.workspace = req.query.workspaceId;
  } else if (accessibleWorkspaceIds) {
    query.workspace = { $in: accessibleWorkspaceIds };
  }

  if (accessibleWorkspaceIds && req.query.workspaceId) {
    const ok = accessibleWorkspaceIds.some((id) => id.toString() === req.query.workspaceId);
    if (!ok) return res.status(200).json({ success: true, data: [], meta: { total: 0 } });
  }

  if (req.query.isClosed !== undefined) query.isClosed = req.query.isClosed === 'true';

  if (req.query.search?.trim()) {
    const kw = req.query.search.trim();
    query.$or = [
      { name:        { $regex: kw, $options: 'i' } },
      { description: { $regex: kw, $options: 'i' } },
    ];
  }

  // ── Pagination & Sort ──────────────────────────────────────────────
  const page  = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const skip  = (page - 1) * limit;

  const sortMap = {
    name:    { name: 1 },
    oldest:  { createdAt: 1 },
    latest:  { updatedAt: -1 },
  };
  const sortBy = sortMap[req.query.sort] || { updatedAt: -1 };

  const [boards, total] = await Promise.all([
    Board.find(query)
      .populate('workspace',  'name visibility isActive owner members')
      .populate('createdBy',  'name email avatar role')
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    Board.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: boards,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// @desc  Create new board
// @route POST /api/boards
exports.createBoard = asyncHandler(async (req, res, next) => {
  const { name, description, workspaceId, background } = req.body;
  if (!name || !workspaceId) return next(new AppError('Board name and workspaceId are required', 400));

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return next(new AppError('Workspace not found', 404));

  const board = await Board.create({
    name: name.trim(), description, workspace: workspaceId, background, createdBy: req.user._id,
  });

  await Activity.log({
    actor: req.user._id, action: 'board_created',
    target: board._id,  targetType: 'Board',
    board: board._id,   workspace: workspaceId,
  });

  res.status(201).json({ success: true, data: board });
});

// @desc  Get board details
// @route GET /api/boards/:id
exports.getBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id)
    .populate('workspace')
    .populate({ path: 'lists', populate: { path: 'cards' } });
  if (!board) return next(new AppError('Board not found', 404));
  res.status(200).json({ success: true, data: board });
});

// @desc  Update board details
// @route PUT /api/boards/:id
exports.updateBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id);
  if (!board) return next(new AppError('Board not found', 404));

  const allowedFields = ['name', 'description', 'background', 'isClosed'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined)
      updates[f] = f === 'name' && typeof req.body[f] === 'string'
        ? req.body[f].trim() : req.body[f];
  });

  if (updates.name === '') return next(new AppError('Board name cannot be empty', 400));

  Object.assign(board, updates);
  await board.save();

  await Activity.log({
    actor: req.user._id, action: 'board_updated',
    target: board._id,  targetType: 'Board',
    board: board._id,   workspace: board.workspace,
    metadata: updates,
  });

  const workspace = await Workspace.findById(board.workspace).populate('members.user', '_id');
  if (workspace) {
    const allMemberIds = [workspace.owner, ...workspace.members.map((m) => m.user?._id || m.user)].filter(Boolean);
    const io = req.app?.get?.('io');
    await notify(io, {
      actor:      req.user._id,
      recipients: allMemberIds,
      type:       'board_updated',
      title:      'Board được cập nhật',
      message:    `${req.user.name} đã cập nhật board "${board.name}"`,
      link:       `/board/${board._id}`,
      metadata:   { boardId: board._id, boardName: board.name, updates },
    });
  }

  const updated = await Board.findById(board._id)
    .populate('workspace')
    .populate({ path: 'lists', populate: { path: 'cards' } });

  res.status(200).json({ success: true, data: updated });
});

// @desc  Delete board (optionally migrate cards to another list first)
// @route DELETE /api/boards/:id
exports.deleteBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id);
  if (!board) return next(new AppError('Board not found', 404));

  const { targetListId } = req.body;

  const lists   = await List.find({ board: board._id }).select('_id');
  const listIds = lists.map((l) => l._id);

  // Migrate non-archived cards to target list before deletion
  if (targetListId && listIds.length > 0) {
    const targetList = await List.findById(targetListId).select('_id board');
    if (!targetList) return next(new AppError('Target list not found', 404));

    const targetBoardId    = targetList.board;
    const targetCardCount  = await Card.countDocuments({ list: targetListId, isArchived: false });
    const cardsToMove      = await Card.find({ list: { $in: listIds }, isArchived: false }).sort({ position: 1 });

    if (cardsToMove.length > 0) {
      const bulkOps = cardsToMove.map((card, i) => ({
        updateOne: {
          filter: { _id: card._id },
          update: { $set: { list: targetListId, board: targetBoardId, position: targetCardCount + i } },
        },
      }));
      await Card.bulkWrite(bulkOps);
    }

    // Only delete archived cards from this board
    if (listIds.length > 0) {
      await Card.deleteMany({ list: { $in: listIds }, isArchived: true });
    }
  } else if (listIds.length > 0) {
    await Card.deleteMany({ list: { $in: listIds } });
  }

  await Activity.log({
    actor: req.user._id, action: 'board_deleted',
    target: board._id,  targetType: 'Board',
    board: board._id,   workspace: board.workspace,
  });

  if (listIds.length > 0) {
    await List.deleteMany({ _id: { $in: listIds } });
  }
  await Board.deleteOne({ _id: board._id });

  res.status(200).json({ success: true, message: 'Board deleted successfully', data: { id: board._id } });
});

// @desc  Get archived cards for a board
// @route GET /api/boards/:id/archived-cards
exports.getArchivedCards = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id).select('_id');
  if (!board) return next(new AppError('Board not found', 404));

  const cards = await Card.find({ board: req.params.id, isArchived: true })
    .populate('list', 'name')
    .populate('assignees', 'name email avatar')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, data: cards });
});

// @desc  Star or unstar a board for the current user
// @route PATCH /api/boards/:id/star
exports.toggleStar = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id);
  if (!board) return next(new AppError('Board not found', 404));

  const userId   = req.user._id.toString();
  const idx      = board.starredBy.findIndex((id) => id.toString() === userId);
  const isStarred = idx > -1;

  if (isStarred) board.starredBy.splice(idx, 1);
  else           board.starredBy.push(req.user._id);

  await board.save();

  res.status(200).json({
    success:   true,
    isStarred: !isStarred,
    data: { _id: board._id, starredBy: board.starredBy },
  });
});
