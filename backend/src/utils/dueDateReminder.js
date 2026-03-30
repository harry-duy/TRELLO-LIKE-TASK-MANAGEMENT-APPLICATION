// backend/src/utils/dueDateReminder.js
// Cron job: mỗi giờ quét các card sắp đến hạn (trong 24h tới)
// và gửi notification cho assignees + watchers nếu chưa gửi hôm nay.

const cron    = require('node-cron');
const Card    = require('../models/card.model');
const notify  = require('./notifyHelper');

const SENT_KEY = Symbol('dueDateReminderSent');

async function runDueDateReminder(io) {
  try {
    const now     = new Date();
    const in24h   = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Cards chưa hoàn thành, chưa archived, due trong 24h tới
    const cards = await Card.find({
      isArchived:   false,
      isCompleted:  false,
      dueDate:      { $gte: now, $lte: in24h },
    }).populate('assignees', 'name email _id')
      .populate('watchers',  'name email _id')
      .select('title board dueDate assignees watchers');

    for (const card of cards) {
      const recipients = [
        ...card.assignees.map(u => u._id),
        ...card.watchers.map(u => u._id),
      ];
      if (!recipients.length) continue;

      const minutesLeft = Math.round((card.dueDate - now) / 60000);
      const hoursLeft   = Math.round(minutesLeft / 60);
      const timeLabel   = hoursLeft <= 1 ? 'trong vòng 1 giờ' : `trong ${hoursLeft} giờ`;
      const timeLabelEn = hoursLeft <= 1 ? 'within 1 hour' : `in ${hoursLeft} hours`;

      await notify(io, {
        actor:      null,
        recipients,
        type:       'due_date_reminder',
        title:      `⏰ Card sắp đến hạn`,
        message:    `"${card.title}" sẽ đến hạn ${timeLabel}.`,
        link:       `/board/${card.board}`,
        metadata:   {
          cardId:    card._id,
          cardTitle: card.title,
          boardId:   card.board,
          dueDate:   card.dueDate,
          hoursLeft,
        },
      });
    }

    if (cards.length) {
      console.log(`[dueDateReminder] Sent reminders for ${cards.length} card(s).`);
    }
  } catch (err) {
    console.error('[dueDateReminder] Error:', err.message);
  }
}

/**
 * Khởi động cron job nhắc nhở due date.
 * @param {Object} io - Socket.io server instance
 */
function startDueDateReminder(io) {
  // Chạy mỗi giờ vào phút 0 (00:00, 01:00, 02:00, ...)
  cron.schedule('0 * * * *', () => {
    runDueDateReminder(io);
  });

  console.log('[dueDateReminder] Cron job started (every hour at :00).');
}

module.exports = { startDueDateReminder, runDueDateReminder };
