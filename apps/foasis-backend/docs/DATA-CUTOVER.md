# Phase 5 — Database cutover to `foasis_db`

This guide consolidates the six microservice PostgreSQL databases into the single monolith database **`foasis_db`**.

## Prerequisites

1. PostgreSQL running locally (or a managed instance).
2. **Back up** all existing databases before cutover.
3. `apps/foasis-backend/.env` configured (copy from `.env.example`).
4. Microservices stopped if you will switch the frontend to the monolith (Phase 6).

## 1. Configure environment

In `apps/foasis-backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/foasis_db

# Same credentials/host as your existing microservice DBs
AUTH_SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fyp_auth
USER_SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fyp_users
TEAM_SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fyp_teams
PROPOSAL_SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fyp_proposals
NOTIFICATION_SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fyp_notifications
PROGRESS_SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fyp_progress
```

Use your **actual** database names if they differ from the examples above.

`JWT_SECRET` must match the value used by the old auth-service so existing tokens keep working.

Create the target database if needed:

```powershell
createdb foasis_db
```

## 2. Backup (recommended)

```powershell
pg_dump -Fc -f backup_fyp_auth.dump fyp_auth
pg_dump -Fc -f backup_fyp_users.dump fyp_users
# ... repeat for all six source DBs
pg_dump -Fc -f backup_foasis_db.dump foasis_db
```

Or use `scripts/backup-microservice-databases.ps1` (adjust DB names inside the script).

## 3. Run cutover (one command)

From `apps/foasis-backend`:

```powershell
npm install
npm run db:cutover
```

This runs, in order:

1. `prisma migrate deploy` — creates schema on `foasis_db`
2. `migrate-data-from-microservices.ts --truncate` — copies all tables in FK-safe order
3. `validate-data-migration.ts` — compares row counts source vs target

### Manual steps (alternative)

```powershell
npx prisma migrate deploy
npm run db:migrate-data -- --truncate
npm run db:validate-data
```

## 4. Smoke test

```powershell
npm run start:dev
```

In another terminal:

```powershell
# Health only
npm run smoke-test

# With login (set in .env or shell)
$env:SMOKE_TEST_EMAIL="your@email.com"
$env:SMOKE_TEST_PASSWORD="yourpassword"
npm run smoke-test
```

## 5. Validation checklist

| Check | Command / action |
|-------|------------------|
| Row counts match | `npm run db:validate-data` exits 0 |
| Health endpoint | `GET /health` returns OK |
| Login | `POST /auth/login` with existing user |
| Student dashboard | `GET /dashboard/student` with JWT |
| Coordinator stats | `GET /dashboard/coordinator` |
| Proposals / teams | Spot-check key flows in the UI |

## 6. authUserId consistency

Cross-service references use `authUserId` (JWT `sub` = `User.id`). Because all services already stored the same UUIDs, no ID remapping is required — only copying rows into one database.

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| `P1000` authentication failed | Fix `DATABASE_URL` credentials in `.env` |
| `relation does not exist` on source | Wrong `*_SOURCE_DATABASE_URL` or empty DB |
| Row count mismatch | Re-run with `--truncate` after backup; check for partial prior runs |
| `ON CONFLICT` / duplicate key without truncate | Use `npm run db:migrate-data -- --truncate` |
| Login works but empty data | Source URLs wrong or migration skipped a service |

## 8. After cutover

Proceed to **Phase 6** — see [PHASE-6-DECOMMISSION.md](./PHASE-6-DECOMMISSION.md):

- Copy `apps/frontend/.env.example` to `.env.local`
- Stop api-gateway and microservices
- Run frontend on port 3007 against `foasis-backend` only
