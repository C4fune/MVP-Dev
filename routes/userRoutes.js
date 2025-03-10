/**
 * routes/userRoutes.js
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../utils/auth');

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const existing = await User.findOne({ email });
    if(existing) return res.status(400).json({ message: 'User with that email already exists.' });

    const newUser = new User({ fullName, email, password });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'User created',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Log in
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if(!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const match = await user.comparePassword(password);
    if(!match) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if(!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Add to favorites
router.put('/favorites/:itemId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if(user.favorites.includes(req.params.itemId)) {
      return res.status(400).json({ message: 'Item already in favorites.' });
    }
    user.favorites.push(req.params.itemId);
    await user.save();
    res.json({ message: 'Item added to favorites.' });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove from favorites
router.delete('/favorites/:itemId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.favorites = user.favorites.filter(f => f.toString() !== req.params.itemId);
    await user.save();
    res.json({ message: 'Item removed from favorites.' });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
