const { register, login } = require('../services/auth.service');
    const db = require('../db/connection');

  beforeEach(() => {
    db.exec('DELETE FROM donations');
    db.exec('DELETE FROM users');
  });
  describe('Auth Service', () => {

    describe('register', () => {
      it('should register a new user and return a token', async () => {
        const result = await register('testuser', 'test@example.com', 'password123');
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('userId');
      });

      it('should throw if email is already taken', async () => {
        await register('user2', 'duplicate@example.com', 'password123');
        await expect(
          register('user3', 'duplicate@example.com', 'password123')
        ).rejects.toThrow();
      });
    });

    describe('login', () => {
      it('should return a token for valid credentials', async () => {
        await register('loginuser', 'login@example.com', 'mypassword');
        const result = await login('login@example.com', 'mypassword');
        expect(result).toHaveProperty('token');
      });

      it('should throw if email not found', async () => {
        await expect(
          login('noone@example.com', 'password123')
        ).rejects.toThrow('Invalid credentials');
      });

      it('should throw if password is wrong', async () => {
        await register('passuser', 'pass@example.com', 'correctpass');
        await expect(
          login('pass@example.com', 'wrongpass')
        ).rejects.toThrow('Invalid credentials');
      });
    });

  });