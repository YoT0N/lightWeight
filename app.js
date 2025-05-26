const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Підключення до MongoDB
mongoose.connect('mongodb://localhost:27017/chatapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Схеми MongoDB
const userSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
});

const messageSchema = new mongoose.Schema({
    sender: {type: String, required: true},
    recipient: {type: String, default: null}, // null для публічних повідомлень
    content: {type: String, required: true},
    timestamp: {type: Date, default: Date.now},
    isPrivate: {type: Boolean, default: false},
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Налаштування
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static('public'));

// Сесії
app.use(
    session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: 'mongodb://localhost:27017/chatapp',
        }),
    }),
);

// Middleware для перевірки авторизації
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Маршрути
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('register', {error: null});
});

app.post('/register', async (req, res) => {
    try {
        const {username, password} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
        });

        await user.save();
        res.redirect('/login');
    } catch (error) {
        res.render('register', {error: 'Користувач з таким іменем вже існує'});
    }
});

app.get('/login', (req, res) => {
    res.render('login', {error: null});
});

app.post('/login', async (req, res) => {
    try {
        const {username, password} = req.body;
        const user = await User.findOne({username});

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', {
                error: "Невірне ім'я користувача або пароль",
            });
        }

        req.session.userId = user._id;
        req.session.username = user.username;
        res.redirect('/profile');
    } catch (error) {
        res.render('login', {error: 'Помилка входу'});
    }
});

app.get('/profile', requireAuth, (req, res) => {
    res.render('profile', {username: req.session.username});
});

app.get('/chat', requireAuth, async (req, res) => {
    try {
        const messages = await Message.find({isPrivate: false})
            .sort({timestamp: 1})
            .limit(50);
        const users = await User.find({}, 'username');

        res.render('chat', {
            username: req.session.username,
            messages,
            users,
        });
    } catch (error) {
        res.render('chat', {
            username: req.session.username,
            messages: [],
            users: [],
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Socket.IO логіка
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('Користувач підключився:', socket.id);

    socket.on('user-connected', (username) => {
        connectedUsers.set(socket.id, username);
        socket.broadcast.emit('user-joined', username);

        // Відправити список онлайн користувачів
        io.emit('online-users', Array.from(connectedUsers.values()));
    });

    socket.on('send-message', async (data) => {
        try {
            const message = new Message({
                sender: data.sender,
                content: data.content,
                isPrivate: false,
            });

            await message.save();

            io.emit('receive-message', {
                sender: data.sender,
                content: data.content,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Помилка збереження повідомлення:', error);
        }
    });

    socket.on('send-private-message', async (data) => {
        try {
            const message = new Message({
                sender: data.sender,
                recipient: data.recipient,
                content: data.content,
                isPrivate: true,
            });

            await message.save();

            // Знайти сокет отримувача
            const recipientSocket = Array.from(connectedUsers.entries()).find(
                ([id, username]) => username === data.recipient,
            );

            if (recipientSocket) {
                const [recipientSocketId] = recipientSocket;
                io.to(recipientSocketId).emit('receive-private-message', {
                    sender: data.sender,
                    content: data.content,
                    timestamp: new Date(),
                });
            }

            // Відправити підтвердження відправнику
            socket.emit('private-message-sent', {
                recipient: data.recipient,
                content: data.content,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Помилка збереження приватного повідомлення:', error);
        }
    });

    socket.on('disconnect', () => {
        const username = connectedUsers.get(socket.id);
        if (username) {
            connectedUsers.delete(socket.id);
            socket.broadcast.emit('user-left', username);
            io.emit('online-users', Array.from(connectedUsers.values()));
        }
        console.log('Користувач відключився:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT} http://localhost:3000/`);
});
