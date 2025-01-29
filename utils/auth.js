/**
 * utils/auth.js
 */
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader) {
    return res.status(401).json({ message: 'No authorization header' });
  }
  const token = authHeader.split(' ')[1];
  if(!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
