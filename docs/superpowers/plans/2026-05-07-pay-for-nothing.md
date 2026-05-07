# Pay for Nothing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack "Pay for Nothing" leaderboard web app — users register, donate simulated money for nothing, and compete on a public ranking with PDF certificates, JWT auth, and Swagger docs.

**Architecture:** Layered — Routes receive requests, Services contain all business logic (unit-testable), Models execute parameterized SQL, DB is SQLite. Frontend is a Vanilla JS SPA served by Express using hash-based routing.

**Tech Stack:** Node.js, Express, better-sqlite3, bcryptjs, jsonwebtoken, pdfkit, helmet, cors, express-rate-limit, swagger-ui-express, Jest, dotenv

---

## File Map

```
project-root/
├── package.json
├── jest.config.js
├── .env                          ← secrets (gitignored)
├── .env.example                  ← safe to commit
├── .gitignore
├── README.md
├── server.js                     ← app entry, wires everything
├── db/
│   ├── connection.js             ← SQLite connection singleton
│   └── schema.sql                ← CREATE TABLE statements
├── models/
│   ├── user.model.js             ← SQL queries for users
│   └── donation.model.js         ← SQL queries for donations
├── services/
│   ├── auth.service.js           ← register/login/logout/verifyToken
│   ├── donation.service.js       ← add/getTotal/delete logic
│   ├── leaderboard.service.js    ← ranking query logic
│   └── certificate.service.js   ← PDF generation
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── donation.routes.js
│   ├── leaderboard.routes.js
│   └── certificate.routes.js
├── middleware/
│   ├── auth.middleware.js        ← JWT verification
│   └── rateLimit.js              ← login rate limiter
├── swagger/
│   └── swagger.json              ← OpenAPI 3.0 spec
├── tests/
│   ├── setup.js                  ← env vars for all tests
│   ├── auth.service.test.js
│   ├── donation.service.test.js
│   └── leaderboard.service.test.js
└── public/                       ← frontend, served as static
    ├── index.html
    ├── style.css
    ├── app.js                    ← router + shared helpers
    ├── leaderboard.js
    ├── auth.js
    └── dashboard.js
```

---

## Task 1: Project Setup

**Files:** `package.json`, `.gitignore`, `.env`, `jest.config.js`, `tests/setup.js`

- [ ] **Step 1: Initialize npm**

```bash
npm init -y
```

- [ ] **Step 2: Install backend dependencies**

```bash
npm install express better-sqlite3 bcryptjs jsonwebtoken pdfkit helmet cors express-rate-limit swagger-ui-express dotenv
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev jest nodemon
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.env
database.db
*.db
```

- [ ] **Step 5: Create `.env`**

```
PORT=3000
JWT_SECRET=change-this-to-a-long-random-string-in-production
DB_PATH=./database.db
FRONTEND_ORIGIN=http://localhost:3000
```

- [ ] **Step 6: Create `.env.example`** (safe to commit)

```
PORT=3000
JWT_SECRET=replace-this-with-a-long-random-secret
DB_PATH=./database.db
FRONTEND_ORIGIN=http://localhost:3000
```

- [ ] **Step 7: Create `jest.config.js`**

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  forceExit: true
};
```

- [ ] **Step 8: Update `package.json` scripts**

Replace the `"scripts"` block:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest --runInBand"
}
```

- [ ] **Step 9: Create `tests/setup.js`**

```javascript
// Set env vars before any app modules are loaded.
// Tests use an in-memory DB — your real data is never touched.
process.env.JWT_SECRET = 'test-secret-key-for-jest-only';
process.env.DB_PATH = ':memory:';
```

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example jest.config.js tests/setup.js
git commit -m "chore: project setup and dependencies"
```

---

## Task 2: Database Schema and Connection

**Files:** `db/schema.sql`, `db/connection.js`

- [ ] **Step 1: Create `db/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  username   TEXT     NOT NULL UNIQUE,
  email      TEXT     NOT NULL UNIQUE,
  password   TEXT     NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER  NOT NULL,
  amount     REAL     NOT NULL,
  note       TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

> `ON DELETE CASCADE` means when a user is deleted, all their donations are automatically deleted too.

- [ ] **Step 2: Create `db/connection.js`**

```javascript
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './database.db';
const db = new Database(dbPath);

// SQLite disables foreign key enforcement by default
db.pragma('foreign_keys = ON');

// Create tables if they don't exist (safe to run every startup)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
```

> This module is loaded once and cached. Every file that `require('../db/connection')` gets the same connection object.

- [ ] **Step 3: Verify it works**

```bash
node -e "require('dotenv').config(); require('./db/connection'); console.log('DB OK');"
```

Expected: `DB OK`

- [ ] **Step 4: Commit**

```bash
git add db/
git commit -m "feat: database schema and connection"
```

---

## Task 3: User and Donation Models

**Files:** `models/user.model.js`, `models/donation.model.js`

> All SQL queries live in model files. Using `?` placeholders prevents SQL injection — user input is treated as data, never as SQL code.

- [ ] **Step 1: Create `models/user.model.js`**

```javascript
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
    // Never include password in API responses
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
```

- [ ] **Step 2: Create `models/donation.model.js`**

```javascript
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
  }
};

module.exports = donationModel;
```

- [ ] **Step 3: Commit**

```bash
git add models/
git commit -m "feat: user and donation models"
```

---

## Task 4: Auth Service (TDD)

**Files:** `services/auth.service.js`, `tests/auth.service.test.js`

- [ ] **Step 1: Write failing tests — `tests/auth.service.test.js`**

```javascript
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
```

- [ ] **Step 2: Run — must FAIL**

```bash
npm test tests/auth.service.test.js
```

Expected: FAIL — `Cannot find module '../services/auth.service'`

- [ ] **Step 3: Create `services/auth.service.js`**

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

const blacklistedTokens = new Set();

const authService = {
  async register(username, email, password) {
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    return userModel.create(username, email, hashedPassword);
  },

  async login(email, password) {
    const user = userModel.findByEmail(email);
    if (!user) throw new Error('Invalid email or password');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid email or password');
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return { token, user: { id: user.id, username: user.username, email: user.email } };
  },

  logout(token) {
    blacklistedTokens.add(token);
  },

  verifyToken(token) {
    if (blacklistedTokens.has(token)) throw new Error('Token invalidated');
    return jwt.verify(token, process.env.JWT_SECRET);
  }
};

module.exports = authService;
```

- [ ] **Step 4: Run — must PASS**

```bash
npm test tests/auth.service.test.js
```

Expected: All tests PASS ✓

- [ ] **Step 5: Commit**

```bash
git add services/auth.service.js tests/auth.service.test.js
git commit -m "feat: auth service with TDD"
```

---

## Task 5: Donation Service (TDD)

**Files:** `services/donation.service.js`, `tests/donation.service.test.js`

- [ ] **Step 1: Write failing tests — `tests/donation.service.test.js`**

```javascript
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
```

- [ ] **Step 2: Run — must FAIL**

```bash
npm test tests/donation.service.test.js
```

- [ ] **Step 3: Create `services/donation.service.js`**

```javascript
const donationModel = require('../models/donation.model');

const donationService = {
  add(userId, amount, note) {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (parsed > 1_000_000) {
      throw new Error('Amount cannot exceed 1,000,000');
    }
    return donationModel.create(userId, parsed, note || null);
  },

  getMyDonations(userId) {
    return donationModel.findByUserId(userId);
  },

  getTotal(userId) {
    return donationModel.getTotalByUserId(userId);
  },

  delete(donationId, userId) {
    const donation = donationModel.findById(donationId);
    if (!donation) throw new Error('Donation not found');
    if (donation.user_id !== userId) throw new Error('Not authorized');
    donationModel.delete(donationId);
  }
};

module.exports = donationService;
```

- [ ] **Step 4: Run — must PASS**

```bash
npm test tests/donation.service.test.js
```

- [ ] **Step 5: Commit**

```bash
git add services/donation.service.js tests/donation.service.test.js
git commit -m "feat: donation service with TDD"
```

---

## Task 6: Leaderboard Service (TDD)

**Files:** `services/leaderboard.service.js`, `tests/leaderboard.service.test.js`

- [ ] **Step 1: Write failing tests — `tests/leaderboard.service.test.js`**

```javascript
const leaderboardService = require('../services/leaderboard.service');
const donationModel = require('../models/donation.model');
const userModel = require('../models/user.model');
const db = require('../db/connection');
const bcrypt = require('bcryptjs');

beforeEach(() => {
  db.exec('DELETE FROM donations; DELETE FROM users;');
});

describe('getRankings', () => {
  test('returns empty array when no donations', () => {
    expect(leaderboardService.getRankings()).toEqual([]);
  });

  test('orders by total descending', async () => {
    const hash = await bcrypt.hash('p', 1);
    const rich = userModel.create('rich', 'r@t.com', hash);
    const poor = userModel.create('poor', 'p@t.com', hash);
    donationModel.create(rich.id, 100, null);
    donationModel.create(poor.id, 50, null);
    const r = leaderboardService.getRankings();
    expect(r[0].username).toBe('rich');
    expect(r[1].username).toBe('poor');
  });

  test('sums multiple donations for same user', async () => {
    const hash = await bcrypt.hash('p', 1);
    const u = userModel.create('multi', 'm@t.com', hash);
    donationModel.create(u.id, 30, null);
    donationModel.create(u.id, 70, null);
    const r = leaderboardService.getRankings();
    expect(r[0].total).toBe(100);
  });

  test('includes donation_count', async () => {
    const hash = await bcrypt.hash('p', 1);
    const u = userModel.create('counter', 'c@t.com', hash);
    donationModel.create(u.id, 10, null);
    donationModel.create(u.id, 20, null);
    donationModel.create(u.id, 30, null);
    const r = leaderboardService.getRankings();
    expect(r[0].donation_count).toBe(3);
  });
});
```

- [ ] **Step 2: Run — must FAIL**

```bash
npm test tests/leaderboard.service.test.js
```

- [ ] **Step 3: Create `services/leaderboard.service.js`**

```javascript
const db = require('../db/connection');

const leaderboardService = {
  getRankings() {
    return db.prepare(`
      SELECT u.username, SUM(d.amount) AS total, COUNT(d.id) AS donation_count
      FROM donations d
      JOIN users u ON d.user_id = u.id
      GROUP BY d.user_id
      ORDER BY total DESC
    `).all();
  },

  getUserRank(userId) {
    const rows = db.prepare(
      'SELECT user_id, SUM(amount) AS total FROM donations GROUP BY user_id ORDER BY total DESC'
    ).all();
    const i = rows.findIndex(r => r.user_id === userId);
    return i === -1 ? null : i + 1;
  }
};

module.exports = leaderboardService;
```

- [ ] **Step 4: Run all tests — all must PASS**

```bash
npm test
```

Expected: All 3 test suites PASS ✓

- [ ] **Step 5: Commit**

```bash
git add services/leaderboard.service.js tests/leaderboard.service.test.js
git commit -m "feat: leaderboard service with TDD"
```

---

## Task 7: Certificate Service

**Files:** `services/certificate.service.js`

- [ ] **Step 1: Create `services/certificate.service.js`**

```javascript
const PDFDocument = require('pdfkit');

const certificateService = {
  generate(username, total, res) {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 50, bottom: 50, left: 72, right: 72 } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${username}.pdf"`);
    doc.pipe(res);

    const W = doc.page.width;
    const H = doc.page.height;

    // Gold borders
    doc.rect(20, 20, W - 40, H - 40).lineWidth(4).strokeColor('#D4AF37').stroke();
    doc.rect(30, 30, W - 60, H - 60).lineWidth(1).strokeColor('#D4AF37').stroke();

    // Watermark
    doc.save()
      .rotate(-25, { origin: [W / 2, H / 2] })
      .fontSize(90).fillColor('#eeeeee')
      .text('FOR NOTHING', 60, H / 2 - 60, { align: 'center', width: W - 120 })
      .restore();

    // Title
    doc.fillColor('#1a1a1a').fontSize(30).font('Helvetica-Bold')
      .text('Certificate of Pointless Contribution', { align: 'center' }).moveDown(0.8);

    // Body
    doc.fontSize(16).font('Helvetica').text('This certifies that', { align: 'center' }).moveDown(0.3);
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#8B0000')
      .text(username, { align: 'center' }).moveDown(0.3);
    doc.fontSize(16).font('Helvetica').fillColor('#1a1a1a')
      .text(`has generously contributed $${total.toFixed(2)} to absolutely nothing.`, { align: 'center' })
      .moveDown(1.2);

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fontSize(12).fillColor('#666666')
      .text(`Witness: The Void    •    Date: ${dateStr}`, { align: 'center' });

    doc.end();
  }
};

module.exports = certificateService;
```

- [ ] **Step 2: Commit**

```bash
git add services/certificate.service.js
git commit -m "feat: certificate PDF service"
```

---

## Task 8: Middleware

**Files:** `middleware/auth.middleware.js`, `middleware/rateLimit.js`

- [ ] **Step 1: Create `middleware/auth.middleware.js`**

```javascript
const authService = require('../services/auth.service');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = authService.verifyToken(token);
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;
```

- [ ] **Step 2: Create `middleware/rateLimit.js`**

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { loginLimiter };
```

- [ ] **Step 3: Commit**

```bash
git add middleware/
git commit -m "feat: auth middleware and rate limiter"
```

---

## Task 9: All Routes

**Files:** `routes/auth.routes.js`, `routes/user.routes.js`, `routes/donation.routes.js`, `routes/leaderboard.routes.js`, `routes/certificate.routes.js`

- [ ] **Step 1: Create `routes/auth.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const requireAuth = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await authService.register(username, email, password);
    res.status(201).json({ message: 'Account created', user });
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 400).json({ error: err.message });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json(await authService.login(email, password));
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  authService.logout(req.token);
  res.json({ message: 'Logged out' });
});

module.exports = router;
```

- [ ] **Step 2: Create `routes/user.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const userModel = require('../models/user.model');
const requireAuth = require('../middleware/auth.middleware');

router.get('/me', requireAuth, (req, res) => {
  const user = userModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/me', requireAuth, (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }
    res.json(userModel.updateUsername(req.user.id, username.trim()));
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 400).json({ error: err.message });
  }
});

router.delete('/me', requireAuth, (req, res) => {
  userModel.delete(req.user.id);
  res.json({ message: 'Account deleted' });
});

module.exports = router;
```

- [ ] **Step 3: Create `routes/donation.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const donationService = require('../services/donation.service');
const requireAuth = require('../middleware/auth.middleware');

router.post('/', requireAuth, (req, res) => {
  try {
    const { amount, note } = req.body;
    res.status(201).json(donationService.add(req.user.id, amount, note));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/mine', requireAuth, (req, res) => {
  res.json(donationService.getMyDonations(req.user.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    donationService.delete(parseInt(req.params.id), req.user.id);
    res.json({ message: 'Donation deleted' });
  } catch (err) {
    res.status(err.message === 'Not authorized' ? 403 : 404).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 4: Create `routes/leaderboard.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const leaderboardService = require('../services/leaderboard.service');

router.get('/', (req, res) => {
  res.json(leaderboardService.getRankings());
});

module.exports = router;
```

- [ ] **Step 5: Create `routes/certificate.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const donationService = require('../services/donation.service');
const userModel = require('../models/user.model');
const certificateService = require('../services/certificate.service');

router.get('/pdf', requireAuth, (req, res) => {
  const total = donationService.getTotal(req.user.id);
  if (total === 0) {
    return res.status(400).json({ error: 'You need at least one donation to earn a certificate' });
  }
  const user = userModel.findById(req.user.id);
  certificateService.generate(user.username, total, res);
});

module.exports = router;
```

- [ ] **Step 6: Commit**

```bash
git add routes/
git commit -m "feat: all API routes"
```

---

## Task 10: Swagger Documentation

**Files:** `swagger/swagger.json`

- [ ] **Step 1: Create `swagger/swagger.json`**

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Pay for Nothing API",
    "version": "1.0.0",
    "description": "Users pay simulated money for nothing and compete on a public leaderboard."
  },
  "servers": [{ "url": "http://localhost:3000/api" }],
  "components": {
    "securitySchemes": {
      "bearerAuth": { "type": "http", "scheme": "bearer", "bearerFormat": "JWT" }
    },
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "username": { "type": "string" },
          "email": { "type": "string" },
          "created_at": { "type": "string" }
        }
      },
      "Donation": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "userId": { "type": "integer" },
          "amount": { "type": "number" },
          "note": { "type": "string" },
          "created_at": { "type": "string" }
        }
      },
      "LeaderboardEntry": {
        "type": "object",
        "properties": {
          "username": { "type": "string" },
          "total": { "type": "number" },
          "donation_count": { "type": "integer" }
        }
      },
      "Error": {
        "type": "object",
        "properties": { "error": { "type": "string" } }
      }
    }
  },
  "paths": {
    "/auth/register": {
      "post": {
        "summary": "Create a new account",
        "tags": ["Auth"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["username", "email", "password"],
                "properties": {
                  "username": { "type": "string", "example": "VoidPayer" },
                  "email": { "type": "string", "example": "void@example.com" },
                  "password": { "type": "string", "example": "securepass123" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Account created" },
          "400": { "description": "Validation error", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
          "409": { "description": "Email or username already taken" }
        }
      }
    },
    "/auth/login": {
      "post": {
        "summary": "Login and receive JWT token",
        "tags": ["Auth"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                  "email": { "type": "string", "example": "void@example.com" },
                  "password": { "type": "string", "example": "securepass123" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "token": { "type": "string" },
                    "user": { "$ref": "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "401": { "description": "Invalid credentials" }
        }
      }
    },
    "/auth/logout": {
      "post": {
        "summary": "Invalidate current JWT",
        "tags": ["Auth"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Logged out" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/users/me": {
      "get": {
        "summary": "Get your profile",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "User profile", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/User" } } } },
          "401": { "description": "Not authenticated" }
        }
      },
      "put": {
        "summary": "Update display name",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["username"],
                "properties": { "username": { "type": "string", "example": "NewName" } }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Updated" },
          "400": { "description": "Too short" },
          "409": { "description": "Name taken" }
        }
      },
      "delete": {
        "summary": "Delete account and all donations",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Deleted" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/donations": {
      "post": {
        "summary": "Add a donation",
        "tags": ["Donations"],
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["amount"],
                "properties": {
                  "amount": { "type": "number", "example": 42.00 },
                  "note": { "type": "string", "example": "I have too much money" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Donation created", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Donation" } } } },
          "400": { "description": "Invalid amount" }
        }
      }
    },
    "/donations/mine": {
      "get": {
        "summary": "Get your donation history",
        "tags": ["Donations"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of donations", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Donation" } } } } }
        }
      }
    },
    "/donations/{id}": {
      "delete": {
        "summary": "Delete one of your donations",
        "tags": ["Donations"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "in": "path", "name": "id", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Deleted" },
          "403": { "description": "Not your donation" },
          "404": { "description": "Not found" }
        }
      }
    },
    "/leaderboard": {
      "get": {
        "summary": "Get public ranked leaderboard",
        "tags": ["Leaderboard"],
        "responses": {
          "200": { "description": "Rankings", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/LeaderboardEntry" } } } } }
        }
      }
    },
    "/certificate/pdf": {
      "get": {
        "summary": "Download your PDF certificate",
        "tags": ["Certificate"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "PDF file", "content": { "application/pdf": {} } },
          "400": { "description": "No donations yet" },
          "401": { "description": "Not authenticated" }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add swagger/
git commit -m "docs: OpenAPI/Swagger specification"
```

---

## Task 11: Server Entry Point

**Files:** `server.js`

- [ ] **Step 1: Create `server.js`**

```javascript
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger.json');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/donations', require('./routes/donation.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/certificate', require('./routes/certificate.routes'));

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
```

- [ ] **Step 2: Start the server**

```bash
npm run dev
```

Expected:
```
Server: http://localhost:3000
API docs: http://localhost:3000/api-docs
```

Open `http://localhost:3000/api-docs` — Swagger UI should show all endpoints.

- [ ] **Step 3: Run all tests — must still pass**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: server entry point — wires all routes"
```

---

## Task 12: Frontend HTML and CSS

**Files:** `public/index.html`, `public/style.css`

- [ ] **Step 1: Create `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pay for Nothing</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav>
    <a href="#leaderboard" class="brand">🏆 Pay for Nothing</a>
    <div class="nav-links">
      <span id="nav-auth"><a href="#auth">Login / Register</a></span>
      <span id="nav-user" style="display:none">
        <a href="#dashboard">Dashboard</a>
        <button id="logout-btn">Logout</button>
      </span>
    </div>
  </nav>
  <main id="app"></main>
  <script src="app.js"></script>
  <script src="leaderboard.js"></script>
  <script src="auth.js"></script>
  <script src="dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `public/style.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e0e0e0; min-height: 100vh; }

nav {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 2rem; background: #111; border-bottom: 1px solid #D4AF37;
}
nav .brand { font-size: 1.2rem; font-weight: bold; color: #D4AF37; text-decoration: none; }
nav .nav-links { display: flex; align-items: center; gap: 1rem; }
nav a { color: #ccc; text-decoration: none; }
nav a:hover { color: #D4AF37; }
nav button { background: none; border: 1px solid #555; color: #ccc; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; }
nav button:hover { border-color: #D4AF37; color: #D4AF37; }

main { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }

.leaderboard h1 { color: #D4AF37; margin-bottom: 0.5rem; }
.subtitle { color: #777; margin-bottom: 1.5rem; }

table { width: 100%; border-collapse: collapse; }
thead tr { background: #1a1a1a; }
th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #222; }
th { color: #D4AF37; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; }
tr.top-1 td { color: #FFD700; font-weight: bold; }
tr.top-2 td { color: #C0C0C0; }
tr.top-3 td { color: #CD7F32; }
tr:hover { background: #111; }

.auth-container, .dashboard { max-width: 500px; }
.tabs { display: flex; margin-bottom: 1.5rem; }
.tab { flex: 1; padding: 0.6rem; background: #1a1a1a; border: 1px solid #333; color: #888; cursor: pointer; font-size: 1rem; }
.tab.active { background: #D4AF37; color: #000; font-weight: bold; border-color: #D4AF37; }

form { display: flex; flex-direction: column; gap: 0.8rem; }
h2 { margin-bottom: 0.5rem; color: #D4AF37; }

input { padding: 0.7rem; background: #1a1a1a; border: 1px solid #333; color: #e0e0e0; border-radius: 4px; font-size: 1rem; width: 100%; }
input:focus { outline: none; border-color: #D4AF37; }

button[type="submit"] { padding: 0.75rem; background: #D4AF37; color: #000; border: none; border-radius: 4px; font-size: 1rem; font-weight: bold; cursor: pointer; }
button[type="submit"]:hover { background: #c9a227; }
button.danger { background: #8B0000; color: #fff; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; }
button.danger:hover { background: #a00000; }
button.small { background: #1a1a1a; color: #ccc; border: 1px solid #333; padding: 0.3rem 0.7rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
button.small:hover { border-color: #D4AF37; color: #D4AF37; }

hr { border: none; border-top: 1px solid #222; margin: 1.5rem 0; }
.error { color: #e05252; font-size: 0.9rem; min-height: 1.2rem; }
.danger-zone { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }

#cert-btn { background: #1a1a1a; border: 1px solid #D4AF37; color: #D4AF37; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; }
#cert-btn:hover { background: #D4AF37; color: #000; }
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html public/style.css
git commit -m "feat: frontend HTML and CSS"
```

---

## Task 13: Frontend Router and Shared Helpers

**Files:** `public/app.js`

- [ ] **Step 1: Create `public/app.js`**

```javascript
const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function removeToken() { localStorage.removeItem('token'); }
function isLoggedIn() { return !!getToken(); }
function navigate(hash) { window.location.hash = hash; }

function updateNav() {
  document.getElementById('nav-auth').style.display = isLoggedIn() ? 'none' : 'inline';
  document.getElementById('nav-user').style.display = isLoggedIn() ? 'inline-flex' : 'none';
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// Prevents XSS: never put raw user content into innerHTML — use this first
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function router() {
  const hash = window.location.hash || '#leaderboard';
  const app = document.getElementById('app');
  updateNav();
  if (hash === '#leaderboard' || hash === '') renderLeaderboard(app);
  else if (hash === '#auth') { if (isLoggedIn()) return navigate('#dashboard'); renderAuth(app); }
  else if (hash === '#dashboard') { if (!isLoggedIn()) return navigate('#auth'); renderDashboard(app); }
  else app.innerHTML = '<p>Page not found.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}
    removeToken();
    navigate('#leaderboard');
  });
  router();
});

window.addEventListener('hashchange', router);
```

- [ ] **Step 2: Commit**

```bash
git add public/app.js
git commit -m "feat: frontend router and API helper"
```

---

## Task 14: Frontend Views

**Files:** `public/leaderboard.js`, `public/auth.js`, `public/dashboard.js`

- [ ] **Step 1: Create `public/leaderboard.js`**

```javascript
async function renderLeaderboard(container) {
  container.innerHTML = `
    <div class="leaderboard">
      <h1>🏆 Hall of Pointless Generosity</h1>
      <p class="subtitle">These brave souls paid money for absolutely nothing.</p>
      <div id="board-content">Loading...</div>
    </div>`;
  try {
    const rankings = await apiFetch('/leaderboard');
    const content = document.getElementById('board-content');
    if (rankings.length === 0) {
      content.innerHTML = '<p style="color:#777;margin-top:1rem">No one has donated yet. Be the first.</p>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    content.innerHTML = `
      <table>
        <thead><tr><th>Rank</th><th>Name</th><th>Total Donated</th><th>Times</th></tr></thead>
        <tbody>${rankings.map((r, i) => `
          <tr class="${i < 3 ? 'top-' + (i + 1) : ''}">
            <td>${medals[i] || '#' + (i + 1)}</td>
            <td>${escapeHtml(r.username)}</td>
            <td>$${parseFloat(r.total).toFixed(2)}</td>
            <td>${r.donation_count}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById('board-content').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}
```

- [ ] **Step 2: Create `public/auth.js`**

```javascript
function renderAuth(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="tabs">
        <button class="tab active" id="tab-login" onclick="showTab('login')">Login</button>
        <button class="tab" id="tab-register" onclick="showTab('register')">Register</button>
      </div>
      <form id="login-form">
        <h2>Welcome back</h2>
        <input type="email" id="login-email" placeholder="Email" required>
        <input type="password" id="login-password" placeholder="Password" required>
        <button type="submit">Login</button>
        <p id="login-error" class="error"></p>
      </form>
      <form id="register-form" style="display:none">
        <h2>Join the void</h2>
        <input type="text" id="reg-username" placeholder="Display name" required>
        <input type="email" id="reg-email" placeholder="Email" required>
        <input type="password" id="reg-password" placeholder="Password (min 8 chars)" required>
        <button type="submit">Create Account</button>
        <p id="register-error" class="error"></p>
      </form>
    </div>`;
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

function showTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').style.display = isLogin ? 'flex' : 'none';
  document.getElementById('register-form').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-password').value })
    });
    setToken(result.token);
    navigate('#dashboard');
  } catch (err) { errEl.textContent = err.message; }
}

async function handleRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: document.getElementById('reg-username').value, email, password })
    });
    const result = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(result.token);
    navigate('#dashboard');
  } catch (err) { errEl.textContent = err.message; }
}
```

- [ ] **Step 3: Create `public/dashboard.js`**

```javascript
async function renderDashboard(container) {
  container.innerHTML = `
    <div class="dashboard">
      <div id="user-info">Loading...</div>
      <hr>
      <h2>Make a Donation</h2>
      <form id="donation-form">
        <input type="number" id="donation-amount" placeholder="Amount ($)" min="0.01" step="0.01" required>
        <input type="text" id="donation-note" placeholder="Optional message to the void">
        <button type="submit">Donate for Nothing</button>
        <p id="donation-error" class="error"></p>
      </form>
      <hr>
      <h2>Your Donations</h2>
      <div id="donations-list">Loading...</div>
      <hr>
      <div class="danger-zone">
        <button id="cert-btn">📜 Download Certificate</button>
        <button id="delete-account-btn" class="danger">Delete My Account</button>
      </div>
    </div>`;
  await loadUserInfo();
  await loadDonations();
  document.getElementById('donation-form').addEventListener('submit', handleDonate);
  document.getElementById('cert-btn').addEventListener('click', downloadCertificate);
  document.getElementById('delete-account-btn').addEventListener('click', deleteAccount);
}

async function loadUserInfo() {
  try {
    const user = await apiFetch('/users/me');
    document.getElementById('user-info').innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        <h1 style="color:#D4AF37">${escapeHtml(user.username)}</h1>
        <button class="small" onclick="editUsername()">✏️ Edit Name</button>
      </div>
      <p style="color:#777;margin-top:0.3rem">Member since ${new Date(user.created_at).toLocaleDateString()}</p>`;
  } catch (err) {
    if (err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('expired')) {
      removeToken(); navigate('#auth');
    }
  }
}

async function loadDonations() {
  const listEl = document.getElementById('donations-list');
  try {
    const donations = await apiFetch('/donations/mine');
    if (donations.length === 0) {
      listEl.innerHTML = '<p style="color:#777">No donations yet. Make your first pointless contribution above!</p>';
      return;
    }
    const total = donations.reduce((sum, d) => sum + d.amount, 0);
    listEl.innerHTML = `
      <p style="margin-bottom:0.8rem"><strong style="color:#D4AF37">Total donated: $${total.toFixed(2)}</strong></p>
      <table>
        <thead><tr><th>Amount</th><th>Note</th><th>Date</th><th></th></tr></thead>
        <tbody>${donations.map(d => `
          <tr>
            <td>$${parseFloat(d.amount).toFixed(2)}</td>
            <td>${escapeHtml(d.note || '—')}</td>
            <td>${new Date(d.created_at).toLocaleDateString()}</td>
            <td><button class="small" onclick="deleteDonation(${d.id})">Delete</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) { listEl.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`; }
}

async function handleDonate(e) {
  e.preventDefault();
  const errEl = document.getElementById('donation-error');
  errEl.textContent = '';
  try {
    await apiFetch('/donations', {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(document.getElementById('donation-amount').value), note: document.getElementById('donation-note').value })
    });
    document.getElementById('donation-amount').value = '';
    document.getElementById('donation-note').value = '';
    await loadDonations();
  } catch (err) { errEl.textContent = err.message; }
}

async function deleteDonation(id) {
  if (!confirm('Remove this donation from the void?')) return;
  try { await apiFetch(`/donations/${id}`, { method: 'DELETE' }); await loadDonations(); }
  catch (err) { alert(err.message); }
}

async function downloadCertificate() {
  const res = await fetch('/api/certificate/pdf', { headers: { 'Authorization': `Bearer ${getToken()}` } });
  if (!res.ok) { const d = await res.json(); alert(d.error); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'my-nothing-certificate.pdf'; a.click();
  URL.revokeObjectURL(url);
}

async function editUsername() {
  const newName = prompt('Enter new display name (min 2 characters):');
  if (!newName || newName.trim().length < 2) return;
  try { await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify({ username: newName.trim() }) }); await loadUserInfo(); }
  catch (err) { alert(err.message); }
}

async function deleteAccount() {
  if (!confirm('Delete your account and all donations? The void will forget you.')) return;
  try { await apiFetch('/users/me', { method: 'DELETE' }); removeToken(); navigate('#leaderboard'); }
  catch (err) { alert(err.message); }
}
```

- [ ] **Step 4: Commit**

```bash
git add public/leaderboard.js public/auth.js public/dashboard.js
git commit -m "feat: all frontend views"
```

---

## Task 15: README

**Files:** `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# Pay for Nothing

A web application where users pay simulated money for absolutely nothing, compete on a public leaderboard, and receive official-looking certificates of their contribution to the void.

Built for Systems Analysis and Design, Spring 2026.

---

## Tech Stack

| Layer     | Technology                       |
|-----------|----------------------------------|
| Frontend  | Vanilla JavaScript SPA           |
| Backend   | Node.js + Express                |
| Database  | SQLite (better-sqlite3)          |
| Auth      | JWT (jsonwebtoken) + bcryptjs    |
| PDF       | pdfkit                           |
| Security  | helmet, cors, express-rate-limit |
| API Docs  | swagger-ui-express               |
| Testing   | Jest                             |

---

## Setup

**1. Clone the repository**

git clone <your-github-url>
cd <project-folder>

**2. Install dependencies**

npm install

**3. Create your environment file**

cp .env.example .env

Edit .env and set a strong JWT_SECRET value.

**4. Start the server**

npm start

For development (auto-restarts on file changes):

npm run dev

---

## Usage

Open http://localhost:3000 in your browser.

- Leaderboard — public, no account needed
- Register / Login — create an account to participate
- Dashboard — add donations, download your certificate, manage your account

---

## API Documentation

Interactive Swagger UI at: http://localhost:3000/api-docs

All endpoints are documented with examples. You can test every route from the browser.

---

## Running Tests

npm test

Tests use an in-memory SQLite database. Your real data is never touched.

---

## Security

- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens expire after 24 hours
- Logout blacklists tokens server-side
- Login rate-limited (10 requests / 15 minutes per IP)
- All SQL queries parameterized (SQL injection impossible)
- HTTP security headers via helmet
- CORS restricted to configured origin
- Secrets in .env, never committed to git
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README"
```

---

## Final Verification

- [ ] `npm test` — all 3 test suites pass
- [ ] `npm run dev` — server starts without errors
- [ ] Open `http://localhost:3000` — leaderboard renders
- [ ] Open `http://localhost:3000/api-docs` — Swagger UI loads all 11 endpoints
- [ ] Register → add donation → download certificate → verify PDF opens
- [ ] Push to GitHub

```bash
git remote add origin <your-github-url>
git push -u origin master
```
