require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const messageRoutes = require('./routes/message.routes');
const webRoutes = require('./routes/web.routes');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./swagger');
const socketService = require('./services/socetio.service');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const PORT = process.env.PORT || 3000;

// Підключення до бази даних
connectDB();

// Налаштування EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Ініціалізація Socket.IO
socketService.init(io);

// Маршрути API
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

// Web маршрути
app.use('/', webRoutes);

// Swagger документації API
setupSwagger(app);

// Обробка помилок
app.use(errorHandler);

// Запуск сервера
server.listen(PORT, () => {
    console.log(`Сервер працює на http://localhost:${PORT}`);
    console.log(
        `Swagger документація доступна на http://localhost:${PORT}/api-docs`,
    );
});
