const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Ім'я обов'язкове"],
            trim: true,
        },
        age: {
            type: Number,
            required: [true, "Вік обов'язковий"],
            min: [0, "Вік не може бути від'ємним"],
        },
        email: {
            type: String,
            required: [true, "Email обов'язковий"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {versionKey: false},
);

module.exports = mongoose.model('User', UserSchema);
