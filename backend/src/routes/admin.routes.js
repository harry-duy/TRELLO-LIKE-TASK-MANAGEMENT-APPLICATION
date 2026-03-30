const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect, restrictTo('admin'));

router.get('/workspaces', adminController.getAllWorkspaces);
router.get('/workspaces/:workspaceId', adminController.getWorkspaceById);
router.post('/workspaces/:workspaceId/members', adminController.addWorkspaceMember);
router.delete('/workspaces/:workspaceId/members/:userId', adminController.removeWorkspaceMember);
router.delete('/workspaces/:workspaceId', adminController.deleteWorkspace);

router.get('/boards', adminController.getAllBoards);
router.get('/boards/:boardId', adminController.getBoardById);
router.patch('/boards/:boardId/status', adminController.updateBoardStatus);
router.delete('/boards/:boardId', adminController.deleteBoard);

router.get('/analytics/overview', adminController.getSystemOverview);
router.get('/analytics/trends', adminController.getSystemTrends);
router.get('/analytics/ai-usage', adminController.getAIUsageStats);
router.get('/activities', adminController.getSystemActivities);
router.get('/system-resources', adminController.getSystemResources);

module.exports = router;
