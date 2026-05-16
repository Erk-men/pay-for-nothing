const request = require('supertest');
  const app = require('../app');

  describe('Auth Routes', () => {

    describe('POST /api/auth/register', () => {
      it('should return 201 and a token', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ username: 'routeuser', email: 'route@example.com', password: 'pass1234' });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
      });

      it('should return 400 if fields are missing', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ email: 'missing@example.com' });
        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/auth/login', () => {
      it('should return 200 and a token', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({ username: 'loginroute', email: 'loginroute@example.com', password: 'pass1234' });
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'loginroute@example.com', password: 'pass1234' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
      });

      it('should return 401 for wrong credentials', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'nobody@example.com', password: 'wrongpass' });
        expect(res.status).toBe(401);
      });
    });

  });