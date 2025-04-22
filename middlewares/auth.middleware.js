const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
    try {
        // Отримуємо токен з заголовка
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res
                .status(401)
                .json({error: 'Доступ заборонено. Токен не надано'});
        }

        const token = authHeader.replace('Bearer ', '');

        // Перевіряємо токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Знаходимо користувача
        const user = await User.findById(decoded.id).select(
            '-password -resetPasswordToken -resetPasswordExpires',
        );

        if (!user) {
            return res.status(401).json({error: 'Користувача не знайдено'});
        }

        // Додаємо користувача до запиту
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({error: 'Недійсний токен авторизації'});
    }
};

exports.authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            error: 'Доступ заборонено. Необхідні права адміністратора',
        });
    }
};

exports.authorizeUser = (req, res, next) => {
    // Перевіряємо чи користувач намагається отримати доступ до своїх даних
    // або чи має права адміністратора
    if (
        req.user &&
        (req.user.role === 'admin' || req.user._id.toString() === req.params.id)
    ) {
        next();
    } else {
        res.status(403).json({
            error: 'Доступ заборонено. Ви можете керувати лише своїм обліковим записом',
        });
    }
};
