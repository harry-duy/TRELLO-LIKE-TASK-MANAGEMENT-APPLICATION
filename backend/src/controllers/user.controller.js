const User = require('../models/user.model');
const Workspace = require('../models/workspace.model');
const Board = require('../models/board.model');
const Card = require('../models/card.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const ADMIN_ROLE = 'admin';

const isLastActiveAdmin = async (targetUserId) => {
  const otherActiveAdmins = await User.countDocuments({
    role: ADMIN_ROLE,
    isActive: true,
    _id: { $ne: targetUserId },
  });

  return otherActiveAdmins === 0;
};

exports.getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.search) {
    const keyword = req.query.search.trim();
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { email: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (req.query.role) {
    query.role = req.query.role;
  }

  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('name email role isActive isEmailVerified avatar createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('name email role isActive isEmailVerified avatar createdAt updatedAt');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  const allowedRoles = ['user', 'staff', 'admin'];

  if (!allowedRoles.includes(role)) {
    return next(new AppError('Invalid role value', 400));
  }

  if (req.user._id.toString() === req.params.id) {
    return next(new AppError('You cannot change your own role', 400));
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    return next(new AppError('User not found', 404));
  }

  if (targetUser.role === ADMIN_ROLE && targetUser.isActive && role !== ADMIN_ROLE) {
    const lastAdmin = await isLastActiveAdmin(targetUser._id);
    if (lastAdmin) {
      return next(new AppError('Cannot modify the last active admin account', 400));
    }
  }

  targetUser.role = role;
  await targetUser.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: {
      id: targetUser._id,
      role: targetUser.role,
    },
  });
});

exports.updateUserStatus = asyncHandler(async (req, res, next) => {
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return next(new AppError('isActive must be a boolean', 400));
  }

  if (req.user._id.toString() === req.params.id && isActive === false) {
    return next(new AppError('You cannot deactivate your own account', 400));
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    return next(new AppError('User not found', 404));
  }

  if (targetUser.role === ADMIN_ROLE && targetUser.isActive === true && isActive === false) {
    const lastAdmin = await isLastActiveAdmin(targetUser._id);
    if (lastAdmin) {
      return next(new AppError('Cannot modify the last active admin account', 400));
    }
  }

  targetUser.isActive = isActive;
  await targetUser.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      id: targetUser._id,
      isActive: targetUser.isActive,
    },
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  if (req.user._id.toString() === req.params.id) {
    return next(new AppError('You cannot delete your own account', 400));
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    return next(new AppError('User not found', 404));
  }

  if (targetUser.role === ADMIN_ROLE && targetUser.isActive === true) {
    const lastAdmin = await isLastActiveAdmin(targetUser._id);
    if (lastAdmin) {
      return next(new AppError('Cannot modify the last active admin account', 400));
    }
  }

  const [ownedWorkspaces, createdBoards, createdCards] = await Promise.all([
    Workspace.countDocuments({ owner: targetUser._id }),
    Board.countDocuments({ createdBy: targetUser._id }),
    Card.countDocuments({ createdBy: targetUser._id }),
  ]);

  if (ownedWorkspaces > 0 || createdBoards > 0 || createdCards > 0) {
    return next(
      new AppError(
        'Cannot delete user who still owns workspaces/boards/cards. Deactivate account or transfer ownership first.',
        400
      )
    );
  }

  await Promise.all([
    Workspace.updateMany({}, { $pull: { members: { user: targetUser._id } } }),
    Board.updateMany({}, { $pull: { starredBy: targetUser._id } }),
    Card.updateMany({}, { $pull: { assignees: targetUser._id } }),
    Card.updateMany({}, { $pull: { comments: { user: targetUser._id } } }),
    Card.updateMany({}, { $pull: { attachments: { uploadedBy: targetUser._id } } }),
  ]);

  await User.findByIdAndDelete(targetUser._id);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});
