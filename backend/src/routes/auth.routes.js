const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, authSchemas } = require('../middleware/validation.middleware');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
});

// Public routes
router.post('/register', validate(authSchemas.register), authController.register);
router.post('/login', authLimiter, validate(authSchemas.login), authController.login);
router.post('/forgot-password', validate(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password/:token', validate(authSchemas.resetPassword), authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);

module.exports = router;