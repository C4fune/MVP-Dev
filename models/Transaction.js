/**
 * models/Transaction.js
 * - Records completed sales
 *   buyer, seller, item, finalPrice, platformFee, date/time
 */
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  finalPrice: { type: Number, required: true },
  platformFee: { type: Number, required: true }, // 5% of finalPrice
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
