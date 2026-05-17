const donationModel = require('../models/donation.model');

const donationService = {
  add(userId, amount, note) {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (parsed > 1_000_000) {
      throw new Error('Amount cannot exceed 1,000,000');
    }
    return donationModel.create(userId, parsed, note || null);
  },

  getMyDonations(userId) {
    return donationModel.findByUserId(userId);
  },

  getTotal(userId) {
    return donationModel.getTotalByUserId(userId);
  },

  delete(donationId, userId) {
    const donation = donationModel.findById(donationId);
    if (!donation) throw new Error('Donation not found');
    if (donation.user_id !== userId) throw new Error('Not authorized');
    donationModel.delete(donationId);
  }
};

module.exports = donationService;
