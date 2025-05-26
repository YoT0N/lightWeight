const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Всі маршрути потребують автентифікації
router.use(authMiddleware.authenticate);

// Отримати публічні повідомлення
router.get('/public', messageController.getPublicMessages);

// Отримати приватні повідомлення з конкретним користувачем
router.get('/private/:userId', messageController.getPrivateMessages);

// Отримати список розмов користувача
router.get('/conversations', messageController.getUserConversations);

// Видалити повідомлення
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
