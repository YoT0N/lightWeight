const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userService = require('../services/user.service');

// Middleware для перевірки автентифікації через cookies або session
const checkAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.authToken || req.session?.authToken;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select(
                '-password -resetPasswordToken -resetPasswordExpires',
            );
            req.user = user;
        }

        next();
    } catch (error) {
        next();
    }
};

// Головна сторінка
router.get('/', checkAuth, (req, res) => {
    res.render('index', {
        title: 'LightWeight App',
        user: req.user,
    });
});

// Сторінка входу
router.get('/login', checkAuth, (req, res) => {
    if (req.user) {
        return res.redirect('/profile');
    }
    res.render('login', {
        title: 'Вхід',
        error: req.query.error,
    });
});

// Обробка форми входу
router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return res.redirect(
                '/login?error=' +
                    encodeURIComponent('Будь ласка, надайте email та пароль'),
            );
        }

        const authResult = await userService.authenticate(email, password);

        if (!authResult) {
            return res.redirect(
                '/login?error=' +
                    encodeURIComponent('Невірний email або пароль'),
            );
        }

        // Встановлюємо cookie з токеном
        res.cookie('authToken', authResult.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 1 день
        });

        res.redirect('/profile');
    } catch (error) {
        res.redirect(
            '/login?error=' + encodeURIComponent('Сталася помилка при вході'),
        );
    }
});

// Сторінка реєстрації
router.get('/register', checkAuth, (req, res) => {
    if (req.user) {
        return res.redirect('/profile');
    }
    res.render('register', {
        title: 'Реєстрація',
        error: req.query.error,
    });
});

// Обробка форми реєстрації
router.post('/register', async (req, res) => {
    try {
        // Перевіряємо чи існує користувач з таким email
        const existingUser = await userService.findByEmail(req.body.email);
        if (existingUser) {
            return res.redirect(
                '/register?error=' +
                    encodeURIComponent('Користувач з таким email вже існує'),
            );
        }

        // Створюємо нового користувача
        const newUser = await userService.createUser(req.body);
        const token = newUser.generateAuthToken();

        // Встановлюємо cookie з токеном
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 1 день
        });

        res.redirect('/profile');
    } catch (error) {
        let errorMessage = 'Сталася помилка при реєстрації';

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(
                (err) => err.message,
            );
            errorMessage = errors.join(', ');
        }

        res.redirect('/register?error=' + encodeURIComponent(errorMessage));
    }
});

// Сторінка профілю (захищена)
router.get('/profile', checkAuth, (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    res.render('profile', {
        title: 'Профіль',
        user: req.user,
    });
});

// Сторінка чату
router.get('/chat', checkAuth, (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    res.render('chat', {
        title: 'Чат',
        user: req.user,
    });
});

// Вихід
router.post('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.redirect('/');
});

module.exports = router;
