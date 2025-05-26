const jwt = require('jsonwebtoken');
const User = require('../models/User');
const messageService = require('./message.service');

class SocketService {
    constructor() {
        this.connectedUsers = new Map(); // userId -> socketId
        this.userSockets = new Map(); // socketId -> userId
    }

    init(io) {
        this.io = io;

        // Middleware для автентифікації
        io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Токен не надано'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select(
                    '-password -resetPasswordToken -resetPasswordExpires',
                );

                if (!user) {
                    return next(new Error('Користувача не знайдено'));
                }

                socket.user = user;
                next();
            } catch (error) {
                next(new Error('Недійсний токен'));
            }
        });

        io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    handleConnection(socket) {
        const user = socket.user;

        // Зберігаємо з'єднання
        this.connectedUsers.set(user._id.toString(), socket.id);
        this.userSockets.set(socket.id, user._id.toString());

        console.log(`Користувач ${user.name} підключився`);

        // Повідомляємо всім про підключення
        socket.broadcast.emit('user_connected', {
            userId: user._id,
            userName: user.name,
            message: `${user.name} приєднався до чату`,
        });

        // Обробник публічних повідомлень
        socket.on('send_public_message', async (data) => {
            try {
                const messageData = {
                    sender: user._id,
                    content: data.content,
                    messageType: 'public',
                };

                const message = await messageService.createMessage(messageData);

                // Надсилаємо повідомлення всім підключеним користувачам
                this.io.emit('new_public_message', {
                    _id: message._id,
                    content: message.content,
                    sender: {
                        _id: message.sender._id,
                        name: message.sender.name,
                        email: message.sender.email,
                    },
                    messageType: message.messageType,
                    createdAt: message.createdAt,
                });
            } catch (error) {
                socket.emit('error', {
                    message: 'Не вдалося надіслати повідомлення',
                });
            }
        });

        // Обробник приватних повідомлень
        socket.on('send_private_message', async (data) => {
            try {
                const {recipientId, content} = data;

                const messageData = {
                    sender: user._id,
                    recipient: recipientId,
                    content: content,
                    messageType: 'private',
                };

                const message = await messageService.createMessage(messageData);

                const messageResponse = {
                    _id: message._id,
                    content: message.content,
                    sender: {
                        _id: message.sender._id,
                        name: message.sender.name,
                        email: message.sender.email,
                    },
                    recipient: {
                        _id: message.recipient._id,
                        name: message.recipient.name,
                        email: message.recipient.email,
                    },
                    messageType: message.messageType,
                    createdAt: message.createdAt,
                };

                // Надсилаємо повідомлення відправнику
                socket.emit('new_private_message', messageResponse);

                // Надсилаємо повідомлення отримувачу, якщо він онлайн
                const recipientSocketId = this.connectedUsers.get(recipientId);
                if (recipientSocketId) {
                    this.io
                        .to(recipientSocketId)
                        .emit('new_private_message', messageResponse);
                }
            } catch (error) {
                socket.emit('error', {
                    message: 'Не вдалося надіслати приватне повідомлення',
                });
            }
        });

        // Обробник запиту списку онлайн користувачів
        socket.on('get_online_users', () => {
            const onlineUsers = Array.from(this.connectedUsers.keys());
            socket.emit('online_users', onlineUsers);
        });

        // Обробник відключення
        socket.on('disconnect', () => {
            console.log(`Користувач ${user.name} відключився`);

            // Видаляємо з'єднання
            this.connectedUsers.delete(user._id.toString());
            this.userSockets.delete(socket.id);

            // Повідомляємо всім про відключення
            socket.broadcast.emit('user_disconnected', {
                userId: user._id,
                userName: user.name,
                message: `${user.name} покинув чат`,
            });
        });
    }

    // Метод для отримання списку онлайн користувачів
    getOnlineUsers() {
        return Array.from(this.connectedUsers.keys());
    }

    // Метод для перевірки чи користувач онлайн
    isUserOnline(userId) {
        return this.connectedUsers.has(userId.toString());
    }
}

module.exports = new SocketService();
