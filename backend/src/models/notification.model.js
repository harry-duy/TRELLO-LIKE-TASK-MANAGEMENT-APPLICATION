// backend/src/models/notification.model.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Người nhận thông báo
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Người thực hiện hành động
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Loại thông báo
    type: {
      type: String,
      required: true,
      enum: [
        'member_added_workspace',  // Được thêm vào workspace
        'member_added_card',       // Được giao vào card
        'member_removed_workspace',// Bị kick khỏi workspace
        'member_removed_card',     // Bị bỏ khỏi card
        'board_updated',           // Board thuộc workspace mình bị cập nhật
        'card_created',            // Card mới trong board mình tham gia
        'card_updated',            // Card mình được giao bị cập nhật
        'card_moved',              // Card mình được giao bị di chuyển
        'card_completed',          // Card mình được giao được đánh dấu xong
        'comment_added',           // Có comment mới trên card mình được giao
        'workspace_updated',       // Workspace mình tham gia bị cập nhật
      ],
    },
    // Tiêu đề hiển thị
    title: { type: String, required: true },
    // Nội dung chi tiết
    message: { type: String, required: true },
    // Link điều hướng khi bấm vào
    link: { type: String, default: null },
    // Đã đọc chưa
    isRead: { type: Boolean, default: false, index: true },
    // Metadata thêm
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Index để query nhanh
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// Static: tạo thông báo (swallow lỗi để không ảnh hưởng main flow)
notificationSchema.statics.create_safe = async function (data) {
  try {
    return await this.create(data);
  } catch (err) {
    console.error('[Notification] create_safe error:', err.message);
    return null;
  }
};

// Static: tạo nhiều thông báo cùng lúc
notificationSchema.statics.create_many = async function (list) {
  try {
    if (!list || list.length === 0) return [];
    return await this.insertMany(list);
  } catch (err) {
    console.error('[Notification] create_many error:', err.message);
    return [];
  }
};

module.exports = mongoose.model('Notification', notificationSchema);