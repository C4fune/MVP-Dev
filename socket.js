/**
 * socket.js
 * Handles real-time chat with dedicated chat rooms + item notifications
 */

const { Server } = require('socket.io');

// For category subscription or room membership, etc.
const usersSubscribedToCategory = {};

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join dedicated chat room
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Send a chat message to a room
    socket.on('sendRoomMessage', (data) => {
      const { roomId, content, sender } = data;
      // Broadcast to that room
      io.to(roomId).emit('receiveRoomMessage', {
        sender,
        content,
        timestamp: new Date().toISOString()
      });
    });

    // Subscribe to category
    socket.on('subscribeCategory', (category) => {
      if (!usersSubscribedToCategory[category]) {
        usersSubscribedToCategory[category] = [];
      }
      usersSubscribedToCategory[category].push(socket.id);
      console.log(`Socket ${socket.id} subscribed to category: ${category}`);
    });

    // Notify users in a category about a new item
    socket.on('newItemCreated', (item) => {
      const { category } = item;
      const subscribers = usersSubscribedToCategory[category] || [];
      subscribers.forEach((sockId) => {
        io.to(sockId).emit('itemNotification', item);
      });
    });

    // On disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      // Remove from any category subscriptions
      Object.keys(usersSubscribedToCategory).forEach((cat) => {
        usersSubscribedToCategory[cat] = usersSubscribedToCategory[cat].filter(
          (id) => id !== socket.id
        );
      });
    });
  });
};
