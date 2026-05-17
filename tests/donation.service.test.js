const donationService = require('../services/donation.service');
const userModel = require('../models/user.model');
const db = require('../db/connection');
const bcrypt = require('bcryptjs');

let uid;

beforeEach(async () => {
  db.exec('DELETE FROM donations; DELETE FROM users;');
  const hash = await bcrypt.hash('password', 1);
  uid = userModel.create('tester', 'test@test.com', hash).id;
});

describe('add', () => {
  test('throws on non-numeric amount', () => {
    expect(() => donationService.add(uid, 'abc', null)).toThrow('positive number');
  });
  test('throws on zero', () => {
    expect(() => donationService.add(uid, 0, null)).toThrow('positive number');
  });
  test('throws on negative', () => {
    expect(() => donationService.add(uid, -5, null)).toThrow('positive number');
  });
  test('throws over 1,000,000', () => {
    expect(() => donationService.add(uid, 1000001, null)).toThrow('cannot exceed');
  });
  test('creates donation for valid amount', () => {
    const d = donationService.add(uid, 42.5, 'hello void');
    expect(d.amount).toBe(42.5);
    expect(d.userId).toBe(uid);
    expect(d.note).toBe('hello void');
  });
});

describe('getTotal', () => {
  test('returns 0 when no donations', () => {
    expect(donationService.getTotal(uid)).toBe(0);
  });
  test('sums all donations', () => {
    donationService.add(uid, 10, null);
    donationService.add(uid, 25.5, null);
    expect(donationService.getTotal(uid)).toBe(35.5);
  });
});

describe('delete', () => {
  test('throws when donation not found', () => {
    expect(() => donationService.delete(9999, uid)).toThrow('not found');
  });
  test('throws when deleting another user donation', async () => {
    const hash = await bcrypt.hash('pass', 1);
    const other = userModel.create('other', 'other@t.com', hash);
    const d = donationService.add(other.id, 5, null);
    expect(() => donationService.delete(d.id, uid)).toThrow('Not authorized');
  });
  test('deletes own donation', () => {
    const d = donationService.add(uid, 5, null);
    expect(() => donationService.delete(d.id, uid)).not.toThrow();
    expect(donationService.getTotal(uid)).toBe(0);
  });
});
