/**
 * routes/adminRoutes.js
 * - Admin panel for user/item moderation, plus transaction history
 */
const express = require('express');
const router = express.Router();
const auth = require('../utils/auth');
const isAdmin = require('../utils/isAdmin');
const User = require('../models/User');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Make user admin
router.put('/makeAdmin/:userId', auth, isAdmin, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { role: 'admin' },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User promoted to admin', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user
router.delete('/users/:userId', auth, isAdmin, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.userId);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all items
router.get('/items', auth, isAdmin, async (req, res) => {
  try {
    const items = await Item.find().populate('seller', 'fullName email');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete item by admin
router.delete('/items/:itemId', auth, isAdmin, async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted by admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// View transaction history (all or by user)
router.get('/transactions', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.query;
    let filter = {};
    if (userId) {
      filter = { $or: [{ buyer: userId }, { seller: userId }] };
    }
    const transactions = await Transaction.find(filter)
      .populate('buyer', 'fullName email')
      .populate('seller', 'fullName email')
      .populate('item');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
