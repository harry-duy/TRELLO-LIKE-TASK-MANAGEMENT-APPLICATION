const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { protect } = require('../middleware/auth.middleware');

// Get activities
router.get('/board/:boardId', protect, activityController.getBoardActivities);
router.get('/workspace/:workspaceId', protect, activityController.getWorkspaceActivities);
router.get('/card/:cardId', protect, activityController.getCardActivities);

module.exports = router;