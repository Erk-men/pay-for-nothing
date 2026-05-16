const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { createDonation, getLeaderboard, updateDonation, deleteDonation, findById } = require('../models/donation.model');

router.get('/leaderboard', async (req, res) => {
    const leaderboard = await getLeaderboard();
    res.status(200).json(leaderboard);
});

router.post('/', authMiddleware, async (req, res) => {
    const { amount, message } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });

    const id = createDonation(req.user.userId, amount, message);
    res.status(201).json({ id });
});

router.put('/:id', authMiddleware, async (req, res) => {
    const donation = findById(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    if (donation.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const { amount, message } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });

    updateDonation(req.params.id, amount, message);
    res.status(200).json({ message: 'Donation updated' });
});

router.delete('/:id', authMiddleware, async (req, res) => {
    const donation = findById(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    if (donation.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
    
    deleteDonation(req.params.id);
    res.status(200).json({ message: 'Donation deleted' });
});

module.exports = router;