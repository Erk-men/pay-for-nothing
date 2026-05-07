# Pay for Nothing — Design Spec

**Course:** Systems Analysis and Design, Spring 2026
**Stack:** Vanilla JS SPA + Node.js + Express + SQLite + JWT

---

## 1. Concept

A web application where users register, log in, and "donate" money for absolutely nothing. Their cumulative donations determine their rank on a fully public leaderboard. The higher you pay for nothing, the higher your glory. Users can manage their profile and donations, and download an official-looking PDF certificate confirming their contribution to the void.

---

## 2. Architecture

Layered architecture (Route → Service → Model → DB):

- **Routes** — receive HTTP requests, validate input, call services, send responses. No business logic.
- **Services** — all business logic lives here (ranking calculation, donation totals, PDF generation, auth). Unit-testable in isolation.
- **Models** — database query functions. Accept parameters, return data.
- **DB** — SQLite (single file, no installation needed).
- **Frontend** — Vanilla JS SPA (Single Page Application). Three views managed in one HTML file without page reloads.

```
frontend/
  index.html
  app.js           ← view router
  leaderboard.js   ← public ranking view
  auth.js          ← register/login view
  dashboard.js     ← user dashboard view
  style.css

backend/
  server.js        ← app entry, middleware config
  .env             ← secrets (gitignored)
  routes/
    auth.routes.js
    user.routes.js
    donation.routes.js
    leaderboard.routes.js
    certificate.routes.js
  services/
    auth.service.js
    user.service.js
    donation.service.js
    leaderboard.service.js
    certificate.service.js
  models/
    user.model.js
    donation.model.js
  db/
    connection.js
    schema.sql
  middleware/
    auth.middleware.js   ← JWT verification
    rateLimit.js
  swagger/
    swagger.json
  tests/
    auth.service.test.js
    donation.service.test.js
    leaderboard.service.test.js
```

---

## 3. Data Model

### USERS
| Column     | Type     | Notes                        |
|------------|----------|------------------------------|
| id         | INTEGER  | Primary key, auto-increment  |
| username   | TEXT     | Unique, public display name  |
| email      | TEXT     | Unique, used for login       |
| password   | TEXT     | bcrypt hash — never plaintext|
| created_at | DATETIME | Auto-set on insert           |

### DONATIONS
| Column     | Type     | Notes                        |
|------------|----------|------------------------------|
| id         | INTEGER  | Primary key, auto-increment  |
| user_id    | INTEGER  | Foreign key → USERS.id       |
| amount     | REAL     | Donation amount (e.g. 42.00) |
| note       | TEXT     | Optional message from user   |
| created_at | DATETIME | Auto-set on insert           |

**Leaderboard query:**
```sql
SELECT u.username, SUM(d.amount) as total
FROM donations d
JOIN users u ON d.user_id = u.id
GROUP BY d.user_id
ORDER BY total DESC;
```

---

## 4. API Endpoints

All endpoints return JSON. Protected endpoints require `Authorization: Bearer <token>` header.

### Auth
| Method | Path                  | Auth | Description             |
|--------|-----------------------|------|-------------------------|
| POST   | /api/auth/register    | No   | Create account          |
| POST   | /api/auth/login       | No   | Get JWT token           |
| POST   | /api/auth/logout      | Yes  | Invalidate token        |

### Users
| Method | Path                  | Auth | Description             |
|--------|-----------------------|------|-------------------------|
| GET    | /api/users/me         | Yes  | Get own profile         |
| PUT    | /api/users/me         | Yes  | Update display name     |
| DELETE | /api/users/me         | Yes  | Delete account + data   |

### Donations
| Method | Path                  | Auth | Description             |
|--------|-----------------------|------|-------------------------|
| POST   | /api/donations        | Yes  | Add a donation          |
| GET    | /api/donations/mine   | Yes  | List own donations      |
| DELETE | /api/donations/:id    | Yes  | Delete one donation     |

### Leaderboard
| Method | Path                  | Auth | Description             |
|--------|-----------------------|------|-------------------------|
| GET    | /api/leaderboard      | No   | Full public ranked list |

### Certificate
| Method | Path                  | Auth | Description             |
|--------|-----------------------|------|-------------------------|
| GET    | /api/certificate/pdf  | Yes  | Download PDF cert       |

---

## 5. Security

| Threat              | Mitigation             | Location               |
|---------------------|------------------------|------------------------|
| Plain-text passwords| bcrypt (salt rounds 12)| user.service.js        |
| Token theft         | JWT expires in 24h     | auth.service.js        |
| Brute force login   | Rate limit: 10 req/15m | rateLimit.js           |
| Common HTTP attacks | helmet.js middleware   | server.js              |
| SQL injection       | Parameterized queries  | All model files        |
| Cross-origin abuse  | CORS whitelist         | server.js              |
| Secrets in code     | .env + .gitignore      | Project root           |

---

## 6. Frontend Views

Three views rendered inside one `index.html` — JavaScript shows/hides sections based on the URL hash (e.g. `#leaderboard`, `#auth`, `#dashboard`). Full page reloads never occur.

### View 1: Leaderboard (public, default)
- Ranked table: Rank | Username | Total Donated
- Loads from `GET /api/leaderboard`
- Visible to everyone, no login required

### View 2: Auth
- Toggle between Register and Login forms
- Register: username, email, password → `POST /api/auth/register`
- Login: email, password → `POST /api/auth/login` → store JWT in localStorage
- Redirect to Dashboard on success

### View 3: Dashboard (protected)
- Shows current user's rank and total donated
- Form: add new donation (amount + optional note)
- Table: own donation history with delete buttons
- Button: download PDF certificate
- Button: delete account (with confirmation)

---

## 7. PDF Certificate

Generated server-side using `pdfkit`. Style: official + absurd.

**Contents:**
- Gold decorative border
- Serif heading font
- Text: *"This certifies that [Username] has contributed $[Total] to absolutely nothing."*
- Sub-text: *"Witness: The Void. Date: [date]."*
- Faint watermark: "FOR NOTHING"

---

## 8. Testing

Unit tests for all service functions (business logic only — not routes):

| Test file                    | What it tests                              |
|------------------------------|--------------------------------------------|
| auth.service.test.js         | password hashing, JWT sign/verify, login validation |
| donation.service.test.js     | amount validation, total calculation       |
| leaderboard.service.test.js  | ranking order, tie-breaking                |

Test runner: Jest. Run with `npm test`.

---

## 9. Grading Coverage

| Criterion (weight)                    | How it's covered                                |
|---------------------------------------|-------------------------------------------------|
| Functionality — CRUD (25%)            | Create/Read/Update/Delete on users and donations|
| Code Quality & Modularity (20%)       | Layered architecture, business logic in services|
| API Design & REST (15%)               | Standard HTTP methods, JSON, status codes       |
| Swagger/OpenAPI Docs (10%)            | swagger.json + Swagger UI at /api-docs          |
| Testing (15%)                         | Jest unit tests on all service functions        |
| Documentation — README (10%)          | Setup, run, API usage, reproduction steps       |
| Version Control — Git (5%)            | Regular commits to GitHub                       |

---

## 10. Deadlines

| Event             | Date     |
|-------------------|----------|
| ZIP upload (UZEM) | May 21   |
| Presentation 1    | May 22   |
| Presentation 2    | June 5   |
