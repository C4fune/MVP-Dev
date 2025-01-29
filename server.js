/**
 * server.js
 * Main entry point for the Express application
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

// DB connection
const connectDB = require('./config/db');

// Routes
const userRoutes = require('./routes/userRoutes');
const itemRoutes = require('./routes/itemRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const extraRoutes = require('./routes/extraRoutes'); // leaderboard & profile

// Initialize Express
const app = express();
connectDB(process.env.MONGO_URI);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploads for images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register routes
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/extra', extraRoutes); // leaderboard, profile

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create server & integrate Socket.io
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
require('./socket')(server); // Socket.io setup

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
