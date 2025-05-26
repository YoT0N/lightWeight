const Message = require('../models/Message');

class MessageService {
    async createMessage(messageData) {
        const message = new Message(messageData);
        await message.save();

        // Повертаємо повідомлення з інформацією про відправника
        return await Message.findById(message._id)
            .populate('sender', 'name email')
            .populate('recipient', 'name email');
    }

    async getPublicMessages(limit = 50) {
        return await Message.find({messageType: 'public'})
            .populate('sender', 'name email')
            .sort({createdAt: -1})
            .limit(limit)
            .lean();
    }

    async getPrivateMessages(userId1, userId2, limit = 50) {
        return await Message.find({
            messageType: 'private',
            $or: [
                {sender: userId1, recipient: userId2},
                {sender: userId2, recipient: userId1},
            ],
        })
            .populate('sender', 'name email')
            .populate('recipient', 'name email')
            .sort({createdAt: -1})
            .limit(limit)
            .lean();
    }

    async getUserConversations(userId) {
        // Отримуємо список користувачів, з якими є приватні розмови
        const conversations = await Message.aggregate([
            {
                $match: {
                    messageType: 'private',
                    $or: [{sender: userId}, {recipient: userId}],
                },
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            {$eq: ['$sender', userId]},
                            '$recipient',
                            '$sender',
                        ],
                    },
                    lastMessage: {$last: '$content'},
                    lastMessageTime: {$last: '$createdAt'},
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: '$user',
            },
            {
                $project: {
                    'user.name': 1,
                    'user.email': 1,
                    'user._id': 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                },
            },
            {
                $sort: {lastMessageTime: -1},
            },
        ]);

        return conversations;
    }

    async deleteMessage(messageId, userId) {
        // Користувач може видаляти лише свої повідомлення
        return await Message.findOneAndDelete({
            _id: messageId,
            sender: userId,
        });
    }
}

module.exports = new MessageService();
