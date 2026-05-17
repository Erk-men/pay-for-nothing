const db = require('../db/connection');

const donationModel = {
  create(userId, amount, note = null) {
    const result = db.prepare(
      'INSERT INTO donations (user_id, amount, note) VALUES (?, ?, ?)'
    ).run(userId, amount, note);
    return { id: result.lastInsertRowid, userId, amount, note };
  },

  findByUserId(userId) {
    return db.prepare(
      'SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
  },

  findById(id) {
    return db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
  },

  delete(id) {
    db.prepare('DELETE FROM donations WHERE id = ?').run(id);
  },

  getTotalByUserId(userId) {
    const row = db.prepare(
      'SELECT SUM(amount) as total FROM donations WHERE user_id = ?'
    ).get(userId);
    return row.total || 0;
  },

  getLeaderboard() {
    return db.prepare(`
      SELECT u.username, SUM(d.amount) AS total, COUNT(d.id) AS donation_count
      FROM donations d
      JOIN users u ON d.user_id = u.id
      GROUP BY d.user_id
      ORDER BY total DESC
    `).all();
  }
};

module.exports = donationModel;
