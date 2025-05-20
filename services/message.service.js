const Message = require('../models/Message');
const mongoose = require('mongoose');

class MessageService {
    async getPublicMessages(limit = 50) {
        return await Message.find({isPrivate: false})
            .sort({createdAt: -1})
            .limit(limit)
            .populate('sender', 'name')
            .lean();
    }

    async getPrivateMessages(userId1, userId2, limit = 50) {
        return await Message.find({
            isPrivate: true,
            $or: [
                {sender: userId1, recipient: userId2},
                {sender: userId2, recipient: userId1},
            ],
        })
            .sort({createdAt: -1})
            .limit(limit)
            .populate('sender', 'name')
            .populate('recipient', 'name')
            .lean();
    }

    async getUnreadMessages(userId) {
        // Знаходимо всі повідомлення, де користувач є отримувачем і не прочитав їх
        const unreadMessages = await Message.find({
            recipient: userId,
            readBy: {$ne: userId},
        })
            .populate('sender', 'name')
            .lean();

        // Групуємо непрочитані повідомлення за відправником
        const unreadByUser = unreadMessages.reduce((acc, message) => {
            const senderId = message.sender._id.toString();
            if (!acc[senderId]) {
                acc[senderId] = {
                    user: {
                        _id: senderId,
                        name: message.sender.name,
                    },
                    count: 0,
                };
            }
            acc[senderId].count += 1;
            return acc;
        }, {});

        // Перетворюємо об'єкт на масив
        return Object.values(unreadByUser);
    }

    async markAsRead(messageId, userId) {
        const message = await Message.findById(messageId);

        if (!message) {
            return null;
        }

        // Перевіряємо, чи користувач уже позначив як прочитане
        if (message.readBy.includes(userId)) {
            return message;
        }

        // Додаємо користувача до списку тих, хто прочитав
        message.readBy.push(userId);
        await message.save();

        return await Message.findById(messageId)
            .populate('sender', 'name')
            .populate('recipient', 'name')
            .lean();
    }

    async createMessage(
        senderUserId,
        content,
        recipientUserId = null,
        isPrivate = false,
    ) {
        const message = new Message({
            sender: senderUserId,
            content,
            recipient: recipientUserId,
            isPrivate,
            readBy: [senderUserId], // Відправник одразу позначається як той, хто прочитав
        });

        await message.save();
        return await Message.findById(message._id)
            .populate('sender', 'name')
            .populate('recipient', 'name')
            .lean();
    }
}

module.exports = new MessageService();
