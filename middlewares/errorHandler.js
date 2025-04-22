function errorHandler(err, req, res, next) {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Помилка валідації',
            details: err.errors,
        });
    }

    // Обробка duplicate key errors
    if (err.code === 11000) {
        return res.status(409).json({
            error: 'Конфлікт даних',
            message: 'Користувач з таким email вже існує',
        });
    }

    res.status(500).json({
        error: 'Внутрішня помилка сервера',
        message: err.message || 'Щось пішло не так',
    });
}

module.exports = errorHandler;
