// backend/src/utils/notifyHelper.js
// Helper tập trung — mọi nơi gọi hàm này để tạo + emit thông báo

const Notification = require('../models/notification.model');

/**
 * Tạo thông báo và emit socket real-time
 * @param {Object} io        - Socket.io server instance
 * @param {Object} params
 * @param {string|ObjectId}  params.actor      - Người thực hiện
 * @param {string[]|ObjectId[]} params.recipients - Người nhận (mảng)
 * @param {string}  params.type     - Loại thông báo
 * @param {string}  params.title
 * @param {string}  params.message
 * @param {string}  [params.link]
 * @param {Object}  [params.metadata]
 */
const notify = async (io, { actor, recipients, type, title, message, link = null, metadata = {} }) => {
  try {
    if (!recipients || recipients.length === 0) return;

    const actorId = actor?.toString();

    // Lọc: không gửi thông báo cho chính mình
    const validRecipients = recipients
      .map((r) => r?.toString())
      .filter((r) => r && r !== actorId);

    if (validRecipients.length === 0) return;

    // Tạo notification docs
    const docs = validRecipients.map((recipientId) => ({
      recipient: recipientId,
      actor,
      type,
      title,
      message,
      link,
      metadata,
      isRead: false,
    }));

    const created = await Notification.insertMany(docs);

    // Emit real-time qua socket nếu có io
    if (io) {
      for (const notif of created) {
        // Mỗi user join room 'user:<id>' khi connect
        io.to(`user:${notif.recipient.toString()}`).emit('notification:new', {
          _id:       notif._id,
          type:      notif.type,
          title:     notif.title,
          message:   notif.message,
          link:      notif.link,
          isRead:    false,
          createdAt: notif.createdAt,
          actor:     { _id: actor },
        });
      }
    }

    return created;
  } catch (err) {
    console.error('[notifyHelper] error:', err.message);
    return [];
  }
};

module.exports = notify;