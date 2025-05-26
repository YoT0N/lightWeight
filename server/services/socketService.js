const Message = require("../models/Message");
const redisClient = require("../config/redisClient");
const RATE_LIMIT_WINDOW = 3;
const RATE_LIMIT_PREFIX = "rateLimit:";

function initializeSocket(server) {
  const io = require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const getUsersInRoom = (roomName) => {
    const users = new Set();
    const room = io.sockets.adapter.rooms.get(roomName);
    if (room) {
      for (const socketId of room) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket?.username) users.add(socket.username);
      }
    }
    return Array.from(users).map((username) => ({ username }));
  };

  const findSocketByUsername = (io, username) => {
    for (const [_, socket] of io.sockets.sockets) {
      if (socket.username === username) return socket;
    }
    return null;
  };

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinRoom", async ({ username }) => {
      try {
        socket.username = username;
        socket.join("general");

        const userSetKey = "joinedUsers";
        const cacheKey = `messageHistory:general`;

        // Перевірити, чи новий користувач
        const isNewUser = !(await redisClient.sIsMember(userSetKey, username));
        
        if (isNewUser) {
          // Новий користувач: видалити кеш і зчитати заново з бази
          await redisClient.del(cacheKey);
          await redisClient.sAdd(userSetKey, username);
          console.log(`🆕 New user ${username}. Cache for general messages cleared.`);
        }

        let publicMessages;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          publicMessages = JSON.parse(cached);
          console.log(`📦 [CACHE] Messages for room "general" loaded from Redis`);
        } else {
          publicMessages = await Message.find({
            room: "general",
            isPrivate: false,
          })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

          await redisClient.set(cacheKey, JSON.stringify(publicMessages), { EX: 60 });
          console.log(`🗄️ [DB] Messages for room "general" loaded from MongoDB and cached`);
        }

        // Отримати всіх активних користувачів
        const onlineUsers = getUsersInRoom("general").map((u) => u.username);

        // Завантажити приватні повідомлення з усіма активними користувачами
        const privateMessages = await Message.find({
          isPrivate: true,
          $or: [
            { user: username, recipient: { $in: onlineUsers } },
            { recipient: username, user: { $in: onlineUsers } }
          ]
        })
          .sort({ createdAt: -1 })
          .lean();

        const allMessages = [...publicMessages, ...privateMessages].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        socket.emit("messageHistory", allMessages);

        console.log(`✅ ${username} joined room "general"`);

        socket.broadcast.to("general").emit("message", {
          username: "System",
          text: `${username} joined the chat`,
          createdAt: new Date(),
        });

        io.to("general").emit("roomUsers", {
          users: getUsersInRoom("general"),
        });
      } catch (err) {
        console.error("❌ Join room error:", err);
      }
    });


    socket.on("sendMessage", async ({ username, text }) => {
      try {
        const key = `${RATE_LIMIT_PREFIX}public:${username}`;
        const isLimited = await redisClient.exists(key);

        if (isLimited) {
          socket.emit("error", "⏳ Please wait before sending another message.");
          return;
        }

        // Встановлюємо обмеження на 3 секунди
        await redisClient.set(key, "1", { EX: RATE_LIMIT_WINDOW });

        const newMessage = new Message({
          user: username,
          text: text,
          room: "general",
          isPrivate: false,
        });

        const saved = await newMessage.save();
        io.to("general").emit("message", {
          username: saved.user,
          text: saved.text,
          createdAt: saved.createdAt,
          isPrivate: false,
        });
      } catch (err) {
        console.error("Public msg error:", err);
        socket.emit("error", "Failed to send message");
      }
    });


    socket.on("sendPrivateMessage", async ({ sender, recipient, text }) => {
      try {
        const key = `${RATE_LIMIT_PREFIX}private:${sender}`;
        const isLimited = await redisClient.exists(key);

        if (isLimited) {
          socket.emit("error", "⏳ Please wait before sending another private message.");
          return;
        }

        await redisClient.set(key, "1", { EX: RATE_LIMIT_WINDOW });

        const newMessage = new Message({
          user: sender,
          text,
          recipient,
          isPrivate: true,
        });

        const savedMessage = await newMessage.save();

        socket.emit("privateMessage", {
          username: sender,
          recipient,
          text,
          createdAt: savedMessage.createdAt,
          isPrivate: true,
          isOwn: true,
        });

        const recipientSocket = findSocketByUsername(io, recipient);
        if (recipientSocket) {
          recipientSocket.emit("privateMessage", {
            username: sender,
            recipient,
            text,
            createdAt: savedMessage.createdAt,
            isPrivate: true,
            isOwn: false,
          });
        }
      } catch (err) {
        console.error("Private msg error:", err);
        socket.emit("error", "Failed to send private message");
      }
    });


    socket.on("leaveRoom", () => {
      if (socket.username) {
        socket.leave("general");
        socket.broadcast.to("general").emit("message", {
          username: "System",
          text: `${socket.username} left the chat`,
          createdAt: new Date(),
        });
        io.to("general").emit("roomUsers", {
          users: getUsersInRoom("general"),
        });
        socket.disconnect();
      }
    });

    socket.on("disconnect", () => {
      if (socket.username) {
        io.to("general").emit("message", {
          username: "System",
          text: `${socket.username} disconnected`,
          createdAt: new Date(),
        });
        io.to("general").emit("roomUsers", {
          users: getUsersInRoom("general"),
        });
      }
    });
  });

  return io;
}

module.exports = initializeSocket;
