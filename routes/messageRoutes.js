/**
 * routes/messageRoutes.js
 * - Basic direct message endpoints (if storing in DB)
 */
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../utils/auth');

// Send message
router.post('/', auth, async (req, res) => {
  try {
    const { receiver, content, itemId } = req.body;
    const newMessage = new Message({
      sender: req.userId,
      receiver,
      content,
      item: itemId || null
    });
    await newMessage.save();
    // Could emit socket event here
    res.status(201).json({ message: 'Message sent', data: newMessage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get conversation with another user
router.get('/:otherUserId', auth, async (req, res) => {
  try {
    const otherUserId = req.params.otherUserId;
    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: otherUserId },
        { sender: otherUserId, receiver: req.userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
