const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Всі маршрути тут доступні тільки адміністраторам
router.use(authMiddleware.authenticate, authMiddleware.authorizeAdmin);

// Маршрути для адміністрування користувачів
router.get('/users', userController.getAllUsers);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;
