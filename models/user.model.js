const db = require('../db/connection');

const userModel = {
  create(username, email, hashedPassword) {
    const result = db.prepare(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    ).run(username, email, hashedPassword);
    return { id: result.lastInsertRowid, username, email };
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare(
      'SELECT id, username, email, created_at FROM users WHERE id = ?'
    ).get(id);
  },

  updateUsername(id, username) {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id);
    return this.findById(id);
  },

  delete(id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
};

module.exports = userModel;
