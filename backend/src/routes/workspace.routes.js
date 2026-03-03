const express = require('express');
const router = express.Router();
const { protect, isWorkspaceMember } = require('../middleware/auth.middleware');
const workspaceController = require('../controllers/workspace.controller');

router.post('/', protect, workspaceController.createWorkspace);
router.get('/', protect, workspaceController.getMyWorkspaces);
router.get('/:workspaceId', protect, isWorkspaceMember, workspaceController.getWorkspace);

module.exports = router;
