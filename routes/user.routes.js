const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', userController.getAllUsers);
router.get('/search', userController.searchUsers);
router.get('/:id', userController.getUserById);
router.post('/', authMiddleware.checkAuthToken, userController.createUser);
router.put('/:id', authMiddleware.checkAuthToken, userController.updateUser);
router.delete('/:id', authMiddleware.checkAuthToken, userController.deleteUser);

module.exports = router;
