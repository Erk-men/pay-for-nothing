const donationModel = require('../models/donation.model');

const leaderboardService = {
  getRankings() {
    return donationModel.getLeaderboard();
  }
};

module.exports = leaderboardService;
