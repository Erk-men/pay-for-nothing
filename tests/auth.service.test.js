const authService = require('../services/auth.service');
const db = require('../db/connection');

beforeEach(() => {
  db.exec('DELETE FROM donations; DELETE FROM users;');
});

describe('register', () => {
  test('throws if username is empty', async () => {
    await expect(authService.register('', 'a@b.com', 'password123'))
      .rejects.toThrow('All fields are required');
  });

  test('throws if password under 8 chars', async () => {
    await expect(authService.register('alice', 'a@b.com', '123'))
      .rejects.toThrow('at least 8 characters');
  });

  test('returns id and username (no password)', async () => {
    const user = await authService.register('alice', 'alice@test.com', 'password123');
    expect(user.id).toBeDefined();
    expect(user.username).toBe('alice');
    expect(user.password).toBeUndefined();
  });
});

describe('login', () => {
  test('throws on unknown email', async () => {
    await expect(authService.login('nobody@test.com', 'anything'))
      .rejects.toThrow('Invalid email or password');
  });

  test('throws on wrong password', async () => {
    await authService.register('bob', 'bob@test.com', 'correctpass');
    await expect(authService.login('bob@test.com', 'wrongpass'))
      .rejects.toThrow('Invalid email or password');
  });

  test('returns token on valid credentials', async () => {
    await authService.register('carol', 'carol@test.com', 'mypassword');
    const result = await authService.login('carol@test.com', 'mypassword');
    expect(result.token).toBeDefined();
    expect(result.user.username).toBe('carol');
    expect(result.user.password).toBeUndefined();
  });
});

describe('verifyToken', () => {
  test('throws on blacklisted token', async () => {
    await authService.register('dave', 'dave@test.com', 'password99');
    const { token } = await authService.login('dave@test.com', 'password99');
    authService.logout(token);
    expect(() => authService.verifyToken(token)).toThrow('Token invalidated');
  });

  test('returns decoded payload for valid token', async () => {
    await authService.register('eve', 'eve@test.com', 'password88');
    const { token } = await authService.login('eve@test.com', 'password88');
    const decoded = authService.verifyToken(token);
    expect(decoded.username).toBe('eve');
  });
});
