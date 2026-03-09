// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Helper: sau OAuth thành công → tạo token → redirect frontend
const handleOAuthSuccess = (req, res) => {
  const user = req.user;
  const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/oauth-callback?token=${accessToken}`);
};

// ── Email/Password ──────────────────────────────────────────────────────────────
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);

// ── Google OAuth ────────────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_failed`,
    session: false,
  }),
  handleOAuthSuccess
);

// ── Facebook OAuth ──────────────────────────────────────────────────────────────
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email', 'public_profile'], session: false })
);
router.get('/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=facebook_failed`,
    session: false,
  }),
  handleOAuthSuccess
);

module.exports = router;