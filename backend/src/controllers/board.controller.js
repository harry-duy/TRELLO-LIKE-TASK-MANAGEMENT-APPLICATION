const Board = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const List = require('../models/list.model');
const Card = require('../models/card.model');
const Activity = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const getAccessibleWorkspaceIds = async (user) => {
  if (user.role === 'admin') {
    return null;
  }

  const workspaces = await Workspace.find({
    $or: [{ owner: user._id }, { 'members.user': user._id }],
  }).select('_id');

  return workspaces.map((workspace) => workspace._id);
};

// @desc    Get boards the current user can access
// @route   GET /api/boards
exports.getBoards = asyncHandler(async (req, res) => {
  const query = {};

  const accessibleWorkspaceIds = await getAccessibleWorkspaceIds(req.user);
  if (accessibleWorkspaceIds && accessibleWorkspaceIds.length === 0) {
    return res.status(200).json({ success: true, data: [] });
  }

  if (req.query.workspaceId) {
    query.workspace = req.query.workspaceId;
  } else if (accessibleWorkspaceIds) {
    query.workspace = { $in: accessibleWorkspaceIds };
  }

  if (accessibleWorkspaceIds && req.query.workspaceId) {
    const isAccessible = accessibleWorkspaceIds.some(
      (workspaceId) => workspaceId.toString() === req.query.workspaceId
    );

    if (!isAccessible) {
      return res.status(200).json({ success: true, data: [] });
    }
  }

  if (req.query.isClosed !== undefined) {
    query.isClosed = req.query.isClosed === 'true';
  }

  if (req.query.search?.trim()) {
    const keyword = req.query.search.trim();
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
  }

  const boards = await Board.find(query)
    .populate('workspace', 'name visibility isActive owner members')
    .populate('createdBy', 'name email avatar role')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, data: boards });
});

// @desc    Create new board
// @route   POST /api/boards
exports.createBoard = asyncHandler(async (req, res, next) => {
  const { name, description, workspaceId, background } = req.body;

  if (!name || !workspaceId) {
    return next(new AppError('Board name and workspaceId are required', 400));
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const board = await Board.create({
    name: name.trim(),
    description,
    workspace: workspaceId,
    background,
    createdBy: req.user._id,
  });

  await Activity.log({
    actor: req.user._id,
    action: 'board_created',
    target: board._id,
    targetType: 'Board',
    board: board._id,
    workspace: workspaceId,
  });

  res.status(201).json({ success: true, data: board });
});

// @desc    Get board details
// @route   GET /api/boards/:id
exports.getBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id)
    .populate('workspace')
    .populate({
      path: 'lists',
      populate: { path: 'cards' },
    });

  if (!board) return next(new AppError('Board not found', 404));

  res.status(200).json({ success: true, data: board });
});

// @desc    Update board details
// @route   PUT /api/boards/:id
exports.updateBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const allowedFields = ['name', 'description', 'background', 'isClosed'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] =
        field === 'name' && typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
    }
  });

  if (updates.name === '') {
    return next(new AppError('Board name cannot be empty', 400));
  }

  Object.assign(board, updates);
  await board.save();

  await Activity.log({
    actor: req.user._id,
    action: 'board_updated',
    target: board._id,
    targetType: 'Board',
    board: board._id,
    workspace: board.workspace,
    metadata: updates,
  });

  const updatedBoard = await Board.findById(board._id)
    .populate('workspace')
    .populate({
      path: 'lists',
      populate: { path: 'cards' },
    });

  res.status(200).json({ success: true, data: updatedBoard });
});

// @desc    Delete board
// @route   DELETE /api/boards/:id
exports.deleteBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const lists = await List.find({ board: board._id }).select('_id');
  const listIds = lists.map((list) => list._id);

  await Activity.log({
    actor: req.user._id,
    action: 'board_deleted',
    target: board._id,
    targetType: 'Board',
    board: board._id,
    workspace: board.workspace,
  });

  if (listIds.length > 0) {
    await Card.deleteMany({ list: { $in: listIds } });
    await List.deleteMany({ _id: { $in: listIds } });
  }

  await Board.deleteOne({ _id: board._id });

  res.status(200).json({
    success: true,
    message: 'Board deleted successfully',
    data: { id: board._id },
  });
});
