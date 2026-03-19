const Workspace = require('../models/workspace.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get current user's workspaces
// @route   GET /api/workspaces
// @access  Private
exports.getMyWorkspaces = asyncHandler(async (req, res, next) => {
  const workspaces = await Workspace.findByUser(req.user._id);

  res.status(200).json({
    success: true,
    data: workspaces,
  });
});

// @desc    Create a new workspace
// @route   POST /api/workspaces
// @access  Private
exports.createWorkspace = asyncHandler(async (req, res, next) => {
  const { name, description, visibility } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError('Workspace name is required', 400));
  }

  const workspace = await Workspace.create({
    name: name.trim(),
    description,
    visibility,
    owner: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: workspace,
  });
});

// @desc    Get workspace details
// @route   GET /api/workspaces/:workspaceId
// @access  Private
exports.getWorkspace = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('boards');

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  res.status(200).json({
    success: true,
    data: workspace,
  });
});
