// backend/src/controllers/workspace.controller.js
const Workspace = require('../models/workspace.model');
const Board     = require('../models/board.model');
const List      = require('../models/list.model');
const Card      = require('../models/card.model');
const User      = require('../models/user.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const notify = require('../utils/notifyHelper');
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Owner hoặc workspace-admin (hoặc system admin) */
const isWorkspaceAdmin = (workspace, userId, systemRole) => {
  if (systemRole === 'admin') return true;
  if (workspace.owner.toString() === userId.toString()) return true;
  return workspace.members.some(
    (m) => m.user.toString() === userId.toString() && m.role === 'admin'
  );
};

/** Chỉ owner (hoặc system admin) */
const isWorkspaceOwner = (workspace, userId, systemRole) => {
  if (systemRole === 'admin') return true;
  return workspace.owner.toString() === userId.toString();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY WORKSPACES
// GET /api/workspaces
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyWorkspaces = asyncHandler(async (req, res) => {
  let workspaces;
  if (req.user.role === 'admin') {
    workspaces = await Workspace.find({ isActive: true })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });
  } else {
    workspaces = await Workspace.findByUser(req.user._id);
  }
  res.status(200).json({ success: true, data: workspaces });
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE WORKSPACE
// POST /api/workspaces
// ─────────────────────────────────────────────────────────────────────────────
exports.createWorkspace = asyncHandler(async (req, res, next) => {
  const { name, description, visibility } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError('Workspace name is required', 400));
  }

  const workspace = await Workspace.create({
    name:        name.trim(),
    description: description?.trim(),
    visibility:  visibility || 'private',
    owner:       req.user._id,
  });

  // Populate để trả về đầy đủ
  const populated = await Workspace.findById(workspace._id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

  res.status(201).json({ success: true, data: populated });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET WORKSPACE DETAIL
// GET /api/workspaces/:workspaceId
// ─────────────────────────────────────────────────────────────────────────────
exports.getWorkspace = asyncHandler(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId)
    .populate('owner',          'name email avatar')
    .populate('members.user',   'name email avatar')
    .populate('boards');

  if (!workspace) return next(new AppError('Workspace not found', 404));

  res.status(200).json({ success: true, data: workspace });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE WORKSPACE  ← MỚI
// PUT /api/workspaces/:workspaceId
// Chỉ workspace-admin hoặc owner mới làm được
// ─────────────────────────────────────────────────────────────────────────────
exports.updateWorkspace = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { name, description, visibility } = req.body;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return next(new AppError('Workspace not found', 404));

  // Kiểm tra quyền
  if (!isWorkspaceAdmin(workspace, req.user._id, req.user.role)) {
    return next(
      new AppError('Only workspace owner or admin can update this workspace', 403)
    );
  }

  // Chỉ cập nhật field được gửi lên
  if (name !== undefined) {
    if (!name.trim()) return next(new AppError('Workspace name cannot be empty', 400));
    workspace.name = name.trim();
  }
  if (description !== undefined) {
    workspace.description = description.trim();
  }
  if (visibility !== undefined) {
    if (!['private', 'public'].includes(visibility)) {
      return next(new AppError('Visibility must be private or public', 400));
    }
    workspace.visibility = visibility;
  }

  await workspace.save();

  const updated = await Workspace.findById(workspaceId)
    .populate('owner',        'name email avatar')
    .populate('members.user', 'name email avatar');

  res.status(200).json({
    success: true,
    message: 'Workspace updated successfully',
    data:    updated,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE WORKSPACE  ← MỚI
// DELETE /api/workspaces/:workspaceId
// Chỉ owner (hoặc system admin) mới được xoá
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteWorkspace = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return next(new AppError('Workspace not found', 404));

  // Chỉ owner mới được xoá
  if (!isWorkspaceOwner(workspace, req.user._id, req.user.role)) {
    return next(new AppError('Only workspace owner can delete this workspace', 403));
  }

  // ── Cascade delete: boards → lists → cards ──────────────────────────────
  const boards = await Board.find({ workspace: workspaceId }).select('_id');

  if (boards.length > 0) {
    const boardIds = boards.map((b) => b._id);

    const lists = await List.find({ board: { $in: boardIds } }).select('_id');
    if (lists.length > 0) {
      const listIds = lists.map((l) => l._id);
      await Card.deleteMany({ list: { $in: listIds } });
      await List.deleteMany({ _id: { $in: listIds } });
    }

    await Board.deleteMany({ _id: { $in: boardIds } });
  }

  await Workspace.findByIdAndDelete(workspaceId);

  res.status(200).json({
    success: true,
    message: 'Workspace and all associated data deleted successfully',
    data:    { id: workspaceId },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD MEMBER
// POST /api/workspaces/:workspaceId/members
// ─────────────────────────────────────────────────────────────────────────────
exports.addMember = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { email, role = 'member' } = req.body;

  if (!email?.trim()) return next(new AppError('Email is required', 400));
  if (!['admin', 'member', 'staff'].includes(role)) {
    return next(new AppError('Role must be admin, member, or staff', 400));
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return next(new AppError('Workspace not found', 404));

  if (!isWorkspaceAdmin(workspace, req.user._id, req.user.role)) {
    return next(new AppError('Only workspace owner or admin can add members', 403));
  }

  const targetUser = await User.findOne({ email: email.trim().toLowerCase() })
    .select('name email avatar isActive');
  if (!targetUser)        return next(new AppError('No user found with that email', 404));
  if (!targetUser.isActive) return next(new AppError('This user account is inactive', 400));

  const isOwner = workspace.owner.toString() === targetUser._id.toString();
  if (isOwner) return next(new AppError('User is already the workspace owner', 400));

  const existingIndex = workspace.members.findIndex(
    (m) => m.user.toString() === targetUser._id.toString()
  );

  if (existingIndex !== -1) {
    // Đã là member → cập nhật role
    workspace.members[existingIndex].role = role;
    await workspace.save();
    
    const updated = await Workspace.findById(workspaceId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');
    return res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data:    updated,
    });
  }

  workspace.members.push({ user: targetUser._id, role });
  await workspace.save();

  // Gửi notification cho user được thêm
  const io = req.app?.get?.('io');
  await notify(io, {
    actor:      req.user._id,
    recipients: [targetUser._id],
    type:       'member_added_workspace',
    title:      'Bạn được thêm vào workspace',
    message:    `${req.user.name} đã thêm bạn vào workspace "${workspace.name}" với role ${role}`,
    link:       `/workspace/${workspace._id}`,
    metadata:   { workspaceId: workspace._id, workspaceName: workspace.name, role },
  });

  const updated = await Workspace.findById(workspaceId)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

  res.status(201).json({
    success: true,
    message: 'Member added successfully',
    data:    updated,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE MEMBER
// DELETE /api/workspaces/:workspaceId/members/:userId
// ─────────────────────────────────────────────────────────────────────────────
exports.removeMember = asyncHandler(async (req, res, next) => {
  const { workspaceId, userId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return next(new AppError('Workspace not found', 404));

  if (!isWorkspaceAdmin(workspace, req.user._id, req.user.role)) {
    return next(new AppError('Only workspace owner or admin can remove members', 403));
  }

  if (workspace.owner.toString() === userId) {
    return next(new AppError('Cannot remove the workspace owner', 400));
  }

  const idx = workspace.members.findIndex((m) => m.user.toString() === userId);
  if (idx === -1) return next(new AppError('User is not a workspace member', 404));

  workspace.members.splice(idx, 1);
  await workspace.save();

  
  // Gửi notification cho user bị kick
   const io = req.app?.get?.('io');
  await notify(io, {
    actor:      req.user._id,
    recipients: [userId],
    type:       'member_removed_workspace',
    title:      'Bạn bị xoá khỏi workspace',
    message:    `${req.user.name} đã xoá bạn khỏi workspace "${workspace.name}"`,
    link:       '/dashboard',
    metadata:   { workspaceId, workspaceName: workspace.name },
  });

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    data:    { workspaceId, removedUserId: userId },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE MEMBER ROLE
// PATCH /api/workspaces/:workspaceId/members/:userId/role
// ─────────────────────────────────────────────────────────────────────────────
exports.updateMemberRole = asyncHandler(async (req, res, next) => {
  const { workspaceId, userId } = req.params;
  const { role } = req.body;

  if (!['admin', 'member', 'staff'].includes(role)) {
    return next(new AppError('Role must be admin, member, or staff', 400));
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return next(new AppError('Workspace not found', 404));

  // Chỉ owner mới đổi role
  if (!isWorkspaceOwner(workspace, req.user._id, req.user.role)) {
    return next(new AppError('Only workspace owner can change member roles', 403));
  }

  if (workspace.owner.toString() === userId) {
    return next(new AppError('Cannot change role of workspace owner', 400));
  }

  const member = workspace.members.find((m) => m.user.toString() === userId);
  if (!member) return next(new AppError('User is not a workspace member', 404));

  const oldRole  = member.role;
  member.role    = role;
  await workspace.save();

  res.status(200).json({
    success: true,
    message: `Role updated: ${oldRole} → ${role}`,
    data:    { workspaceId, userId, role },
  });
});

exports.transferOwnership = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { userId } = req.body;

  if (!userId) return next(new AppError('userId is required', 400));

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return next(new AppError('Workspace not found', 404));

  if (!isWorkspaceOwner(workspace, req.user._id, req.user.role)) {
    return next(new AppError('Only workspace owner can transfer ownership', 403));
  }

  if (workspace.owner.toString() === userId) {
    return next(new AppError('User is already the workspace owner', 400));
  }

  const newOwnerMember = workspace.members.find((m) => m.user.toString() === userId);
  if (!newOwnerMember) {
    return next(new AppError('New owner must already be a workspace member', 400));
  }

  const oldOwnerId = workspace.owner.toString();
  workspace.owner = userId;
  newOwnerMember.role = 'admin';

  const oldOwnerMember = workspace.members.find((m) => m.user.toString() === oldOwnerId);
  if (oldOwnerMember) {
    oldOwnerMember.role = 'admin';
  } else {
    workspace.members.push({ user: oldOwnerId, role: 'admin' });
  }

  await workspace.save();

  const updated = await Workspace.findById(workspaceId)
    .populate('owner', 'name email avatar role')
    .populate('members.user', 'name email avatar role');

  res.status(200).json({
    success: true,
    message: 'Workspace ownership transferred successfully',
    data: updated,
  });
});