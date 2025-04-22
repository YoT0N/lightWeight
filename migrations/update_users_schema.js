require('dotenv').config({path: './.env'});
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Підключаємо схему користувача (стару схему не використовуємо, щоб запобігти конфліктам)
const UserSchema = new mongoose.Schema(
    {
        name: String,
        age: Number,
        email: String,
        password: String,
        role: String,
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        createdAt: Date,
    },
    {versionKey: false},
);

const User = mongoose.model('User', UserSchema);

async function runMigration() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI не визначено у .env файлі');
        }

        console.log('Підключення до MongoDB з URI:', process.env.MONGODB_URI);

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Підключено до MongoDB');

        // Отримуємо всіх користувачів
        const users = await User.find();
        console.log(`Знайдено ${users.length} користувачів для оновлення`);

        // Генеруємо хешований пароль за замовчуванням
        const defaultPassword = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        // Оновлюємо користувачів
        for (const user of users) {
            // Додаємо пароль і роль, якщо вони відсутні
            if (!user.password) {
                user.password = hashedPassword;
            }

            if (!user.role) {
                // Першого користувача робимо адміністратором, інших - звичайними користувачами
                user.role = user === users[0] ? 'admin' : 'user';
            }

            await user.save();
        }

        console.log('Міграцію успішно завершено');
        console.log('Було оновлено схему для всіх користувачів');
        console.log(
            `Пароль за замовчуванням для всіх користувачів: ${defaultPassword}`,
        );
        console.log(
            `Користувач ${users[0].name} (${users[0].email}) має роль адміністратора`,
        );
    } catch (error) {
        console.error('Помилка міграції:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log("Зв'язок з MongoDB закрито");
        process.exit(0);
    }
}

runMigration();
