const express = require('express');
const router = express.Router();
const userModel = require('../models/user.model');
const requireAuth = require('../middleware/auth.middleware');

router.get('/me', requireAuth, (req, res) => {
  const user = userModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/me', requireAuth, (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }
    res.json(userModel.updateUsername(req.user.id, username.trim()));
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 400).json({ error: err.message });
  }
});

router.delete('/me', requireAuth, (req, res) => {
  userModel.delete(req.user.id);
  res.json({ message: 'Account deleted' });
});

module.exports = router;
