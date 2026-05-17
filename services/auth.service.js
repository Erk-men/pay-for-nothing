const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

// In-memory only — cleared on server restart. For production, use a Redis-backed store.
const blacklistedTokens = new Set();

const authService = {
  async register(username, email, password) {
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    return userModel.create(username, email, hashedPassword);
  },

  async login(email, password) {
    const user = userModel.findByEmail(email);
    if (!user) throw new Error('Invalid email or password');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid email or password');
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return { token, user: { id: user.id, username: user.username, email: user.email } };
  },

  logout(token) {
    blacklistedTokens.add(token);
  },

  verifyToken(token) {
    if (blacklistedTokens.has(token)) throw new Error('Token invalidated');
    return jwt.verify(token, process.env.JWT_SECRET);
  }
};

module.exports = authService;
