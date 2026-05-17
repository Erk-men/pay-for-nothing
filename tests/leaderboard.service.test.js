const leaderboardService = require('../services/leaderboard.service');
const donationModel = require('../models/donation.model');
const userModel = require('../models/user.model');
const db = require('../db/connection');
const bcrypt = require('bcryptjs');

beforeEach(() => {
  db.exec('DELETE FROM donations; DELETE FROM users;');
});

describe('getRankings', () => {
  test('returns empty array when no donations', () => {
    expect(leaderboardService.getRankings()).toEqual([]);
  });

  test('orders by total descending', async () => {
    const hash = await bcrypt.hash('p', 1);
    const rich = userModel.create('rich', 'r@t.com', hash);
    const poor = userModel.create('poor', 'p@t.com', hash);
    donationModel.create(rich.id, 100, null);
    donationModel.create(poor.id, 50, null);
    const r = leaderboardService.getRankings();
    expect(r[0].username).toBe('rich');
    expect(r[1].username).toBe('poor');
  });

  test('sums multiple donations for same user', async () => {
    const hash = await bcrypt.hash('p', 1);
    const u = userModel.create('multi', 'm@t.com', hash);
    donationModel.create(u.id, 30, null);
    donationModel.create(u.id, 70, null);
    const r = leaderboardService.getRankings();
    expect(r[0].total).toBe(100);
  });

  test('includes donation_count', async () => {
    const hash = await bcrypt.hash('p', 1);
    const u = userModel.create('counter', 'c@t.com', hash);
    donationModel.create(u.id, 10, null);
    donationModel.create(u.id, 20, null);
    donationModel.create(u.id, 30, null);
    const r = leaderboardService.getRankings();
    expect(r[0].donation_count).toBe(3);
  });
});
