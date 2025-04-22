const userService = require('../services/user.service');
const emailService = require('../services/email.service');

exports.register = async (req, res, next) => {
    try {
        // Перевіряємо чи існує користувач з таким email
        const existingUser = await userService.findByEmail(req.body.email);
        if (existingUser) {
            return res
                .status(409)
                .json({error: 'Користувач з таким email вже існує'});
        }

        // Створюємо нового користувача
        const newUser = await userService.createUser(req.body);

        // Генеруємо JWT токен
        const token = newUser.generateAuthToken();

        // Видаляємо пароль з відповіді
        const user = newUser.toObject();
        delete user.password;
        delete user.resetPasswordToken;
        delete user.resetPasswordExpires;

        res.status(201).json({user, token});
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({error: 'Будь ласка, надайте email та пароль'});
        }

        const authResult = await userService.authenticate(email, password);

        if (!authResult) {
            return res.status(401).json({error: 'Невірний email або пароль'});
        }

        res.json({user: authResult.user, token: authResult.token});
    } catch (error) {
        next(error);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const {email} = req.body;

        if (!email) {
            return res.status(400).json({error: 'Будь ласка, надайте email'});
        }

        const resetToken = await userService.generatePasswordResetToken(email);

        if (!resetToken) {
            return res
                .status(404)
                .json({error: 'Користувача з таким email не знайдено'});
        }

        const resetUrl = `${req.protocol}://${req.get(
            'host',
        )}/reset-password/${resetToken}`;

        // Відправляємо лист для відновлення пароля
        try {
            await emailService.sendPasswordResetEmail(email, resetUrl);
            res.json({
                message:
                    'Лист з інструкціями для відновлення пароля надіслано на вашу пошту',
            });
        } catch (err) {
            return res
                .status(500)
                .json({
                    error: 'Не вдалося відправити лист для відновлення пароля',
                });
        }
    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const {token} = req.params;
        const {password} = req.body;

        if (!password) {
            return res
                .status(400)
                .json({error: 'Будь ласка, надайте новий пароль'});
        }

        const user = await userService.resetPassword(token, password);

        if (!user) {
            return res
                .status(400)
                .json({
                    error: 'Недійсний або прострочений токен для відновлення пароля',
                });
        }

        res.json({message: 'Пароль успішно змінено'});
    } catch (error) {
        next(error);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        // req.user встановлюється в middleware authenticate
        res.json(req.user);
    } catch (error) {
        next(error);
    }
};
