const messageService = require('../services/message.service');

exports.getPublicMessages = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const messages = await messageService.getPublicMessages(limit);
        res.json(messages.reverse()); // Сортуємо від старих до нових для відображення
    } catch (error) {
        next(error);
    }
};

exports.getPrivateMessages = async (req, res, next) => {
    try {
        const {userId} = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const currentUserId = req.user._id;

        const messages = await messageService.getPrivateMessages(
            currentUserId,
            userId,
            limit,
        );

        res.json(messages.reverse()); // Сортуємо від старих до нових для відображення
    } catch (error) {
        next(error);
    }
};

exports.getUserConversations = async (req, res, next) => {
    try {
        const conversations = await messageService.getUserConversations(
            req.user._id,
        );
        res.json(conversations);
    } catch (error) {
        next(error);
    }
};

exports.deleteMessage = async (req, res, next) => {
    try {
        const {messageId} = req.params;
        const deletedMessage = await messageService.deleteMessage(
            messageId,
            req.user._id,
        );

        if (!deletedMessage) {
            return res.status(404).json({
                error: 'Повідомлення не знайдено або ви не маєте прав на його видалення',
            });
        }

        res.json({message: 'Повідомлення успішно видалено'});
    } catch (error) {
        next(error);
    }
};
