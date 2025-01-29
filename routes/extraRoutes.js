/**
 * routes/extraRoutes.js
 */
const express = require('express');
const router = express.Router();
const auth = require('../utils/auth');
const User = require('../models/User');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// Public profile: user + items
router.get('/profile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('fullName email');
    if(!user) return res.status(404).json({ message: 'User not found' });
    const items = await Item.find({ seller: userId });
    res.json({ user, items });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// My transactions (private)
router.get('/my-transactions', auth, async (req, res) => {
  try {
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
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    // Summarize user stats from Transaction
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

    // rankScore = totalTx + (totalValue*0.1)
    const rankScores = stats.map(s => {
      const rankScore = s.totalTransactions + s.totalValue*0.1;
      return {
        userId: s._id,
        rankScore,
        totalTransactions: s.totalTransactions,
        totalValue: s.totalValue
      };
    });
    rankScores.sort((a,b) => b.rankScore - a.rankScore);

    // percentile-based rank
    const totalCount = rankScores.length;
    rankScores.forEach((rs,i) => {
      const percentile = (i / totalCount) * 100; // 0% top, 100% bottom
      let rank = 'Bronze';
      if(percentile <= 10) rank = 'Platinum';
      else if(percentile <= 30) rank = 'Gold';
      else if(percentile <= 60) rank = 'Silver';
      rs.rank = rank;
    });

    // Map user info
    const userIds = rankScores.map(r => r.userId);
    const users = await User.find({ _id: { $in: userIds }}).select('fullName email');
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u; });

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
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
