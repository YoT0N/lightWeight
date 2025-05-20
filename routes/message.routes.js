const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Всі маршрути потребують аутентифікації
router.use(authMiddleware.authenticate);

// Отримання історії загального чату
router.get('/public', messageController.getPublicMessages);

// Отримання історії приватних повідомлень з певним користувачем
router.get('/private/:userId', messageController.getPrivateMessages);

// Отримання списку користувачів з непрочитаними повідомленнями
router.get('/unread', messageController.getUnreadMessages);

// Позначення повідомлення як прочитане
router.put('/:messageId/read', messageController.markAsRead);

module.exports = router;
