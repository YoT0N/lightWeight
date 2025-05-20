const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

// Зберігаємо активні з'єднання для швидкого доступу
const activeConnections = new Map();

module.exports = (io) => {
    // Проміжний обробник для аутентифікації користувачів
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Потрібна аутентифікація'));
            }

            // Перевіряємо токен
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Знаходимо користувача
            const user = await User.findById(decoded.id).select(
                '-password -resetPasswordToken -resetPasswordExpires',
            );

            if (!user) {
                return next(new Error('Користувача не знайдено'));
            }

            // Зберігаємо інформацію про користувача в об'єкті socket
            socket.user = user;
            next();
        } catch (error) {
            return next(new Error('Недійсний токен авторизації'));
        }
    });

    io.on('connection', async (socket) => {
        const user = socket.user;
        console.log(`Користувач підключився: ${user.name} (${user._id})`);

        // Зберігаємо активне з'єднання
        activeConnections.set(user._id.toString(), socket.id);

        // Надсилаємо список активних користувачів усім
        broadcastActiveUsers(io);

        // Надсилаємо історію загального чату
        try {
            const publicMessages = await Message.find({isPrivate: false})
                .sort({createdAt: -1})
                .limit(50)
                .populate('sender', 'name')
                .lean();

            socket.emit('chat history', publicMessages.reverse());
        } catch (error) {
            console.error('Помилка при отриманні історії чату:', error);
        }

        // Обробка загальних повідомлень
        socket.on('message', async (data) => {
            try {
                // Створюємо нове повідомлення в БД
                const newMessage = new Message({
                    sender: user._id,
                    content: data.content,
                    isPrivate: false,
                });

                await newMessage.save();

                // Отримуємо повідомлення з доданим ім'ям відправника
                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('sender', 'name')
                    .lean();

                // Надсилаємо повідомлення всім користувачам
                io.emit('message', populatedMessage);
            } catch (error) {
                console.error('Помилка при відправці повідомлення:', error);
                socket.emit('error', {
                    message: 'Помилка при відправці повідомлення',
                });
            }
        });

        // Обробка приватних повідомлень
        socket.on('private message', async (data) => {
            try {
                if (!data.recipientId || !data.content) {
                    return socket.emit('error', {
                        message: 'Відсутній отримувач або текст повідомлення',
                    });
                }

                // Створюємо нове приватне повідомлення в БД
                const newMessage = new Message({
                    sender: user._id,
                    recipient: data.recipientId,
                    content: data.content,
                    isPrivate: true,
                    readBy: [user._id], // Відправник одразу позначається як той, хто прочитав
                });

                await newMessage.save();

                // Отримуємо повідомлення з доданим ім'ям відправника
                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('sender', 'name')
                    .populate('recipient', 'name')
                    .lean();

                // Отримуємо сокет отримувача
                const recipientSocketId = activeConnections.get(
                    data.recipientId,
                );

                // Надсилаємо повідомлення відправнику
                socket.emit('private message', populatedMessage);

                // Надсилаємо повідомлення отримувачу, якщо він онлайн
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit(
                        'private message',
                        populatedMessage,
                    );
                }
            } catch (error) {
                console.error(
                    'Помилка при відправці приватного повідомлення:',
                    error,
                );
                socket.emit('error', {
                    message: 'Помилка при відправці приватного повідомлення',
                });
            }
        });

        // Позначення повідомлення як прочитане
        socket.on('mark read', async (messageId) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) {
                    return socket.emit('error', {
                        message: 'Повідомлення не знайдено',
                    });
                }

                // Додаємо користувача до масиву тих, хто прочитав
                if (!message.readBy.includes(user._id)) {
                    message.readBy.push(user._id);
                    await message.save();

                    // Повідомляємо відправника про прочитання
                    const senderSocketId = activeConnections.get(
                        message.sender.toString(),
                    );
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('message read', {
                            messageId,
                            readBy: user._id,
                        });
                    }
                }
            } catch (error) {
                console.error(
                    'Помилка при позначенні повідомлення як прочитане:',
                    error,
                );
                socket.emit('error', {
                    message: 'Помилка при позначенні повідомлення як прочитане',
                });
            }
        });

        // Отримання історії приватних повідомлень з конкретним користувачем
        socket.on('get private history', async (userId) => {
            try {
                const messages = await Message.find({
                    isPrivate: true,
                    $or: [
                        {sender: user._id, recipient: userId},
                        {sender: userId, recipient: user._id},
                    ],
                })
                    .sort({createdAt: -1})
                    .limit(50)
                    .populate('sender', 'name')
                    .populate('recipient', 'name')
                    .lean();

                socket.emit('private history', {
                    userId,
                    messages: messages.reverse(),
                });
            } catch (error) {
                console.error(
                    'Помилка при отриманні історії приватного чату:',
                    error,
                );
                socket.emit('error', {
                    message: 'Помилка при отриманні історії приватного чату',
                });
            }
        });

        // Обробка від'єднання
        socket.on('disconnect', () => {
            console.log(`Користувач відключився: ${user.name} (${user._id})`);
            // Видаляємо з'єднання зі списку активних
            activeConnections.delete(user._id.toString());
            // Оновлюємо список активних користувачів для всіх
            broadcastActiveUsers(io);
        });
    });

    // Функція для відправки списку активних користувачів
    async function broadcastActiveUsers(io) {
        try {
            // Отримуємо ID всіх активних користувачів
            const activeUserIds = Array.from(activeConnections.keys());

            // Отримуємо дані про активних користувачів з БД
            const activeUsers = await User.find({
                _id: {$in: activeUserIds},
            })
                .select('_id name')
                .lean();

            // Відправляємо список активних користувачів всім
            io.emit('active users', activeUsers);
        } catch (error) {
            console.error(
                'Помилка при відправці списку активних користувачів:',
                error,
            );
        }
    }
};
