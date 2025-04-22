const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Публічні маршрути (без автентифікації)
router.get('/search', userController.searchUsers);

// Маршрути з автентифікацією
router.get('/', authMiddleware.authenticate, userController.getAllUsers);
router.get('/:id', authMiddleware.authenticate, userController.getUserById);

// Маршрути для адміністраторів
router.post(
    '/',
    authMiddleware.authenticate,
    authMiddleware.authorizeAdmin,
    userController.createUser,
);

// Маршрути з перевіркою прав (користувач може змінювати лише свій обліковий запис)
router.put(
    '/:id',
    authMiddleware.authenticate,
    authMiddleware.authorizeUser,
    userController.updateUser,
);
router.delete(
    '/:id',
    authMiddleware.authenticate,
    authMiddleware.authorizeUser,
    userController.deleteUser,
);

module.exports = router;
