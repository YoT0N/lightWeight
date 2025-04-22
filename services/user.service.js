const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class UserService {
    async getAllUsers() {
        return await User.find().select(
            '-password -resetPasswordToken -resetPasswordExpires',
        );
    }

    async getUserById(id) {
        return await User.findById(id).select(
            '-password -resetPasswordToken -resetPasswordExpires',
        );
    }

    async createUser(userData) {
        const newUser = new User(userData);
        return await newUser.save();
    }

    async updateUser(id, userData) {
        // Якщо оновлюємо пароль, його потрібно хешувати
        if (userData.password) {
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(userData.password, salt);
        }

        return await User.findByIdAndUpdate(id, userData, {
            new: true,
            runValidators: true,
        }).select('-password -resetPasswordToken -resetPasswordExpires');
    }

    async deleteUser(id) {
        return await User.findByIdAndDelete(id);
    }

    async searchUsers(query) {
        const searchQuery = {};

        if (query.name) searchQuery.name = {$regex: query.name, $options: 'i'};
        if (query.minAge)
            searchQuery.age = {
                ...searchQuery.age,
                $gte: parseInt(query.minAge),
            };
        if (query.maxAge)
            searchQuery.age = {
                ...searchQuery.age,
                $lte: parseInt(query.maxAge),
            };

        return await User.find(searchQuery).select(
            '-password -resetPasswordToken -resetPasswordExpires',
        );
    }

    async findByEmail(email) {
        return await User.findOne({email});
    }

    async authenticate(email, password) {
        const user = await User.findOne({email});

        if (!user) {
            return null;
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return null;
        }

        const token = user.generateAuthToken();
        return {user: this._sanitizeUser(user), token};
    }

    async generatePasswordResetToken(email) {
        const user = await User.findOne({email});
        if (!user) {
            return null;
        }

        // Генеруємо унікальний токен
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Записуємо токен та час його дії в базу даних
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 година

        await user.save();
        return resetToken;
    }

    async resetPassword(token, newPassword) {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: {$gt: Date.now()},
        });

        if (!user) {
            return null;
        }

        // Оновлюємо пароль
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        return user;
    }

    _sanitizeUser(user) {
        const sanitized = user.toObject();
        delete sanitized.password;
        delete sanitized.resetPasswordToken;
        delete sanitized.resetPasswordExpires;
        return sanitized;
    }
}

module.exports = new UserService();
