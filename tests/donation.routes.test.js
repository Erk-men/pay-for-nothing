const request = require('supertest');
const app = require('../app');
const db = require('../db/connection');

describe('Donation Routes', () => {

  let token;

  beforeEach(async () => {
    db.exec('DELETE FROM donations; DELETE FROM users;');
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'donor', email: 'donor@example.com', password: 'pass1234' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor@example.com', password: 'pass1234' });
    token = res.body.token;
  });

  describe('POST /api/donations', () => {
    it('should return 401 if no token', async () => {
      const res = await request(app)
        .post('/api/donations')
        .send({ amount: 50 });
      expect(res.status).toBe(401);
    });

    it('should create a donation and return 201', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50, note: 'Go team!' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('should return 400 if amount is missing', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'no amount' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/leaderboard', () => {
    it('should return 200 and an array', async () => {
      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('DELETE /api/donations/:id', () => {
    it('should delete a donation and return 200', async () => {
      const create = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50, note: 'to delete' });
      const donationId = create.body.id;

      const res = await request(app)
        .delete(`/api/donations/${donationId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 if donation not found', async () => {
      const res = await request(app)
        .delete('/api/donations/9999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

});
