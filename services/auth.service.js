const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// user.model'den sadece ihtiyaç duyulan fonksiyonları alır
const { createUser, findByEmail } = require('../models/user.model');

async function register(username, email, password) {
  if (findByEmail(email)) throw new Error('Email already in use');
  // Şifreyi hashle — 10 salt round, brute force'a karşı koruma
  // async çünkü bcrypt.hash zaman alır, beklemek gerekir
  const hashedPassword = await bcrypt.hash(password, 10);
  // Kullanıcıyı veritabanına ekle — düz şifre değil, hash kaydedilir
  const userId = createUser(username, email, hashedPassword);
  // JWT token üret — içine userId gömer, 7 gün geçerli
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, userId };
}

async function login(email, password) {
  // Kullanıcıyı email ile bul — bulunamazsa undefined döner
  const user = findByEmail(email);
  // Hem "kullanıcı yok" hem "şifre yanlış" için aynı hata mesajı —
  // farklı mesaj verseydi saldırgan hangi email'in kayıtlı olduğunu anlardı
  if (!user) throw new Error('Invalid credentials');
  // Girilen düz şifreyi veritabanındaki hash ile karşılaştırır
  // Hash'i çözmez — aynı hash'i üretip karşılaştırır
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid credentials');
  // JWT token üret — içine userId gömer, 7 gün geçerli
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, userId: user.id };
}

module.exports = { register, login };
