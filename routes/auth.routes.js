const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Публічні маршрути (реєстрація, логін, відновлення паролю)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Захищені маршрути (потребують автентифікації)
router.get('/me', authMiddleware.authenticate, authController.getMe);

module.exports = router;
