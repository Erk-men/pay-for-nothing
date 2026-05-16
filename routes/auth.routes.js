 const express = require('express');
  const { register, login } = require('../services/auth.service');

  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    // Zorunlu alanlar eksikse 400 döner
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    try {
      const result = await register(username, email, password);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await login(email, password);
      res.status(200).json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  });

  module.exports = router;
