const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// TODO: Implement board routes

router.get('/', protect, (req, res) => {
  res.json({ message: 'Get all boards - TODO' });
});

module.exports = router;