const express = require('express');
const router = express.Router();
const donationService = require('../services/donation.service');
const requireAuth = require('../middleware/auth.middleware');

router.post('/', requireAuth, (req, res) => {
  try {
    const { amount, note } = req.body;
    res.status(201).json(donationService.add(req.user.id, amount, note));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/mine', requireAuth, (req, res) => {
  res.json(donationService.getMyDonations(req.user.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    donationService.delete(parseInt(req.params.id), req.user.id);
    res.json({ message: 'Donation deleted' });
  } catch (err) {
    res.status(err.message === 'Not authorized' ? 403 : 404).json({ error: err.message });
  }
});

module.exports = router;
