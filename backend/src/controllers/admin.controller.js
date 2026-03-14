const Workspace = require('../models/workspace.model');
const Board = require('../models/board.model');
const User = require('../models/user.model');
const Card = require('../models/card.model');
const Activity = require('../models/activity.model');
const AIUsage = require('../models/aiUsage.model');
const fs = require('fs/promises');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

exports.getAllWorkspaces = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.search) {
    const keyword = req.query.search.trim();
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (req.query.visibility) {
    query.visibility = req.query.visibility;
  }

  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  }

  const workspaces = await Workspace.find(query)
    .populate('owner', 'name email role isActive')
    .populate('members.user', 'name email role isActive')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    data: workspaces,
  });
});

exports.getWorkspaceById = asyncHandler(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId)
    .populate('owner', 'name email role isActive')
    .populate('members.user', 'name email role isActive')
    .populate('boards');

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  res.status(200).json({
    success: true,
    data: workspace,
  });
});

exports.addWorkspaceMember = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { userId, role } = req.body;

  if (!userId) {
    return next(new AppError('userId is required', 400));
  }

  const memberRole = role || 'member';
  if (!['admin', 'member'].includes(memberRole)) {
    return next(new AppError('Invalid workspace member role', 400));
  }

  const [workspace, user] = await Promise.all([
    Workspace.findById(workspaceId),
    User.findById(userId).select('name email role isActive'),
  ]);

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const existingMember = workspace.members.find(
    (member) => member.user.toString() === userId
  );

  if (existingMember) {
    existingMember.role = memberRole;
  } else {
    workspace.members.push({
      user: userId,
      role: memberRole,
    });
  }

  await workspace.save();

  const updatedWorkspace = await Workspace.findById(workspaceId)
    .populate('owner', 'name email role isActive')
    .populate('members.user', 'name email role isActive');

  res.status(200).json({
    success: true,
    message: existingMember
      ? 'Workspace member role updated successfully'
      : 'Workspace member added successfully',
    data: updatedWorkspace,
  });
});

exports.removeWorkspaceMember = asyncHandler(async (req, res, next) => {
  const { workspaceId, userId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  if (workspace.owner.toString() === userId) {
    return next(new AppError('Cannot remove workspace owner', 400));
  }

  const memberIndex = workspace.members.findIndex(
    (member) => member.user.toString() === userId
  );

  if (memberIndex === -1) {
    return next(new AppError('User is not a workspace member', 404));
  }

  workspace.members.splice(memberIndex, 1);
  await workspace.save();

  res.status(200).json({
    success: true,
    message: 'Workspace member removed successfully',
  });
});

exports.getAllBoards = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.workspaceId) {
    query.workspace = req.query.workspaceId;
  }

  if (req.query.isClosed !== undefined) {
    query.isClosed = req.query.isClosed === 'true';
  }

  if (req.query.search) {
    const keyword = req.query.search.trim();
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
  }

  const boards = await Board.find(query)
    .populate('workspace', 'name visibility isActive owner')
    .populate('createdBy', 'name email role isActive')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    data: boards,
  });
});

exports.getBoardById = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.boardId)
    .populate('workspace', 'name visibility isActive owner members')
    .populate('createdBy', 'name email role isActive')
    .populate({
      path: 'lists',
      populate: { path: 'cards' },
    });

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  res.status(200).json({
    success: true,
    data: board,
  });
});

exports.updateBoardStatus = asyncHandler(async (req, res, next) => {
  const { boardId } = req.params;
  const { isClosed } = req.body;

  if (typeof isClosed !== 'boolean') {
    return next(new AppError('isClosed must be a boolean', 400));
  }

  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  board.isClosed = isClosed;
  await board.save();

  res.status(200).json({
    success: true,
    message: `Board ${isClosed ? 'closed' : 'reopened'} successfully`,
    data: board,
  });
});

exports.getSystemOverview = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalWorkspaces,
    activeWorkspaces,
    totalBoards,
    openBoards,
    totalCards,
    completedCards,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Workspace.countDocuments(),
    Workspace.countDocuments({ isActive: true }),
    Board.countDocuments(),
    Board.countDocuments({ isClosed: false }),
    Card.countDocuments(),
    Card.countDocuments({ isCompleted: true }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      totalWorkspaces,
      activeWorkspaces,
      totalBoards,
      openBoards,
      totalCards,
      completedCards,
    },
  });
});

exports.getSystemTrends = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days || '7', 10), 1), 30);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const completionTrend = await Activity.aggregate([
    {
      $match: {
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

  const trendMap = new Map(completionTrend.map((item) => [item._id, item.count]));
  const filledTrend = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    filledTrend.push({
      date: dateKey,
      count: trendMap.get(dateKey) || 0,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      days,
      completionTrend: filledTrend,
    },
  });
});

exports.getSystemActivities = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.action) {
    query.action = req.query.action;
  }

  const [activities, total] = await Promise.all([
    Activity.find(query)
      .populate('actor', 'name email')
      .populate('workspace', 'name')
      .populate('board', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Activity.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

exports.getAIUsageStats = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days || '30', 10), 1), 90);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const [totals, byFeature, byUser, recent] = await Promise.all([
    AIUsage.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          successCalls: {
            $sum: {
              $cond: [{ $in: ['$status', ['success', 'fallback']] }, 1, 0],
            },
          },
          totalTokens: { $sum: '$totalTokens' },
        },
      },
    ]),
    AIUsage.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$feature',
          count: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          avgLatencyMs: { $avg: '$latencyMs' },
        },
      },
      { $sort: { count: -1 } },
    ]),
    AIUsage.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$user',
          calls: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          lastUsedAt: { $max: '$createdAt' },
        },
      },
      { $sort: { calls: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          calls: 1,
          totalTokens: 1,
          lastUsedAt: 1,
          name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown'] },
          email: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, null] },
        },
      },
    ]),
    AIUsage.find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email')
      .select('feature status createdAt user totalTokens latencyMs'),
  ]);

  const summary = totals[0] || { totalCalls: 0, successCalls: 0, totalTokens: 0 };
  const successRate =
    summary.totalCalls > 0 ? Number(((summary.successCalls / summary.totalCalls) * 100).toFixed(2)) : 0;

  res.status(200).json({
    success: true,
    data: {
      days,
      summary: {
        totalCalls: summary.totalCalls,
        successCalls: summary.successCalls,
        failedCalls: summary.totalCalls - summary.successCalls,
        totalTokens: summary.totalTokens,
        successRate,
      },
      byFeature,
      byUser,
      recent,
    },
  });
});

exports.getSystemResources = asyncHandler(async (req, res) => {
  const maxFileSizeBytes = parseInt(process.env.MAX_FILE_SIZE || String(5 * 1024 * 1024), 10);

  let cloudinaryStatus = {
    configured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    usage: null,
    error: null,
  };

  if (cloudinaryStatus.configured) {
    try {
      const usage = await cloudinary.api.usage();
      cloudinaryStatus.usage = {
        credits: usage.credits,
        objects: usage.objects,
        bandwidth: usage.bandwidth,
        storage: usage.storage,
      };
    } catch (error) {
      cloudinaryStatus.error = error.message;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      uploadPolicy: {
        maxFileSizeBytes,
        maxFileSizeMB: Number((maxFileSizeBytes / (1024 * 1024)).toFixed(2)),
        allowedMimeTypes: ['image/*', 'application/pdf'],
        allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
      },
      cloudinary: cloudinaryStatus,
    },
  });
});

exports.getSystemLogs = asyncHandler(async (req, res, next) => {
  const allowedFiles = new Set(['combined.log', 'error.log', 'exceptions.log', 'rejections.log']);
  const file = req.query.file || 'combined.log';
  const lines = Math.min(Math.max(parseInt(req.query.lines || '200', 10), 1), 2000);

  if (!allowedFiles.has(file)) {
    return next(new AppError('Invalid log file', 400));
  }

  const logPath = path.join(__dirname, '../../logs', file);

  let fileContent = '';
  try {
    fileContent = await fs.readFile(logPath, 'utf8');
  } catch (error) {
    return next(new AppError('Cannot read log file', 500));
  }

  const allLines = fileContent.split(/\r?\n/).filter(Boolean);
  const tailLines = allLines.slice(-lines);

  res.status(200).json({
    success: true,
    data: {
      file,
      lines: tailLines,
      returned: tailLines.length,
      total: allLines.length,
    },
  });
});
