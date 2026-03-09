const express = require('express');
const router = express.Router();
const { protect, isWorkspaceMember, checkWorkspacePermission } = require('../middleware/auth.middleware');

// TODO: Implement workspace routes
router.post('/', protect, (req, res) => {
  res.json({ message: 'Create workspace - TODO' });
});

router.get('/', protect, (req, res) => {
  res.json({ message: 'Get user workspaces - TODO' });
});

module.exports = router;