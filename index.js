require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const messageRoutes = require('./routes/message.routes');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./swagger');
const socketSetup = require('./sockets');

const app = express();
const PORT = process.env.PORT || 3000;

// Створення HTTP сервера
const server = http.createServer(app);

// Ініціалізація Socket.IO
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Підключення до бази даних
connectDB();

// Middleware
app.use(morgan('dev'));
app.use(express.json());

// Передаємо io в req для використання в маршрутах
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Маршрути
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

// Swagger документації API
setupSwagger(app);

// Налаштування WebSocket
socketSetup(io);

// Обробка помилок
app.use(errorHandler);

// Запуск сервера
server.listen(PORT, () => {
    console.log(`Сервер працює на http://localhost:${PORT}`);
});
