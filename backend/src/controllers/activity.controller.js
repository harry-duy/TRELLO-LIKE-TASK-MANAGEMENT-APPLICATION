const mongoose = require('mongoose');
const Activity  = require('../models/activity.model');
const Board     = require('../models/board.model');
const Card      = require('../models/card.model');
const Workspace = require('../models/workspace.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Shared helper – reused across multiple controllers
const ensureBoardAccess = async (boardId, user) => {
  const board = await Board.findById(boardId).select('workspace');
  if (!board) throw new AppError('Board not found', 404);
  if (user.role === 'admin') return board;
  const workspace = await Workspace.findById(board.workspace).select('owner members');
  if (!workspace) throw new AppError('Workspace not found', 404);
  const isOwner  = workspace.owner?.toString() === user._id.toString();
  const isMember = (workspace.members || []).some((m) => m.user?.toString() === user._id.toString());
  if (!isOwner && !isMember) throw new AppError('You do not have access to this board', 403);
  return board;
};

const ensureWorkspaceAccess = async (workspaceId, user) => {
  if (user.role === 'admin') return;
  const workspace = await Workspace.findById(workspaceId).select('owner members');
  if (!workspace) throw new AppError('Workspace not found', 404);
  const isOwner  = workspace.owner?.toString() === user._id.toString();
  const isMember = (workspace.members || []).some((m) => m.user?.toString() === user._id.toString());
  if (!isOwner && !isMember) throw new AppError('You do not have access to this workspace', 403);
};

// @desc    Get board activities (paginated)
// @route   GET /api/activities/board/:boardId
exports.getBoardActivities = asyncHandler(async (req, res, next) => {
  const { boardId } = req.params;
  await ensureBoardAccess(boardId, req.user);

  const page  = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const skip  = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    Activity.find({ board: boardId })
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Activity.countDocuments({ board: boardId }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// @desc    Get workspace activities (paginated)
// @route   GET /api/activities/workspace/:workspaceId
exports.getWorkspaceActivities = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  await ensureWorkspaceAccess(workspaceId, req.user);

  const page  = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const skip  = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    Activity.find({ workspace: workspaceId })
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Activity.countDocuments({ workspace: workspaceId }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// @desc    Get card activities
// @route   GET /api/activities/card/:cardId
exports.getCardActivities = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.cardId).select('board');
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);

  const activities = await Activity.getCardActivities(req.params.cardId);
  res.status(200).json({ success: true, data: activities });
});

// @desc    Workspace analytics (completion trend + user performance)
// @route   GET /api/activities/analytics/:workspaceId
exports.getWorkspaceAnalytics = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  await ensureWorkspaceAccess(workspaceId, req.user);

  const days  = Math.min(Math.max(parseInt(req.query.days || '7', 10), 1), 90);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  // ── Completion trend ────────────────────────────────────────────────
  const rawTrend = await Activity.aggregate([
    {
      $match: {
        workspace: new mongoose.Types.ObjectId(workspaceId),
        action: 'card_completed',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const trendMap = new Map(rawTrend.map((item) => [item._id, item.count]));
  const completionTrend = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    completionTrend.push({ date: key, count: trendMap.get(key) || 0 });
  }

  // ── User performance ────────────────────────────────────────────────
  const userPerformance = await Activity.aggregate([
    {
      $match: {
        workspace: new mongoose.Types.ObjectId(workspaceId),
        action: 'card_completed',
        createdAt: { $gte: startDate },
      },
    },
    { $group: { _id: '$actor', completedCount: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
    { $unwind: '$userInfo' },
    {
      $project: {
        name:  '$userInfo.name',
        email: '$userInfo.email',
        count: '$completedCount',
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: { days, completionTrend, userPerformance },
  });
});
