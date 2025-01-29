/**
 * routes/itemRoutes.js
 * - Create, Read, Update, Delete items, plus geolocation search, with Multer for image uploads
 */
const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const auth = require('../utils/auth');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// CREATE item
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, price, coordinates } = req.body;
    let imagePaths = [];
    if (req.files) {
      imagePaths = req.files.map(file => `/uploads/${file.filename}`);
    }

    const newItem = new Item({
      title,
      description,
      category,
      price,
      seller: req.userId,
      images: imagePaths,
      location: {
        type: 'Point',
        coordinates: coordinates ? JSON.parse(coordinates) : [0, 0]
      }
    });

    await newItem.save();
    res.status(201).json({ message: 'Item created', item: newItem });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all items (with pagination)
router.get('/', async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const items = await Item.find()
      .populate('seller', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Item.countDocuments();
    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET item by ID
router.get('/:itemId', async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId).populate('seller', 'fullName email');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE item
router.put('/:itemId', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, description, category, price, coordinates } = req.body;

    const updates = {
      title,
      description,
      category,
      price,
      updatedAt: new Date()
    };

    if (coordinates) {
      updates.location = {
        type: 'Point',
        coordinates: JSON.parse(coordinates)
      };
    }

    // If new images are uploaded
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map(file => `/uploads/${file.filename}`);
    }

    const item = await Item.findOneAndUpdate(
      { _id: itemId, seller: req.userId },
      updates,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found or unauthorized' });
    res.json({ message: 'Item updated', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE item
router.delete('/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findOneAndDelete({ _id: itemId, seller: req.userId });
    if (!item) return res.status(404).json({ message: 'Item not found or unauthorized' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SEARCH items by location
// e.g. GET /api/items/search/location?lng=-79.9959&lat=40.4406&radius=10
router.get('/search/location', async (req, res) => {
  const { lng, lat, radius } = req.query;
  if (!lng || !lat || !radius) {
    return res.status(400).json({ message: 'Please provide lng, lat, and radius' });
  }
  const distanceInMeters = parseFloat(radius) * 1609.34;

  try {
    const items = await Item.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: distanceInMeters
        }
      }
    }).populate('seller', 'fullName email');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
