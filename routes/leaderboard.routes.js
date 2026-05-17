const express = require('express');
const router = express.Router();
const leaderboardService = require('../services/leaderboard.service');

router.get('/', (req, res) => {
  res.json(leaderboardService.getRankings());
});

module.exports = router;
