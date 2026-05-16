// Veritabanı bağlantısını alır — '../' bir üst klasöre çıkar (models → proje kökü)
const db = require('../db/connection');

function createUser(username, email, hashedPassword) {
    // SQL sorgusunu önceden hazırlar — her çağrıda tekrar parse edilmez, daha verimli
    const stmt = db.prepare(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    );
    // '?' işaretlerinin yerine sırasıyla değerleri koyar ve çalıştırır
    // INSERT/UPDATE/DELETE işlemleri için .run() kullanılır
    const result = stmt.run(username, email, hashedPassword);
    // Eklenen satırın otomatik atanan ID'sini döner
    return result.lastInsertRowid;
}

function findByEmail(email) {
    // Tek satır döner — bulunamazsa undefined döner
    // '?' parametreli sorgu: SQL Injection'a karşı koruma sağlar
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findById(id) {
    // Tek satır döner — bulunamazsa undefined döner
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Bu üç fonksiyonu dışarıya açar — başka dosyalar require() ile kullanabilir
module.exports = { createUser, findByEmail, findById };
