// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const passport = require('../config/passport');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  message: { success: false, message: 'Too many accounts created from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  message: { success: false, message: 'Too many password reset requests, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const hasGoogleOAuthConfig =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);
const hasFacebookOAuthConfig =
  Boolean(process.env.FACEBOOK_APP_ID) &&
  Boolean(process.env.FACEBOOK_APP_SECRET);

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Helper: sau OAuth thành công → tạo token → redirect frontend
const handleOAuthSuccess = async (req, res, next) => {
  try {
    const user = req.user;
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/oauth-callback?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
};

// ── Email/Password ──────────────────────────────────────────────────────────────
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/forgot-password', passwordLimiter, authController.forgotPassword);
router.post('/reset-password/:token', passwordLimiter, authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);

// ── Google OAuth ────────────────────────────────────────────────────────────────
if (hasGoogleOAuthConfig) {
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
} else {
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured',
    });
  });
  router.get('/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured',
    });
  });
}

// ── Facebook OAuth ──────────────────────────────────────────────────────────────
// Đơn giản hóa: không yêu cầu scope email để tránh lỗi "Invalid Scopes: email"
if (hasFacebookOAuthConfig) {
  router.get(
    '/facebook',
    passport.authenticate('facebook', { session: false })
  );
  router.get('/facebook/callback',
    passport.authenticate('facebook', {
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=facebook_failed`,
      session: false,
    }),
    handleOAuthSuccess
  );
} else {
  router.get('/facebook', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Facebook OAuth is not configured',
    });
  });
  router.get('/facebook/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Facebook OAuth is not configured',
    });
  });
}

module.exports = router;
