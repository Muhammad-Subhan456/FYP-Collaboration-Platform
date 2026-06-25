# FOASIS — Local PostgreSQL → Neon Migration Guide

> **Superseded:** FOASIS is migrating to **Supabase PostgreSQL** instead. Use [SUPABASE-MIGRATION.md](./SUPABASE-MIGRATION.md).

Move `foasis_db` from local PostgreSQL to [Neon](https://neon.tech) with **zero schema changes**, **zero data loss**, and **unchanged API contracts**.

---

## 1. What you are migrating

### Database

| Item | Value |
|------|-------|
| Local database name | `foasis_db` (typical) |
| Prisma app | `apps/foasis-backend` |
| Migration history | `prisma/migrations/20250616000000_init/` |
| Schema | `public` |

### Prisma inventory (must all exist on Neon)

**14 PostgreSQL enums**

`UserRole`, `SubscriptionPlan`, `Department`, `ProfileType`, `JoinRequestStatus`, `ProposalStatus`, `RequestStatus`, `DeliverableType`, `SubmissionStatus`, `AnnouncementType`, `MeetingType`, `MilestoneStatus`, `TaskStatus`, `EvaluationType`

**28 application tables**

| Domain | Tables |
|--------|--------|
| Auth | `User`, `Organization` |
| Profiles | `UserProfile` |
| Teams | `Team`, `TeamMember`, `JoinRequest` |
| Proposals | `Proposal`, `SupervisorRequest`, `SupervisorInvitation` |
| Notifications | `Notification` |
| Progress | `Meeting`, `Announcement`, `Deliverable`, `DeliverableDeadlineExtension`, `Submission`, `Milestone`, `Task`, `ActivityLog`, `GlobalAnnouncement`, `Evaluation`, `EvaluationPanel`, `PanelEvaluator`, `EvaluationAssignment`, `EvaluationResult` |

**Prisma system table**

| Table | Purpose |
|-------|---------|
| `_prisma_migrations` | Records applied migrations — **must** be present after cutover so `prisma migrate deploy` stays consistent |

**Indexes (unique constraints)**

- `User_email_key`, `User_googleId_key`
- `Organization_slug_key`
- `UserProfile_authUserId_key`
- `TeamMember_authUserId_key`
- `JoinRequest_teamId_authUserId_key`
- `Proposal_teamId_key`
- `SupervisorRequest_proposalId_supervisorId_key`
- `SupervisorInvitation_proposalId_supervisorId_key`
- `PanelEvaluator_panelId_evaluatorId_key`
- `EvaluationAssignment_evaluationId_teamId_key`
- `EvaluationResult_evaluationId_teamId_key`

**Foreign keys (11)**

`TeamMember` → `Team`, `JoinRequest` → `Team`, `SupervisorRequest` / `SupervisorInvitation` → `Proposal`, `DeliverableDeadlineExtension` → `Deliverable` (CASCADE), `Submission` → `Deliverable`, `Task` → `Milestone`, `EvaluationPanel` → `Evaluation` (CASCADE), `PanelEvaluator` → `EvaluationPanel` (CASCADE), `EvaluationAssignment` → `Evaluation` / `EvaluationPanel`, `EvaluationResult` → `Evaluation`

**PostgreSQL features used (Neon-compatible)**

- `TEXT` UUID primary keys (application-generated, not `gen_random_uuid()` defaults in DB)
- `TEXT[]` array columns on `UserProfile`
- `TIMESTAMP(3)` (Prisma `DateTime`)
- Standard enums and FK constraints

No custom extensions, triggers, or stored procedures are required.

---

## 2. Recommended approach (safest, minimum risk)

**Use a full logical backup/restore (`pg_dump` → `pg_restore`), not `prisma db push`.**

| Approach | When to use | Risk |
|----------|-------------|------|
| **A. Full `pg_dump` / `pg_restore`** ✅ | Production cutover | Lowest — preserves schema, data, enums, indexes, FKs, `_prisma_migrations` |
| B. `prisma migrate deploy` + data-only dump | If you want a clean schema from Prisma | Medium — must migrate `_prisma_migrations` or use `migrate resolve` |
| C. `prisma db push` | Never for this migration | High — bypasses migration history, not idempotent |

**Downtime strategy (academic / low-traffic FOASIS)**

1. **Rehearse** on a Neon branch or second project (no downtime).
2. **Cutover window** (~5–15 min): stop `foasis-backend`, take final dump, restore to Neon, update `DATABASE_URL`, smoke-test, restart.

Neon **branches** let you test the full restore before touching production.

---

## 3. Prerequisites

- [Neon account](https://console.neon.tech)
- PostgreSQL client tools: `pg_dump`, `pg_restore`, `psql` ([PostgreSQL downloads](https://www.postgresql.org/download/))
- Local `foasis_db` running with current data
- Backup before any destructive step

```powershell
# Windows — full local backup (run from any folder)
$env:PGPASSWORD = "hp123456"
pg_dump -h localhost -p 5432 -U postgres -Fc -f "foasis_db_pre_neon_$(Get-Date -Format yyyyMMdd_HHmm).dump" foasis_db
```

---

## 4. Step-by-step migration

### Phase 0 — Rehearsal (no production impact)

#### 4.1 Create Neon via Vercel (recommended)

Provision Neon through the **Neon Postgres integration in Vercel** (Vercel Marketplace). This creates the Neon project, wires billing, and injects connection strings into your Vercel project automatically.

**Prerequisites**

- Vercel account
- FOASIS repo connected to Vercel (root directory: `apps/frontend` for the Next.js app)

**Steps**

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your FOASIS project (or create one from this repo).
2. Go to **Storage** (or **Integrations** / **Marketplace**) → search **Neon** → **Neon Postgres** → **Add / Install**.
3. Create a new database (or link an existing Neon account — Vercel may create a `Vercel: <project>` org).
4. **Connect** the database to your Vercel project.
5. Select environments: **Production**, **Preview**, and **Development** (as needed).
6. Confirm — Vercel injects env vars (see table below).

**Environment variables set by the integration**

| Variable | Use for FOASIS |
|----------|----------------|
| `DATABASE_URL` | **Runtime** — pooled connection (PgBouncer); use when `foasis-backend` is deployed |
| `DATABASE_URL_UNPOOLED` | **`pg_restore`**, **`psql`**, **`prisma migrate deploy`** — direct connection |
| `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` | Legacy aliases — same as above if present |
| `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE`, `PGPASSWORD` | Build custom URLs if needed |

> **Important:** Use **`DATABASE_URL_UNPOOLED`** (direct) for dump restore and Prisma migrations. Use **`DATABASE_URL`** (pooled) for the running NestJS app in production.

**Pull variables locally**

```bash
# From repo root (after linking: vercel link)
cd apps/frontend
npx vercel link
npx vercel env pull ../../.env.vercel.neon
```

Copy into `apps/foasis-backend/.env` for local testing against Neon:

```env
# Migrations + pg_restore (direct)
DATABASE_URL="<paste DATABASE_URL_UNPOOLED from Vercel>"

# Or split when using pooler at runtime later:
# DATABASE_URL="<pooled DATABASE_URL from Vercel>"
# DIRECT_DATABASE_URL="<DATABASE_URL_UNPOOLED from Vercel>"
```

**FOASIS deployment note**

| Component | Host | Database env |
|-----------|------|----------------|
| **Frontend** | Vercel (`apps/frontend`) | Does not connect to Postgres directly |
| **Backend** | Railway / Render / VPS (NestJS) | Set `DATABASE_URL` from Vercel/Neon in **backend** host secrets |

The Vercel integration stores vars on the **Vercel project**. Copy `DATABASE_URL` / `DATABASE_URL_UNPOOLED` into your **backend** deployment platform — the NestJS monolith is not a Vercel serverless function.

**Alternative — Neon Console only**

If you are not using Vercel yet: [Neon Console](https://console.neon.tech) → **New Project** → copy **direct** connection string (host without `-pooler`). See [Neon + Vercel manual connect](https://neon.tech/docs/guides/vercel-manual).

#### 4.2 Prepare Neon connection URL

Neon requires SSL (included in Vercel-provided strings):

```env
postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

If the password contains special characters, URL-encode them (`@` → `%40`, etc.).

**From Vercel integration**

```env
# Direct — pg_restore, psql, prisma migrate deploy
DATABASE_URL="<DATABASE_URL_UNPOOLED from Vercel Storage → Neon → .env.local tab>"

# Pooled — foasis-backend runtime in production
# DATABASE_URL="<DATABASE_URL from Vercel>"
```

Optional pooled URL (runtime only, if not using Vercel’s pre-built string):

```env
postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
```

#### 4.3 Export local database

**Custom format (recommended for `pg_restore`):**

```powershell
cd "D:\Subhan Folder\FYP-Collaboration-Platform"
$env:PGPASSWORD = "hp123456"   # your local postgres password
pg_dump -h localhost -p 5432 -U postgres -Fc --no-owner --no-acl -f foasis_db.dump foasis_db
```

**Plain SQL (alternative):**

```powershell
pg_dump -h localhost -p 5432 -U postgres --no-owner --no-acl -f foasis_db.sql foasis_db
```

Flags explained:

- `--no-owner --no-acl` — avoids role/permission errors on Neon (different superuser model)
- `-Fc` — custom format, supports parallel restore and selective restore

#### 4.4 Import into Neon

**Option A — `pg_restore` (custom format dump):**

```powershell
$env:PGPASSWORD = "neon_password"
# Use PGHOST_UNPOOLED / DATABASE_URL_UNPOOLED from Vercel — NOT the pooler host
$NEON_HOST = "ep-xxxx.region.aws.neon.tech"   # direct host (no -pooler)
pg_restore -h $NEON_HOST -U neondb_owner -d neondb --no-owner --no-acl --verbose foasis_db.dump
```

Or pass the full unpooled URL to `psql` / `pg_restore` via connection URI (see Option B).

Neon database name is often `neondb` — match Vercel Storage → Neon connection details.

**Option B — plain SQL via `psql`:**

```powershell
$env:PGPASSWORD = "neon_password"
psql "postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require" -f foasis_db.sql
```

**Expected restore warnings (usually safe to ignore)**

- `role "postgres" does not exist` — mitigated by `--no-owner`
- `extension already exists` — FOASIS does not rely on custom extensions

#### 4.5 Update environment variables

Edit `apps/foasis-backend/.env`:

```env
# Before (local)
# DATABASE_URL="postgresql://postgres:hp123456@localhost:5432/foasis_db?schema=public"

# After (Neon via Vercel — use UNPOOLED for migrate/restore, then pooled for prod runtime)
DATABASE_URL="<DATABASE_URL_UNPOOLED from Vercel>"

# Optional — keep local URL for validation only (do not commit)
# LOCAL_DATABASE_URL="postgresql://postgres:hp123456@localhost:5432/foasis_db?schema=public"
```

**Do not change:** `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `UPLOAD_DIR`, `PUBLIC_URL` (update `PUBLIC_URL` only when deploying backend to a public host).

**Frontend** (`apps/frontend/.env.local`) — unchanged for DB migration; still points at backend API.

**Production deploy**

- **Vercel (frontend):** Neon vars are auto-injected; frontend does not use `DATABASE_URL`.
- **Backend host (Railway/Render/VPS):** Copy `DATABASE_URL` (pooled) from Vercel → Neon → **Settings → Environment Variables**, or from Neon Console. Never commit credentials to git.

#### 4.6 Prisma commands (post-restore)

```bash
cd apps/foasis-backend

# Regenerate client (no DB change)
npx prisma generate

# Verify migration history — should report "already applied"
npx prisma migrate deploy

# Optional: confirm schema matches Prisma models (read-only)
npx prisma migrate status
```

| Command | Use on Neon cutover? | Notes |
|---------|---------------------|-------|
| `prisma generate` | ✅ Always | Required after clone/deploy; no DB writes |
| `prisma migrate deploy` | ✅ Yes | Applies pending migrations; after full restore should be no-op |
| `prisma migrate status` | ✅ Verify | Confirms `_prisma_migrations` matches repo |
| `prisma db push` | ❌ No | Skips migration history; do not use for production cutover |
| `prisma migrate dev` | ❌ No (prod) | Creates new migrations; dev-only |
| `prisma db pull` | ❌ No | Would overwrite `schema.prisma` from DB |

#### 4.7 Optional Prisma `directUrl` (pooled runtime)

When using Neon **pooler** for the app (Vercel’s default `DATABASE_URL`), add to `schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled from Vercel
  directUrl = env("DATABASE_URL_UNPOOLED") // or DIRECT_DATABASE_URL
}
```

`.env` example (values from `vercel env pull`):

```env
DATABASE_URL="<Vercel DATABASE_URL — pooled>"
DATABASE_URL_UNPOOLED="<Vercel DATABASE_URL_UNPOOLED — direct>"
```

**For initial migration rehearsal**, set `DATABASE_URL` to **`DATABASE_URL_UNPOOLED`** only — fewer moving parts until restore is verified.

---

### Phase 1 — Production cutover

1. Announce short maintenance window
2. `npm run smoke-test` against **local** DB (baseline)
3. Stop `foasis-backend` (prevent writes during final dump)
4. Run final `pg_dump` (step 4.3)
5. Restore to Neon (step 4.4) — or restore to a fresh Neon branch then promote
6. Update `DATABASE_URL` to Neon
7. `npx prisma generate && npx prisma migrate deploy`
8. `npm run smoke-test`
9. Manual UI regression (login, dashboard, submissions, notifications)
10. Start backend against Neon

---

## 5. Validation

### 5.1 Row counts — every table

Run on **local** and **Neon**; counts must match.

```sql
SELECT 'User' AS table_name, COUNT(*) FROM "User"
UNION ALL SELECT 'Organization', COUNT(*) FROM "Organization"
UNION ALL SELECT 'UserProfile', COUNT(*) FROM "UserProfile"
UNION ALL SELECT 'Team', COUNT(*) FROM "Team"
UNION ALL SELECT 'TeamMember', COUNT(*) FROM "TeamMember"
UNION ALL SELECT 'JoinRequest', COUNT(*) FROM "JoinRequest"
UNION ALL SELECT 'Proposal', COUNT(*) FROM "Proposal"
UNION ALL SELECT 'SupervisorRequest', COUNT(*) FROM "SupervisorRequest"
UNION ALL SELECT 'SupervisorInvitation', COUNT(*) FROM "SupervisorInvitation"
UNION ALL SELECT 'Notification', COUNT(*) FROM "Notification"
UNION ALL SELECT 'Meeting', COUNT(*) FROM "Meeting"
UNION ALL SELECT 'Announcement', COUNT(*) FROM "Announcement"
UNION ALL SELECT 'Deliverable', COUNT(*) FROM "Deliverable"
UNION ALL SELECT 'DeliverableDeadlineExtension', COUNT(*) FROM "DeliverableDeadlineExtension"
UNION ALL SELECT 'Submission', COUNT(*) FROM "Submission"
UNION ALL SELECT 'Milestone', COUNT(*) FROM "Milestone"
UNION ALL SELECT 'Task', COUNT(*) FROM "Task"
UNION ALL SELECT 'ActivityLog', COUNT(*) FROM "ActivityLog"
UNION ALL SELECT 'GlobalAnnouncement', COUNT(*) FROM "GlobalAnnouncement"
UNION ALL SELECT 'Evaluation', COUNT(*) FROM "Evaluation"
UNION ALL SELECT 'EvaluationPanel', COUNT(*) FROM "EvaluationPanel"
UNION ALL SELECT 'PanelEvaluator', COUNT(*) FROM "PanelEvaluator"
UNION ALL SELECT 'EvaluationAssignment', COUNT(*) FROM "EvaluationAssignment"
UNION ALL SELECT 'EvaluationResult', COUNT(*) FROM "EvaluationResult"
UNION ALL SELECT '_prisma_migrations', COUNT(*) FROM "_prisma_migrations"
ORDER BY 1;
```

**PowerShell one-liner (compare via psql):**

```powershell
$local = "postgresql://postgres:PASSWORD@localhost:5432/foasis_db"
$neon  = "postgresql://USER:PASSWORD@ep-xxx.neon.tech/neondb?sslmode=require"
psql $local -f apps/foasis-backend/docs/sql/neon-row-counts.sql -o local_counts.txt
psql $neon  -f apps/foasis-backend/docs/sql/neon-row-counts.sql -o neon_counts.txt
fc local_counts.txt neon_counts.txt
```

### 5.2 Schema integrity

```sql
-- Tables in public schema (expect 28 app tables + _prisma_migrations)
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;

-- Enums (expect 14)
SELECT typname FROM pg_type
WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace
ORDER BY 1;

-- Foreign keys (expect 11)
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY 1;

-- Unique indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public' AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname;
```

### 5.3 Prisma migration history

```sql
SELECT migration_name, finished_at, applied_steps_count
FROM "_prisma_migrations"
ORDER BY finished_at;
```

Expected: `20250616000000_init` applied.

### 5.4 Application checks

```bash
cd apps/foasis-backend
npm run smoke-test
```

| Check | Pass criteria |
|-------|---------------|
| `GET /health` | `database: connected` |
| `POST /auth/login` | Token returned |
| `GET /dashboard` | 200 with JWT |
| FK spot-check | Login → team → proposal → submission flows work |
| File uploads | Still use local/S3 `UPLOAD_DIR` — **files are not in PostgreSQL** |

---

## 6. Rollback strategy

If migration fails **before** cutover:

- Keep local `foasis_db` unchanged; discard Neon test project/branch.

If migration fails **after** switching `DATABASE_URL`:

1. Stop `foasis-backend`
2. Revert `.env`:

   ```env
   DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/foasis_db?schema=public"
   ```

3. `npx prisma generate`
4. `npm run smoke-test`
5. Restart backend

If local DB was modified during a failed dual-write attempt:

- Restore from `foasis_db_pre_neon_*.dump`:

  ```powershell
  pg_restore -h localhost -U postgres -d foasis_db --clean --if-exists foasis_db_pre_neon.dump
  ```

**Neon safety net:** create a **branch** before final restore; rollback = point app back to local and delete bad branch.

---

## 7. Neon-specific considerations for Prisma

| Topic | Guidance |
|-------|----------|
| **SSL** | Always `?sslmode=require` in `DATABASE_URL` |
| **Connection pooling** | Use `-pooler` host + `?pgbouncer=true` for serverless/high concurrency; add `directUrl` for migrations |
| **Prepared statements** | PgBouncer transaction mode: Prisma needs `?pgbouncer=true` on pooled URL |
| **Cold starts** | First query after idle may be slower; health endpoint helps warm connections |
| **Branches** | Free staging copies — rehearse full migration without touching prod branch |
| **Autoscaling / suspend** | Neon may suspend compute; first request wakes DB (~hundreds of ms) |
| **Extensions** | FOASIS needs none beyond Neon defaults |
| **Superuser** | No local `CREATE ROLE`; use `--no-owner` on dump/restore |
| **IPv6** | Some networks need Neon’s connection pooler or IPv4 add-on — test from deploy region |
| **Long migrations** | `prisma migrate deploy` on empty DB is fast (single init migration); full restore skips re-migration |
| **Serverless driver** | Optional `@prisma/adapter-neon` for edge — not required for NestJS monolith on Node |

---

## 8. Post-migration testing checklist

- [ ] All 28 tables + `_prisma_migrations` exist on Neon
- [ ] Row-count SQL matches local vs Neon
- [ ] 14 enums present
- [ ] 11 foreign keys present
- [ ] Unique indexes present (11)
- [ ] `npx prisma migrate status` → up to date
- [ ] `npm run smoke-test` passes
- [ ] Student login + dashboard
- [ ] Supervisor submission review
- [ ] Coordinator system health
- [ ] Notifications deep links
- [ ] File upload/download (verify `PUBLIC_URL` / `UPLOAD_DIR` for deployed backend)
- [ ] Rotate Neon password if it was exposed during testing
- [ ] Remove `LOCAL_DATABASE_URL` from committed files

---

## 9. What NOT to do

- Do not run `prisma db push` on production Neon
- Do not rename tables or edit `schema.prisma` for this migration
- Do not delete local backup until Neon is verified for several days
- Do not use pooled URL for `pg_restore` / `pg_dump` targets
- Do not commit `.env` with Neon credentials to git

---

## 10. Quick command reference

```bash
# Backup local
pg_dump -h localhost -U postgres -Fc --no-owner --no-acl -f foasis_db.dump foasis_db

# Restore to Neon (direct host)
pg_restore -h EP_HOST -U USER -d neondb --no-owner --no-acl foasis_db.dump

# Prisma
cd apps/foasis-backend
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status

# App verification
npm run smoke-test
npm run start:dev
```

---

## Related docs

- [DATA-CUTOVER.md](./DATA-CUTOVER.md) — microservice → monolith data merge (already completed)
- [PHASE-6-DECOMMISSION.md](./PHASE-6-DECOMMISSION.md) — frontend cutover
- [Prisma + Neon docs](https://www.prisma.io/docs/guides/database/neon)
- [Neon import guide](https://neon.tech/docs/import/import-from-postgres)
