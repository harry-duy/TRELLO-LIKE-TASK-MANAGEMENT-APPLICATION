const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// TODO: Implement card routes

router.get('/', protect, (req, res) => {
  res.json({ message: 'Get all cards - TODO' });
});

module.exports = router;