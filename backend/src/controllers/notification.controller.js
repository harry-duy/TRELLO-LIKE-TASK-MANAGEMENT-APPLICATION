// backend/src/controllers/notification.controller.js
const Notification = require('../models/notification.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/notifications — Lấy thông báo của user hiện tại
exports.getNotifications = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const skip  = (page - 1) * limit;
  const onlyUnread = req.query.unread === 'true';

  const filter = { recipient: req.user._id };
  if (onlyUnread) filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// GET /api/notifications/unread-count — Đếm chưa đọc (dùng cho badge)
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead:    false,
  });
  res.status(200).json({ success: true, data: { count } });
});

// PATCH /api/notifications/:id/read — Đánh dấu 1 thông báo đã đọc
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notif = await Notification.findOne({
    _id:       req.params.id,
    recipient: req.user._id,
  });
  if (!notif) return next(new AppError('Notification not found', 404));

  notif.isRead = true;
  await notif.save();

  res.status(200).json({ success: true, data: notif });
});

// PATCH /api/notifications/read-all — Đánh dấu tất cả đã đọc
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

// DELETE /api/notifications/:id — Xoá 1 thông báo
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notif = await Notification.findOneAndDelete({
    _id:       req.params.id,
    recipient: req.user._id,
  });
  if (!notif) return next(new AppError('Notification not found', 404));

  res.status(200).json({ success: true, message: 'Notification deleted' });
});

// DELETE /api/notifications — Xoá tất cả
exports.clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  res.status(200).json({ success: true, message: 'All notifications cleared' });
});