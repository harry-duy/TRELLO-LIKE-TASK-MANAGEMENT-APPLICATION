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

// @desc    Lấy dữ liệu thống kê năng suất cho Workspace
// @route   GET /api/activities/analytics/:workspaceId
exports.getWorkspaceAnalytics = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { days = 7 } = req.query; // Mặc định thống kê trong 7 ngày qua

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // 1. Thống kê số thẻ hoàn thành theo ngày
  const completionTrend = await Activity.aggregate([
    {
      $match: {
        workspace: new mongoose.Types.ObjectId(workspaceId),
        action: 'card_completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  // 2. Thống kê hiệu suất theo thành viên (Ai hoàn thành nhiều nhất)
  const userPerformance = await Activity.aggregate([
    {
      $match: {
        workspace: new mongoose.Types.ObjectId(workspaceId),
        action: 'card_completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: "$actor",
        completedCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        name: "$userInfo.name",
        count: "$completedCount"
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      completionTrend,
      userPerformance
    }
  });
});