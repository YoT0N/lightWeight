const io = require('socket.io-client');
const readline = require('readline');
const axios = require('axios');

// Налаштування URL та порту
const API_URL = 'http://localhost:3000/api';
let token = '';
let currentUser = null;
let activeUsers = [];
let currentChat = null; // Може бути null (загальний чат) або ID користувача (приватний чат)

// Налаштування читання з консолі
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Функція для авторизації
async function login() {
    try {
        rl.question('Введіть email: ', async (email) => {
            rl.question('Введіть пароль: ', async (password) => {
                try {
                    const response = await axios.post(`${API_URL}/auth/login`, {
                        email,
                        password,
                    });

                    token = response.data.token;
                    currentUser = response.data.user;

                    console.log('\n✅ Авторизація успішна!');
                    console.log(`📝 Ласкаво просимо, ${currentUser.name}!\n`);

                    // Після успішного логіну підключаємось до сокету
                    connectSocket();
                } catch (error) {
                    console.error(
                        '\n❌ Помилка авторизації:',
                        error.response?.data?.error || error.message,
                    );
                    login(); // Повторна спроба авторизації
                }
            });
        });
    } catch (error) {
        console.error('Помилка:', error.message);
        process.exit(1);
    }
}

// Функція для підключення до сокету
function connectSocket() {
    const socket = io('http://localhost:3000', {
        auth: {token},
    });

    // Обробка події підключення
    socket.on('connect', () => {
        console.log("🔌 З'єднання з сервером встановлено");
        console.log('💬 Ви підключені до загального чату\n');
        showCommands();
    });

    // Обробка помилок підключення
    socket.on('connect_error', (error) => {
        console.error('❌ Помилка підключення:', error.message);
        process.exit(1);
    });

    // Отримання списку активних користувачів
    socket.on('active users', (users) => {
        activeUsers = users.filter((user) => user._id !== currentUser._id);
        if (activeUsers.length > 0) {
            console.log('\n👥 Активні користувачі:');
            activeUsers.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.name} (ID: ${user._id})`);
            });
            console.log();
        }
    });

    // Отримання повідомлень загального чату
    socket.on('chat history', (messages) => {
        if (messages.length > 0) {
            console.log('\n📜 Історія загального чату:');
            messages.forEach((msg) => {
                console.log(`  ${msg.sender.name}: ${msg.content}`);
            });
            console.log();
        } else {
            console.log('\n📜 Історія загального чату порожня\n');
        }
    });

    // Отримання приватних повідомлень з історії
    socket.on('private history', ({userId, messages}) => {
        const user = activeUsers.find((u) => u._id === userId);
        if (messages.length > 0) {
            console.log(
                `\n📜 Історія приватного чату з ${user ? user.name : userId}:`,
            );
            messages.forEach((msg) => {
                const isFromMe = msg.sender._id === currentUser._id;
                console.log(
                    `  ${isFromMe ? 'Ви' : msg.sender.name}: ${msg.content}`,
                );
            });
            console.log();
        } else {
            console.log(
                `\n📜 Історія приватного чату з ${
                    user ? user.name : userId
                } порожня\n`,
            );
        }
    });

    // Обробка нових публічних повідомлень
    socket.on('message', (message) => {
        // Показуємо повідомлення, тільки якщо ми в загальному чаті
        if (currentChat === null) {
            const isFromMe = message.sender._id === currentUser._id;
            console.log(
                `${isFromMe ? 'Ви' : message.sender.name}: ${message.content}`,
            );
        }
    });

    // Обробка нових приватних повідомлень
    socket.on('private message', (message) => {
        const isFromMe = message.sender._id === currentUser._id;
        const otherUserId = isFromMe
            ? message.recipient._id
            : message.sender._id;

        // Показуємо повідомлення, тільки якщо ми в правильному приватному чаті
        // або не в жодному чаті (сповіщення)
        if (currentChat === otherUserId) {
            console.log(
                `${isFromMe ? 'Ви' : message.sender.name}: ${message.content}`,
            );
        } else if (currentChat !== otherUserId && !isFromMe) {
            console.log(
                `\n🔔 Нове приватне повідомлення від ${message.sender.name}: ${message.content}\n`,
            );
        }
    });

    // Обробка від'єднання
    socket.on('disconnect', () => {
        console.log("\n🔌 З'єднання з сервером розірвано");
    });

    // Обробка помилок
    socket.on('error', (error) => {
        console.error('\n❌ Помилка:', error.message);
    });

    // Обробка вводу з консолі
    rl.on('line', (input) => {
        const trimmedInput = input.trim();

        // Обробка команд
        if (trimmedInput.startsWith('/')) {
            const parts = trimmedInput.slice(1).split(' ');
            const command = parts[0].toLowerCase();

            switch (command) {
                case 'help':
                    showCommands();
                    break;

                case 'users':
                    // Запитуємо актуальний список користувачів
                    socket.emit('get active users');
                    break;

                case 'private':
                case 'pm':
                    const userIndex = parseInt(parts[1]) - 1;
                    if (
                        isNaN(userIndex) ||
                        userIndex < 0 ||
                        userIndex >= activeUsers.length
                    ) {
                        console.log(
                            '\n❌ Некоректний номер користувача. Використовуйте /users для перегляду списку.\n',
                        );
                        return;
                    }

                    currentChat = activeUsers[userIndex]._id;
                    console.log(
                        `\n💬 Ви перейшли до приватного чату з ${activeUsers[userIndex].name}\n`,
                    );

                    // Запитуємо історію приватних повідомлень
                    socket.emit('get private history', currentChat);
                    break;

                case 'public':
                case 'general':
                    currentChat = null;
                    console.log('\n💬 Ви перейшли до загального чату\n');
                    break;

                case 'exit':
                case 'quit':
                    console.log('\n👋 До побачення!');
                    socket.disconnect();
                    process.exit(0);
                    break;

                default:
                    console.log(
                        '\n❌ Невідома команда. Використовуйте /help для перегляду доступних команд.\n',
                    );
            }

            return;
        }

        // Відправка повідомлення
        if (trimmedInput) {
            if (currentChat === null) {
                // Відправка в загальний чат
                socket.emit('message', {content: trimmedInput});
            } else {
                // Відправка приватного повідомлення
                socket.emit('private message', {
                    recipientId: currentChat,
                    content: trimmedInput,
                });
            }
        }
    });

    // Показуємо доступні команди
    function showCommands() {
        console.log('\n🔍 Доступні команди:');
        console.log('  /help - показати цей список команд');
        console.log('  /users - показати список активних користувачів');
        console.log(
            '  /pm <номер користувача> - перейти до приватного чату з користувачем',
        );
        console.log('  /public - перейти до загального чату');
        console.log('  /exit - вийти з програми\n');
    }
}

// Запускаємо авторизацію
console.log('🚀 Консольний клієнт чату');
console.log('👤 Будь ласка, авторизуйтесь:');
login();
