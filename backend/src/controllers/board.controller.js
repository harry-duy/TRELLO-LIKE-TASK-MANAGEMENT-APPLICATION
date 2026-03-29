// backend/src/controllers/board.controller.js
// ✅ Thêm pagination/filter/sort cho getBoards
// ✅ toggleStar export

const Board     = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const List      = require('../models/list.model');
const Card      = require('../models/card.model');
const Activity  = require('../models/activity.model');
const User      = require('../models/user.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const notify    = require('../utils/notifyHelper');

const getAccessibleWorkspaceIds = async (user) => {
  if (user.role === 'admin') return null;
  const workspaces = await Workspace.find({
    $or: [{ owner: user._id }, { 'members.user': user._id }],
  }).select('_id members owner');

  if (user.role === 'staff') {
    return workspaces.map((w) => w._id);
  }

  const accessibleWorkspaceIds = workspaces
    .filter((w) => {
      if (w.owner?.toString() === user._id.toString()) return true;
      const member = (w.members || []).find((m) => m.user.toString() === user._id.toString());
      return member && ['admin', 'staff'].includes(member.role);
    })
    .map((w) => w._id);

  return accessibleWorkspaceIds;
};

// @desc  Get boards the current user can access (with pagination, filter, sort)
// @route GET /api/boards
exports.getBoards = asyncHandler(async (req, res) => {
  const query = {};
  const accessibleWorkspaceIds = await getAccessibleWorkspaceIds(req.user);
  const userId = req.user._id.toString();

  if (accessibleWorkspaceIds && accessibleWorkspaceIds.length === 0 && req.user.role !== 'user')
    return res.status(200).json({ success: true, data: [], meta: { total: 0 } });

  if (req.user.role === 'user') {
    query['members.user'] = req.user._id;
    if (req.query.workspaceId) {
      query.workspace = req.query.workspaceId;
    }
  } else {
    if (req.query.workspaceId) {
      query.workspace = req.query.workspaceId;
    } else if (accessibleWorkspaceIds) {
      query.workspace = { $in: accessibleWorkspaceIds };
    }

    if (accessibleWorkspaceIds && req.query.workspaceId) {
      const ok = accessibleWorkspaceIds.some((id) => id.toString() === req.query.workspaceId);
      if (!ok) return res.status(200).json({ success: true, data: [], meta: { total: 0 } });
    }
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

  const userId = req.user._id.toString();
  const workspaceMember = workspace.members.find((m) => m.user.toString() === userId);
  const canCreateBoard = req.user.role === 'admin'
    || workspace.owner.toString() === userId
    || (workspaceMember && ['admin', 'staff'].includes(workspaceMember.role));

  if (!canCreateBoard) {
    return next(new AppError('You do not have permission to create boards in this workspace', 403));
  }

  const board = await Board.create({
    name: name.trim(), description, workspace: workspaceId, background, createdBy: req.user._id,
    members: [{ user: req.user._id, role: req.user.role === 'staff' ? 'staff' : 'admin' }],
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
    .populate({
      path: 'lists',
      populate: {
        path: 'cards',
        populate: { path: 'assignees', select: 'name email avatar' },
      },
    });
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
    .populate({
      path: 'lists',
      populate: {
        path: 'cards',
        populate: { path: 'assignees', select: 'name email avatar' },
      },
    });

  res.status(200).json({ success: true, data: updated });
});

// @desc  Delete board
// @route DELETE /api/boards/:id
exports.deleteBoard = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id);
  if (!board) return next(new AppError('Board not found', 404));

  const lists   = await List.find({ board: board._id }).select('_id');
  const listIds = lists.map((l) => l._id);

  await Activity.log({
    actor: req.user._id, action: 'board_deleted',
    target: board._id,  targetType: 'Board',
    board: board._id,   workspace: board.workspace,
  });

  if (listIds.length > 0) {
    await Card.deleteMany({ list: { $in: listIds } });
    await List.deleteMany({ _id: { $in: listIds } });
  }
  await Board.deleteOne({ _id: board._id });

  res.status(200).json({ success: true, message: 'Board deleted successfully', data: { id: board._id } });
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

exports.getBoardMembers = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id)
    .populate('members.user', 'name email avatar role')
    .populate('createdBy', 'name email avatar role');

  if (!board) return next(new AppError('Board not found', 404));

  const members = board.members || [];
  res.status(200).json({ success: true, data: members });
});

exports.addBoardMember = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id).populate('workspace');
  if (!board) return next(new AppError('Board not found', 404));

  const { email, userId, role = 'member' } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail && !userId) {
    return next(new AppError('Email or userId is required', 400));
  }

  if (!['member', 'staff'].includes(role)) {
    return next(new AppError('Role must be member or staff', 400));
  }

  const workspace = await Workspace.findById(board.workspace._id || board.workspace)
    .populate('owner', 'name email avatar role')
    .populate('members.user', 'name email avatar role isActive');

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const actorId = req.user._id.toString();
  const workspaceMember = (workspace.members || []).find((m) => {
    const memberId = (m.user?._id || m.user)?.toString();
    return memberId === actorId;
  });
  const canManage = req.user.role === 'admin'
    || (workspace.owner?._id || workspace.owner).toString() === actorId
    || ['admin', 'staff'].includes(workspaceMember?.role);

  if (!canManage) {
    return next(new AppError('You do not have permission to manage this board', 403));
  }

  const targetUser = userId
    ? await User.findById(userId).select('name email avatar role isActive')
    : await User.findOne({ email: normalizedEmail }).select('name email avatar role isActive');

  if (!targetUser) return next(new AppError('User not found', 404));
  if (!targetUser.isActive) return next(new AppError('This user account is inactive', 400));

  const inWorkspace = (workspace.owner?._id || workspace.owner).toString() === targetUser._id.toString()
    || (workspace.members || []).some((m) => {
      const memberId = (m.user?._id || m.user)?.toString();
      return memberId === targetUser._id.toString();
    });

  if (!inWorkspace) {
    return next(new AppError('User must be a workspace member before being added to the board', 400));
  }

  const existing = (board.members || []).find((m) => m.user.toString() === targetUser._id.toString());
  if (existing) {
    existing.role = role;
  } else {
    board.members.push({ user: targetUser._id, role });
  }

  await board.save();
  const updated = await Board.findById(board._id).populate('members.user', 'name email avatar role');
  res.status(200).json({ success: true, data: updated.members });
});

exports.removeBoardMember = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.id).populate('workspace');
  if (!board) return next(new AppError('Board not found', 404));

  const workspace = await Workspace.findById(board.workspace._id || board.workspace).select('owner members');
  const actorId = req.user._id.toString();
  const workspaceMember = (workspace.members || []).find((m) => m.user.toString() === actorId);
  const canManage = req.user.role === 'admin'
    || workspace.owner.toString() === actorId
    || ['admin', 'staff'].includes(workspaceMember?.role);

  if (!canManage) {
    return next(new AppError('You do not have permission to manage this board', 403));
  }

  const userId = req.params.userId;
  board.members = (board.members || []).filter((m) => m.user.toString() !== userId);
  await board.save();

  res.status(200).json({ success: true, data: { id: userId } });
});
