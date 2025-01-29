/**
 * server.js
 * Main entry for the Express app
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');

// Routes
const userRoutes = require('./routes/userRoutes');
const itemRoutes = require('./routes/itemRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const extraRoutes = require('./routes/extraRoutes');

const app = express();
connectDB(process.env.MONGO_URI);

app.use(cors());
app.use(express.json());

// Serve uploads (images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register routes
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/extra', extraRoutes);

// Serve static front-end
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for single-page or multipage approach
app.get('*', (req, res) => {
  // You can decide if you want a fallback to index, or let your separate pages load
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
require('./socket')(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
