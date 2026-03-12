const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');


// Public
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

// Private
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe); // middleware protect dùng test accestoken 
router.put('/update-profile', protect,upload.single('avatar'), authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);


module.exports = router;
