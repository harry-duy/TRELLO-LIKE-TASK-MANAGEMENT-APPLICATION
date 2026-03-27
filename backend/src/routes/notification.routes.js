// backend/src/routes/notification.routes.js
const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth.middleware');
const notifCtrl  = require('../controllers/notification.controller');

router.use(protect);

router.get('/',                    notifCtrl.getNotifications);
router.get('/unread-count',        notifCtrl.getUnreadCount);
router.patch('/read-all',          notifCtrl.markAllAsRead);
router.delete('/',                 notifCtrl.clearAll);
router.patch('/:id/read',          notifCtrl.markAsRead);
router.delete('/:id',              notifCtrl.deleteNotification);

module.exports = router;