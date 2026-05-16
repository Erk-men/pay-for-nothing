require('dotenv').config();
const express = require('express');
  const authRoutes = require('./routes/auth.routes');
  const donationRoutes = require('./routes/donation.routes');

  const app = express();

  // Gelen JSON body'leri parse eder — olmadan req.body undefined gelir
  app.use(express.json());
  app.use('/api/donations', donationRoutes);

  app.use('/api/auth', authRoutes);

  module.exports = app; // app.js sadece Express uygulamasını kurar ve route'ları bağlar, dinleme işlemi server.js'de yapılır   