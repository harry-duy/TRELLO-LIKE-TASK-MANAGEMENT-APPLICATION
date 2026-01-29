const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');

// TODO: Implement user routes
// GET /api/users - Get all users (admin only)
// GET /api/users/:id - Get user by ID
// PUT /api/users/:id - Update user
// DELETE /api/users/:id - Delete user (admin only)

router.get('/', protect, restrictTo('admin'), (req, res) => {
  res.json({ message: 'Get all users - TODO' });
});

module.exports = router;