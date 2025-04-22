require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Підключення до бази даних
connectDB();

// Middleware
app.use(morgan('dev'));
app.use(express.json());

// Маршрути
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Swagger документації API
setupSwagger(app);

// Обробка помилок
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер працює на http://localhost:${PORT}`);
});
