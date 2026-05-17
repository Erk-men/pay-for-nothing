# Pay for Nothing

A web application where users register, log in, and donate money for absolutely nothing. Your cumulative donations determine your rank on a fully public leaderboard. The higher you pay for nothing, the higher your glory. Users can download an official-looking PDF certificate confirming their contribution to the void.

Built as a course project for Systems Analysis and Design — Spring 2026.

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Vanilla JavaScript SPA            |
| Backend  | Node.js + Express                 |
| Database | SQLite (via better-sqlite3)       |
| Auth     | JWT (jsonwebtoken) + bcrypt       |
| PDF      | pdfkit                            |
| Security | helmet, cors, rate limiting       |
| Testing  | Jest                              |
| Docs     | Swagger UI (`/api-docs`)          |

---

## Project Structure

```
├── public/
│   ├── index.html
│   ├── app.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── leaderboard.js
│   └── style.css
├── routes/
├── services/
├── models/
├── middleware/
├── db/
│   ├── connection.js
│   └── schema.sql
├── swagger/
├── tests/
├── server.js
└── .env
```

---

## Setup

**Prerequisites:** Node.js v18+

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/pay-for-nothing.git
cd pay-for-nothing
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your environment file

```bash
cp .env.example .env
```

Open `.env` and set a secret key for JWT:

```
PORT=3000
JWT_SECRET=your_secret_key_here
```

### 4. Start the server

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

The server runs at `http://localhost:3000`.

---

## Running Tests

```bash
npm test
```

Tests cover service-layer business logic (auth, donations, leaderboard) and API routes.

---

## API Reference

All endpoints return JSON. Protected endpoints require the header:
```
Authorization: Bearer <token>
```

### Auth

| Method | Endpoint             | Auth | Description      |
|--------|----------------------|------|------------------|
| POST   | /api/auth/register   | No   | Create account   |
| POST   | /api/auth/login      | No   | Get JWT token    |
| POST   | /api/auth/logout     | Yes  | Invalidate token |

**Register — example request:**
```json
POST /api/auth/register
{
  "username": "void_lord",
  "email": "void@example.com",
  "password": "securepassword"
}
```

**Login — example response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Users

| Method | Endpoint       | Auth | Description            |
|--------|----------------|------|------------------------|
| GET    | /api/users/me  | Yes  | Get your profile       |
| PUT    | /api/users/me  | Yes  | Update display name    |
| DELETE | /api/users/me  | Yes  | Delete account + data  |

---

### Donations

| Method | Endpoint              | Auth | Description          |
|--------|-----------------------|------|----------------------|
| POST   | /api/donations        | Yes  | Add a donation       |
| GET    | /api/donations/mine   | Yes  | List your donations  |
| DELETE | /api/donations/:id    | Yes  | Delete one donation  |

**Add donation — example request:**
```json
POST /api/donations
{
  "amount": 42.00,
  "note": "For the void."
}
```

---

### Leaderboard

| Method | Endpoint          | Auth | Description              |
|--------|-------------------|------|--------------------------|
| GET    | /api/leaderboard  | No   | Full public ranked list  |

**Example response:**
```json
[
  { "username": "void_lord", "total": 420.00, "donation_count": 5 },
  { "username": "nihilist99", "total": 100.50, "donation_count": 2 }
]
```

---

### Certificate

| Method | Endpoint                | Auth | Description             |
|--------|-------------------------|------|-------------------------|
| GET    | /api/certificate/pdf    | Yes  | Download your PDF cert  |

Returns a PDF file confirming your total contribution to absolutely nothing.

---

## Interactive API Docs

Swagger UI is available at:

```
http://localhost:3000/api-docs
```

All endpoints can be explored and tested there.

---

## Security

| Threat               | Mitigation                        |
|----------------------|-----------------------------------|
| Plain-text passwords | bcrypt with 12 salt rounds        |
| Token theft          | JWT expires in 24 hours           |
| Brute force login    | Rate limit: 10 requests / 15 min  |
| Common HTTP attacks  | helmet.js middleware              |
| SQL injection        | Parameterized queries everywhere  |
| Cross-origin abuse   | CORS whitelist                    |
| Secrets in code      | `.env` file (gitignored)          |

---

## License

MIT
