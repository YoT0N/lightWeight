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
            // Null для загального чату
            default: null,
        },
        content: {
            type: String,
            required: [true, "Текст повідомлення обов'язковий"],
            trim: true,
        },
        isPrivate: {
            type: Boolean,
            default: false,
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {versionKey: false},
);

module.exports = mongoose.model('Message', MessageSchema);
