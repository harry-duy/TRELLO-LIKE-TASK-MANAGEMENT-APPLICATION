const jwt = require('jsonwebtoken');
const { asyncHandler } = require('./errorHandler');
const { AppError } = require('./errorHandler');
const User = require('../models/user.model');

// Protect routes - require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Or check in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return next(new AppError('User not found', 401));
    }

    // Check if user is active
    if (!req.user.isActive) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
});

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Check if user is workspace member
const isWorkspaceMember = asyncHandler(async (req, res, next) => {
  const workspaceId = req.params.workspaceId || req.body.workspaceId;
  
  const Workspace = require('../models/workspace.model');
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  // Check if user is member or owner
  const isMember = workspace.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember && workspace.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not a member of this workspace', 403));
  }

  req.workspace = workspace;
  next();
});

// Check if user is board member
const isBoardMember = asyncHandler(async (req, res, next) => {
  const boardId = req.params.boardId || req.params.id;
  
  const Board = require('../models/board.model');
  const board = await Board.findById(boardId).populate('workspace');

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if user is workspace member
  const workspace = board.workspace;
  const isMember = workspace.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember && workspace.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have access to this board', 403));
  }

  req.board = board;
  req.workspace = workspace;
  next();
});

// Check workspace permission level
const checkWorkspacePermission = (requiredRole) => {
  return asyncHandler(async (req, res, next) => {
    const workspace = req.workspace;
    const userId = req.user._id.toString();

    // Owner has all permissions
    if (workspace.owner.toString() === userId) {
      return next();
    }

    // Check member role
    const member = workspace.members.find(
      (m) => m.user.toString() === userId
    );

    if (!member) {
      return next(new AppError('You are not a member of this workspace', 403));
    }

    const roleHierarchy = { admin: 2, member: 1 };
    const memberLevel = roleHierarchy[member.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (memberLevel < requiredLevel) {
      return next(
        new AppError('You do not have sufficient permissions', 403)
      );
    }

    next();
  });
};

module.exports = {
  protect,
  restrictTo,
  isWorkspaceMember,
  isBoardMember,
  checkWorkspacePermission,
};