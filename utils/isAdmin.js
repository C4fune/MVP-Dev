/**
 * utils/isAdmin.js
 */
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if(!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if(user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
};
