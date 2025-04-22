const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
        password: {
            type: String,
            required: [true, "Пароль обов'язковий"],
            minlength: [6, 'Пароль повинен містити мінімум 6 символів'],
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {versionKey: false},
);

// Метод для генерації JWT токену
UserSchema.methods.generateAuthToken = function () {
    return jwt.sign({id: this._id, role: this.role}, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });
};

// Метод для порівняння паролів
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Хешування пароля перед збереженням
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('User', UserSchema);
