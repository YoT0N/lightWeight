const userService = require('../services/user.service');

exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error) {
        next(error);
    }
};

exports.getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({error: 'Користувач не знайдений'});
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.createUser = async (req, res, next) => {
    try {
        // Перевіряємо чи є користувач адміністратором для встановлення ролі
        if (
            req.body.role === 'admin' &&
            (!req.user || req.user.role !== 'admin')
        ) {
            return res
                .status(403)
                .json({
                    error: 'Тільки адміністратор може створювати адміністраторів',
                });
        }

        const newUser = await userService.createUser(req.body);

        // Видаляємо пароль та токени з відповіді
        const user = newUser.toObject();
        delete user.password;
        delete user.resetPasswordToken;
        delete user.resetPasswordExpires;

        res.status(201).json(user);
    } catch (error) {
        if (error.code === 11000) {
            error.message = 'Користувач з таким email вже існує';
        }
        next(error);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        // Перевіряємо чи намагається не-адмін змінити роль
        if (req.body.role && (!req.user || req.user.role !== 'admin')) {
            return res
                .status(403)
                .json({
                    error: 'Тільки адміністратор може змінювати ролі користувачів',
                });
        }

        const user = await userService.updateUser(req.params.id, req.body);
        if (!user) {
            return res.status(404).json({error: 'Користувач не знайдений'});
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const user = await userService.deleteUser(req.params.id);
        if (!user) {
            return res.status(404).json({error: 'Користувач не знайдений'});
        }
        res.json({message: 'Користувач успішно видалений'});
    } catch (error) {
        next(error);
    }
};

exports.searchUsers = async (req, res, next) => {
    try {
        const users = await userService.searchUsers(req.query);
        res.json(users);
    } catch (error) {
        next(error);
    }
};
