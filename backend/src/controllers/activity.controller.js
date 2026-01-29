const Activity = require('../models/activity.model');
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get board activities
// @route   GET /api/activities/board/:boardId
// @access  Private
exports.getBoardActivities = asyncHandler(async (req, res, next) => {
  const { boardId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const activities = await Activity.getBoardActivities(boardId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  const total = await Activity.countDocuments({ board: boardId });

  res.status(200).json({
    success: true,
    data: {
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get workspace activities
// @route   GET /api/activities/workspace/:workspaceId
// @access  Private
exports.getWorkspaceActivities = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const activities = await Activity.getWorkspaceActivities(workspaceId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  const total = await Activity.countDocuments({ workspace: workspaceId });

  res.status(200).json({
    success: true,
    data: {
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get card activities
// @route   GET /api/activities/card/:cardId
// @access  Private
exports.getCardActivities = asyncHandler(async (req, res, next) => {
  const { cardId } = req.params;

  const activities = await Activity.getCardActivities(cardId);

  res.status(200).json({
    success: true,
    data: activities,
  });
});