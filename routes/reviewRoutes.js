/**
 * routes/reviewRoutes.js
 */
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../utils/auth');

// Post a review
router.post('/', auth, async (req, res) => {
  try {
    const { reviewee, rating, comment } = req.body;
    if(reviewee === req.userId) {
      return res.status(400).json({ message: 'Cannot review yourself.' });
    }
    const newReview = new Review({
      reviewer: req.userId,
      reviewee,
      rating,
      comment
    });
    await newReview.save();
    res.status(201).json({ message: 'Review created', review: newReview });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Get reviews for user
router.get('/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'fullName email');
    res.json(reviews);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
