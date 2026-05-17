const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const donationService = require('../services/donation.service');
const userModel = require('../models/user.model');
const certificateService = require('../services/certificate.service');

router.get('/pdf', requireAuth, (req, res) => {
  const total = donationService.getTotal(req.user.id);
  if (total === 0) {
    return res.status(400).json({ error: 'You need at least one donation to earn a certificate' });
  }
  const user = userModel.findById(req.user.id);
  try {
    certificateService.generate(user.username, total, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF generation failed' });
    }
  }
});

module.exports = router;
