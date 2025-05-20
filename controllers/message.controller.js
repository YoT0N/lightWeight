const messageService = require('../services/message.service');

exports.getPublicMessages = async (req, res, next) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const messages = await messageService.getPublicMessages(limit);
        res.json(messages);
    } catch (error) {
        next(error);
    }
};

exports.getPrivateMessages = async (req, res, next) => {
    try {
        const userId1 = req.user._id;
        const userId2 = req.params.userId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

        const messages = await messageService.getPrivateMessages(
            userId1,
            userId2,
            limit,
        );
        res.json(messages);
    } catch (error) {
        next(error);
    }
};

exports.getUnreadMessages = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const unreadMessages = await messageService.getUnreadMessages(userId);
        res.json(unreadMessages);
    } catch (error) {
        next(error);
    }
};

exports.markAsRead = async (req, res, next) => {
    try {
        const messageId = req.params.messageId;
        const userId = req.user._id;

        const message = await messageService.markAsRead(messageId, userId);

        if (!message) {
            return res.status(404).json({error: 'Повідомлення не знайдено'});
        }

        res.json(message);
    } catch (error) {
        next(error);
    }
};

exports.sendMessage = async (req, res, next) => {
    try {
        const senderUserId = req.user._id;
        const {content, recipientUserId, isPrivate = false} = req.body;

        if (!content) {
            return res
                .status(400)
                .json({error: "Вміст повідомлення обов'язковий"});
        }

        // Для приватних повідомлень потрібен отримувач
        if (isPrivate && !recipientUserId) {
            return res
                .status(400)
                .json({error: 'Для приватних повідомлень потрібен отримувач'});
        }

        const message = await messageService.createMessage(
            senderUserId,
            content,
            isPrivate ? recipientUserId : null,
            isPrivate,
        );

        // Якщо в запиті є socket.io, сповіщаємо всіх (або конкретного користувача)
        if (req.io) {
            if (isPrivate) {
                // Приватне повідомлення для конкретного користувача
                req.io
                    .to(`user_${recipientUserId}`)
                    .emit('private message', message);
                // Також відправляємо копію відправнику
                req.io
                    .to(`user_${senderUserId}`)
                    .emit('private message', message);
            } else {
                // Публічне повідомлення для всіх
                req.io.emit('message', message);
            }
        }

        res.status(201).json(message);
    } catch (error) {
        next(error);
    }
};
