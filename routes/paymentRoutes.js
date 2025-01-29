/**
 * routes/paymentRoutes.js
 * - Example Stripe integration
 * - Finalize transaction (5% fee) and record in DB
 */
const express = require('express');
const router = express.Router();
const auth = require('../utils/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// Create payment intent
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // The final price is in "cents" for Stripe
    // For example item.price = 100 => $100 * 100 = 10000
    // But this is simplified
    const amountInCents = Math.round(item.price * 100);

    // Create a payment intent on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        itemId: item._id.toString(),
        sellerId: item.seller.toString(),
        buyerId: req.userId.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Confirm payment & create transaction record
router.post('/confirm', auth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent) {
      return res.status(400).json({ message: 'Invalid payment intent' });
    }

    const { itemId, sellerId, buyerId } = paymentIntent.metadata;
    const item = await Item.findById(itemId).populate('seller');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if buyer/seller match
    if (sellerId !== item.seller._id.toString() || buyerId !== req.userId.toString()) {
      return res.status(400).json({ message: 'Invalid buyer or seller' });
    }

    // If payment is successful, record the transaction
    // 5% fee
    const platformFee = item.price * 0.05;
    const transaction = new Transaction({
      item: item._id,
      buyer: buyerId,
      seller: sellerId,
      finalPrice: item.price,
      platformFee
    });
    await transaction.save();

    // (Optional) Mark item as "sold" or remove it from listing
    // For simplicity, let's delete the item
    //   or we could add a "sold" field
    await Item.findByIdAndDelete(itemId);

    res.json({ message: 'Payment confirmed, transaction recorded', transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
