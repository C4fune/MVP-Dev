/**
 * socket.js
 * Handles real-time chat & item notifications
 */
const { Server } = require('socket.io');

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

    // Join a dedicated chat room
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Send chat message to a room
    socket.on('sendRoomMessage', (data) => {
      const { roomId, content, sender } = data;
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

    // Notify subscribers of new item
    socket.on('newItemCreated', (item) => {
      const { category } = item;
      const subscribers = usersSubscribedToCategory[category] || [];
      subscribers.forEach((sockId) => {
        io.to(sockId).emit('itemNotification', item);
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // remove from category subscriptions
      Object.keys(usersSubscribedToCategory).forEach((cat) => {
        usersSubscribedToCategory[cat] = usersSubscribedToCategory[cat].filter(
          (id) => id !== socket.id
        );
      });
    });
  });
};
