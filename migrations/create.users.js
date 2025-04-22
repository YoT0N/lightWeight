require('dotenv').config({path: '../.env'});
const mongoose = require('mongoose');
const User = require('../models/User');

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

        await User.deleteMany({});
        console.log('Існуючі дані очищено');

        const initialUsers = [
            {name: 'Бодя', age: 25, email: 'bodya@example.com'},
            {name: 'Кабачок', age: 30, email: 'kabachok@example.com'},
            {name: 'Огурчик', age: 22, email: 'ogurchik@example.com'},
        ];

        const result = await User.insertMany(initialUsers);
        console.log(`Додано ${result.length} тестових користувачів`);
    } catch (error) {
        console.error('Помилка міграції:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log("Зв'язок з MongoDB закрито");
        process.exit(0);
    }
}

runMigration();
