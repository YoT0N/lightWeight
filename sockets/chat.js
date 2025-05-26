const Message = require('../models/Message');
const userSockets = new Map();

function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log('🟢 Connected:', socket.id);

    socket.on('register', (userId) => {
      userSockets.set(userId, socket.id);
      console.log(`Registered user ${userId} with socket ${socket.id}`);
    });

    Message.find().sort({ timestamp: 1 }).limit(50).then((messages) => {
      socket.emit('chat-history', messages);
    });

    socket.on('message', async ({ sender, content }) => {
      const message = new Message({
        sender,
        recipient: null,
        content,
        timestamp: new Date(),
      });
      await message.save();
      io.emit('message', message);
    });

    socket.on('private-message', async ({ sender, recipientId, content }) => {
      const recipientSocketId = userSockets.get(recipientId);
      const message = new Message({
        sender,
        recipient: recipientId,
        content,
        timestamp: new Date(),
      });
      await message.save();

      const senderSocketId = socket.id;
      if (recipientSocketId) io.to(recipientSocketId).emit('private-message', message);
      io.to(senderSocketId).emit('private-message', message);
    });

    socket.on('disconnect', () => {
      for (const [userId, sockId] of userSockets.entries()) {
        if (sockId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
      console.log('🔴 Disconnected:', socket.id);
    });
  });
}

module.exports = socketHandler;
