// Veritabanı bağlantısını alır — '../' bir üst klasöre çıkar (models → proje kökü)
const db = require('../db/connection');

function createDonation(userId, amount, note) {
    // INSERT işlemi — .run() kullanılır
    const stmt = db.prepare(
      'INSERT INTO donations (user_id, amount, note) VALUES (?, ?, ?)'
    );
    // '?' işaretlerinin yerine sırasıyla userId, amount, note koyar
    const result = stmt.run(userId, amount, note);
    // Eklenen satırın otomatik atanan ID'sini döner
    return result.lastInsertRowid;
}

function findByUserId(userId) {
    // Birden fazla satır gelebilir — .all() dizi döner, boşsa []
    // ORDER BY created_at DESC: en yeni donation en başta
    return db
      .prepare('SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);
}

function getLeaderboard() {
    // JOIN: iki tabloyu birleştirir — donations.user_id ile users.id eşleştirilir
    // SUM(donations.amount) AS total: her kullanıcının tüm donation'larını toplar, kolona "total" adı verilir
    // GROUP BY users.id: SUM() kullanırken zorunlu — "her kullanıcı için ayrı topla" demek
    // ORDER BY total DESC: en yüksek toplama sahip kullanıcı en üstte
    return db
      .prepare(
        `SELECT users.id, users.username, SUM(donations.amount) AS total
         FROM donations
         JOIN users ON donations.user_id = users.id
         GROUP BY users.id
         ORDER BY total DESC`
      )
      .all();
}

function updateDonation(id, amount, note) {
    // UPDATE işlemi — .run() kullanılır
    const result = db.prepare(
      'UPDATE donations SET amount = ?, note = ? WHERE id = ?'
    ).run(amount, note, id);
    // Değiştirilen satır sayısını döner — 0 ise id bulunamadı demektir
    return result.changes;
}

function deleteDonation(id) {
    // DELETE işlemi — .run() kullanılır
    const result = db.prepare('DELETE FROM donations WHERE id = ?').run(id);
    // Silinen satır sayısını döner — 0 ise id bulunamadı demektir
    return result.changes;
}

function findById(id) {
    // Bir satır döner — .get() kullanılır, id bulunmazsa undefined döner
    return db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
}

// Bu üç fonksiyonu dışarıya açar — başka dosyalar require() ile kullanabilir
module.exports = { createDonation, findByUserId, getLeaderboard, updateDonation, deleteDonation, findById };

