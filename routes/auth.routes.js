const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const requireAuth = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await authService.register(username, email, password);
    res.status(201).json({ message: 'Account created', user });
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 400).json({ error: err.message });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json(await authService.login(email, password));
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  authService.logout(req.token);
  res.json({ message: 'Logged out' });
});

module.exports = router;
