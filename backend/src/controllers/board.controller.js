const Board = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const Activity = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

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
