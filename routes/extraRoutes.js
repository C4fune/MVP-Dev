/**
 * routes/extraRoutes.js
 * - Leaderboard logic
 * - Public profile page (show user items)
 * - Transaction history for user (private)
 */

const express = require('express');
const router = express.Router();
const auth = require('../utils/auth');
const User = require('../models/User');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// 1. Public profile page - show user's listed items
router.get('/profile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    // Get user basic info
    const user = await User.findById(userId).select('fullName email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get items listed by this user
    const items = await Item.find({ seller: userId });
    res.json({
      user,
      items
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Transaction history (for the logged-in user only)
router.get('/my-transactions', auth, async (req, res) => {
  try {
    // They can see only their own transactions
    const transactions = await Transaction.find({
      $or: [
        { buyer: req.userId },
        { seller: req.userId }
      ]
    })
    .populate('item')
    .populate('buyer', 'fullName email')
    .populate('seller', 'fullName email');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Leaderboard
// We'll rank users by total # of transactions + total sum of transactions
// Then assign ranks: top 10% => platinum, next 20% => gold, next 30% => silver, rest => bronze
router.get('/leaderboard', async (req, res) => {
  try {
    // We can do an aggregate to get user stats from Transaction table
    // Summarize ( count of transactions, total value ) per user
    const pipeline = [
      {
        $group: {
          _id: "$seller",
          totalTransactions: { $sum: 1 },
          totalValue: { $sum: "$finalPrice" }
        }
      },
      {
        $sort: { totalTransactions: -1, totalValue: -1 }
      }
    ];

    const stats = await Transaction.aggregate(pipeline);

    // We have an array of { _id: userId, totalTransactions, totalValue }
    // We'll determine percentile ranks
    // - We can combine them into a single array, then find indexes, etc.

    // Build an array of user ranks
    // For simplicity, we'll do an overall rank by totalValue + totalTransactions
    // Weighted approach: rankScore = totalTransactions * 1 + totalValue * 0.1
    const rankScores = stats.map(s => {
      const rankScore = s.totalTransactions * 1 + s.totalValue * 0.1;
      return { userId: s._id, rankScore, totalTransactions: s.totalTransactions, totalValue: s.totalValue };
    });

    // Sort by rankScore desc
    rankScores.sort((a, b) => b.rankScore - a.rankScore);

    // Assign percentile
    // For each i, percentile = i / (count - 1)
    const totalCount = rankScores.length;
    rankScores.forEach((rs, i) => {
      const percentile = (i / totalCount) * 100; // 0% for top index, 100% for bottom
      let rank = 'Bronze';
      if (percentile <= 10) rank = 'Platinum';
      else if (percentile <= 30) rank = 'Gold';
      else if (percentile <= 60) rank = 'Silver';
      rs.rank = rank;
    });

    // Now we need user info for each
    // We'll do a quick map
    const userIds = rankScores.map(r => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('fullName email');
    const userMap = {};
    users.forEach(u => userMap[u._id] = u);

    // Build the final array
    const leaderboard = rankScores.map(rs => {
      const user = userMap[rs.userId];
      return {
        userId: rs.userId,
        fullName: user ? user.fullName : 'Unknown',
        email: user ? user.email : 'Unknown',
        rank: rs.rank,
        totalTransactions: rs.totalTransactions,
        totalValue: rs.totalValue
      };
    });

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
