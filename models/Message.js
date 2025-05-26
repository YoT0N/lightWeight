const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null, // null для публічних повідомлень
        },
        content: {
            type: String,
            required: [true, "Контент повідомлення обов'язковий"],
            trim: true,
        },
        messageType: {
            type: String,
            enum: ['public', 'private'],
            default: 'public',
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {versionKey: false},
);

// Індекси для оптимізації запитів
MessageSchema.index({createdAt: -1});
MessageSchema.index({sender: 1, recipient: 1});

module.exports = mongoose.model('Message', MessageSchema);
