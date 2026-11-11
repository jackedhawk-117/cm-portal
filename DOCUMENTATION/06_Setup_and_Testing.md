# 06 – Setup and Testing

> Recruitment prototype – fictional data only. Not affiliated with or endorsed by the
> Government of Kerala or the Chief Minister’s Office.

## 1. Prerequisites

- Node.js **20 or newer** (developed on Node 26, Express 4).
- npm 10+ (workspaces are used).
- PostgreSQL **14+** (developed on PostgreSQL 18). Neon works without a local server.
- Optional: a Google AI Studio key for real Gemini calls. Without a key the app still works
  using the labelled keyword fallback.

## 2. Install

```bash
git clone <repository-url> cm_portal
cd cm_portal
npm install
```

`npm install` installs both workspaces (`client`, `server`).

## 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://app:app@127.0.0.1:5432/cm_portal
DATABASE_URL_TEST=postgresql://app:app@127.0.0.1:5432/cm_portal_test

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=20000

DEMO_PASSWORD=Demo@12345
SLA_HIGH_DAYS=3
SLA_MEDIUM_DAYS=7
SLA_LOW_DAYS=15
```

Generate a JWT secret:

```bash
openssl rand -hex 32
```

Never commit `.env`; it is in `.gitignore`.

### Local PostgreSQL

Create a database and user (example):

```bash
sudo -u postgres psql <<'SQL'
CREATE USER app WITH PASSWORD 'app';
CREATE DATABASE cm_portal OWNER app;
CREATE DATABASE cm_portal_test OWNER app;
SQL
```

The migration enables `pg_trgm`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This requires the extension package to be installed on the server (standard on Neon and most
distributions). If unavailable, duplicate detection falls back to a JavaScript trigram check.

### Neon

1. Create a Neon project and a database.
2. Copy the pooled connection string (include `?sslmode=require`).
3. Set `DATABASE_URL` to that string.
4. Run `npm run db:migrate && npm run db:seed` once.
5. For tests, either point `DATABASE_URL_TEST` at a separate Neon database or run tests locally
   only; the test setup drops and recreates the `public` schema.

## 4. Database setup

```bash
npm run db:migrate    # apply server/src/db/migrations/*.sql
npm run db:seed       # insert 10 departments, 14 users, 40 grievances & history
```

Expected seed output:

```
[migrate] up to date (1 migration file(s), db=development)
[seed] users=14, grievances=40
[seed] status mix: In Progress=11, Reopened=4, Resolved=11, Submitted=6, Under Review=8
[seed] demo password: Demo@12345
```

Reset for a clean demo:

```bash
npm run db:reset
```

### Demo accounts

All accounts use **`Demo@12345`** (test-only).

| Role | Email | Notes |
| --- | --- | --- |
| Citizen | `citizen@demo.test` | Aisha Rahman |
| Citizen | `ravi.menon@demo.test` | Ravi Menon |
| Citizen | `fatima.noor@demo.test` | Fatima Noor |
| CMO | `cmo@demo.test` | CMO administrator |
| Officer – PWD | `officer.pwd@demo.test` | Suresh Kumar |
| Officer – Health | `officer.health@demo.test` | Dr. Meera Pillai |
| Officer – Education | `officer.education@demo.test` | Jayesh Thomas |
| Officer – KSEB | `officer.kseb@demo.test` | Anilkumar V. |
| Officer – Water | `officer.water@demo.test` | Latha Krishnan |
| Officer – LSG | `officer.lsg@demo.test` | Bindu S. |
| Officer – Revenue | `officer.revenue@demo.test` | Rajesh Nair |
| Officer – Transport | `officer.transport@demo.test` | Shaji M. |
| Officer – Police | `officer.police@demo.test` | Deepa Menon |
| Officer – Social Justice | `officer.social@demo.test` | Sreelatha P. |

## 5. Run locally

Development (Express on 4000 + Vite on 5173 with `/api` proxy):

```bash
npm run dev
```

Or separately:

```bash
npm run dev -w server
npm run dev -w client
```

Open <http://localhost:5173>.

> The API server must be restarted after rebuilding the client for Express to serve the new
> `client/dist` (production mode). In development, use Vite.

## 6. Production build

```bash
npm run build            # builds client/dist
NODE_ENV=production npm start
```

`npm start` runs `start:prod` in the server workspace:

1. `node src/db/migrate.js` – applies pending migrations.
2. `node src/db/seedIfEmpty.js` – seeds **only** if there are zero grievances (safe redeploy).
3. `node src/server.js` – Express serves `client/dist` and `/api` on `PORT`.

Health check: <http://localhost:4000/api/health>.

## 7. Automated tests

```bash
npm test
```

This runs `jest --runInBand --forceExit` in the server workspace. The global setup:

1. Sets `NODE_ENV=test`, forces `DATABASE_URL_TEST`, and clears `GEMINI_API_KEY`
   (so tests never call Gemini).
2. Drops and recreates the `public` schema in the test database.
3. Runs migrations and the fictional seed.

Result on the current build: **3 suites, 41 tests, all passing.**

### Test coverage map

| File | Focus |
| --- | --- |
| `tests/auth.test.js` | Health, registration, duplicate email, weak password/mobile validation, role-escalation attempt, login/logout, `/me`, unauthenticated access, citizen/officer/CMO RBAC |
| `tests/grievances.test.js` | Reference ID, AI field persistence, input validation, PNG upload/download, cross-citizen denial, CMO access, invalid file bytes, unsupported MIME, list/summary, detail ownership, public tracking and PII hiding, reference validation, AI fallback (EN + Malayalam), CMO AI denial |
| `tests/workflow.test.js` | Illegal early assignment, Under Review, assignment, officer scope, illegal direct resolution, missing-report resolution, report submission with evidence, send-back, resubmission, acceptance/resolution, feedback, reopen, re-review/reassignment, internal-note hiding, full history, overdue escalation and non-overdue rejection |

### Manual test cases worth demonstrating

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | Register a new citizen | 201, signed in, redirected to citizen dashboard |
| 2 | Submit a grievance with AI advice | 201, reference `CMK-YYYY-NNNNNN` displayed; AI badge Gemini or Fallback |
| 3 | Track reference while logged out | Status, department and public timeline; no email/mobile |
| 4 | Citizen B opens Citizen A’s detail URL | 403 / not accessible |
| 5 | CMO moves Submitted → Resolved directly | 409 Conflict |
| 6 | CMO moves Under Review, assigns PWD/officer | Status In Progress, assignment visible |
| 7 | Health officer opens PWD case | 403 |
| 8 | PWD officer submits report with photo | Report status SUBMITTED, evidence listed |
| 9 | CMO sends report back | Still In Progress, review remark visible to staff |
| 10 | Officer resubmits, CMO accepts | Resolved, citizen can feedback/reopen |
| 11 | Citizen gives 5-star feedback | Feedback stored and shown |
| 12 | Citizen reopens with reason | Reopened, assignment deactivated, CMO can re-review |
| 13 | CMO adds internal remark | Citizen/public timeline does not show it |
| 14 | CMO escalates overdue case | Priority raised, escalation count incremented |
| 15 | Upload a `.txt` or fake PDF | Rejected (400) |
| 16 | Upload a 6 MB file | 413 |
| 17 | AI endpoint without key | `source: "fallback-keyword"` and “Fallback (not AI)” badge |
| 18 | Logged-out user opens `/cmo` | Redirected to login, then own dashboard |
| 19 | Contact form | Saved in `contact_enquiries`, success toast |
| 20 | Public pages | Disclaimer visible on every page |

## 8. End-to-end walkthrough (manual)

1. Open <http://localhost:5173> and click **Submit Grievance**.
2. Register a new citizen or sign in as `citizen@demo.test`.
3. Open **Submit grievance**, choose a district/category, type at least 30 characters and
   click **Analyse with AI**. Accept or edit the suggestion (note the Gemini/Fallback label).
4. Submit; copy the reference ID from the success banner.
5. Sign out and use **Track grievance** with the reference; verify no personal data is shown.
6. Sign in as `cmo@demo.test`; open **CMO overview**; filter/search; open the new case.
7. Add a remark if desired, **Move to Under Review**, then **Assign** to a department and
   officer (for PWD use `officer.pwd@demo.test`).
8. Sign out, sign in as that officer; open the case; add an investigation remark; enter an
   action-taken report; optionally attach a JPG/PNG/PDF; **Submit to CMO for review**.
9. Sign in as CMO again; open the case; review the report. Use **Send back** once to see the
   loop, then **Accept and resolve**.
10. Sign in as the citizen; open the resolved case; give a 1–5 rating and comment, or reopen
    with a reason.
11. If reopened, sign in as CMO, move to Under Review and assign again.
12. Confirm the timeline on the citizen detail and public tracking page shows the expected
    public events, while internal remarks remain hidden.

## 9. Troubleshooting

| Problem | Fix |
| --- | --- |
| `ECONNREFUSED 5432` | Start PostgreSQL; check `DATABASE_URL`; if using the bundled local server, ensure the socket/port is correct |
| `JWT_SECRET must be set in production` | Set a strong `JWT_SECRET` in Render/environment |
| `password authentication failed` | Verify database user/password and `pg_hba.conf` |
| `extension "pg_trgm" is not available` | Install `postgresql-contrib` or use Neon; duplicate detection falls back to JS |
| `relation "grievances" does not exist` | Run `npm run db:migrate` |
| Empty dashboards | Run `npm run db:seed` |
| AI always fallback | `GEMINI_API_KEY` missing/invalid, quota exceeded, or running under `NODE_ENV=test` (tests intentionally disable Gemini) |
| Cookie not set in production | Ensure HTTPS and `NODE_ENV=production`; the cookie is `Secure` |
| 429 responses | Rate limit; wait, or raise the limits in `server/src/middleware/rateLimit.js` for a demo |
| Client changes not visible after build | Restart the Express server so it serves the new `client/dist` |
| Tests cannot reset DB | `DATABASE_URL_TEST` must point to a disposable database; the setup drops the `public` schema |

## 10. Render + Neon deployment (short version)

1. Push the repository to GitHub.
2. Create a Neon database and copy the connection string.
3. In Render, create a **Blueprint** from `render.yaml` (or a Web Service manually).
4. Set `DATABASE_URL` to the Neon string, `GEMINI_API_KEY` to a Google AI Studio key, and let
   Render generate `JWT_SECRET`. Optionally set `CLIENT_ORIGIN` to the Render URL/custom domain.
5. Deploy. Build: `npm ci --include=dev && npm run build` (Vite is a dev dependency).
   Start: `npm run start:prod -w server`.
6. The first boot migrates and seeds an empty database. Later boots skip seeding.
7. Open `/api/health`, then the hosted URL and sign in with a demo account.

Detailed manual steps and the full environment list are in the root README.

## 11. Quality gates used

```bash
npm run build          # Vite production build
npm test               # Jest + Supertest
npm run lint           # node --check for the server entry files
```

The project was accepted only after the build succeeded and all tests passed.
