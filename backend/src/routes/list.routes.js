const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// TODO: Implement list routes

router.get('/', protect, (req, res) => {
  res.json({ message: 'Get all lists - TODO' });
});

module.exports = router;