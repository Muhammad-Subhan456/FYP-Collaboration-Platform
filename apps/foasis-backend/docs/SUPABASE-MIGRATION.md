# FOASIS — Local PostgreSQL → Supabase PostgreSQL Migration

**Scope:** Database only. No frontend, backend hosting, file storage, or Supabase Auth.

Move `foasis_db` from local PostgreSQL to **Supabase PostgreSQL** with zero data loss, unchanged Prisma schema, and preserved migration history.

---

## Before you start

| Item | Value |
|------|-------|
| Local database name | `foasis_db` |
| Prisma app | `apps/foasis-backend` |
| Prisma schema | `prisma/schema.prisma` (do **not** edit for this migration) |
| Migration folder | `prisma/migrations/20250616000000_init/` |
| Tables to preserve | 28 application tables + `_prisma_migrations` |
| Enums to preserve | 14 |

### pg_dump vs Prisma — decision (read once)

| Tool | Role in this migration |
|------|------------------------|
| **`pg_dump`** | **MANDATORY** — exports schema + data + enums + indexes + FKs + `_prisma_migrations` |
| **`pg_restore` / `psql`** | **MANDATORY** — imports into Supabase |
| **`prisma generate`** | **MANDATORY** — regenerates client after URL change |
| **`prisma migrate deploy`** | **MANDATORY** — verifies migration history (should be no-op after restore) |
| **`prisma migrate status`** | **OPTIONAL** — read-only confirmation |
| **`prisma db push`** | **DO NOT RUN** — bypasses migration history |
| **`prisma db pull`** | **DO NOT RUN** — overwrites `schema.prisma` |
| **`prisma migrate dev`** | **DO NOT RUN** — creates new migrations |
| **`prisma migrate reset`** | **DO NOT RUN** — wipes database |

**Why not Prisma-only?** Prisma has no single command to copy all production data between servers. `pg_dump` → `pg_restore` is the safest way to preserve everything exactly.

---

## Phase 1 — Create Supabase Project

### Goal

Create an empty Supabase PostgreSQL database and obtain the **direct** connection string for import and Prisma migrations.

### Steps (Supabase Dashboard)

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New project**.
3. **Organization:** choose existing or create one (e.g. `FOASIS`).
4. **Project name:** `foasis` (or `foasis-prod`).
5. **Database password:** generate a strong password and **save it in a password manager**. You cannot recover it later without reset.
6. **Region:** pick the region closest to where the database will be used (e.g. `Southeast Asia (Singapore)` or `US East`). Cannot be changed after creation.
7. **Compute / plan:** Free tier is fine for migration rehearsal; use Pro if you need production SLA.
8. Click **Create new project** and wait until status is **Active** (2–5 minutes).

### Database settings (defaults are correct)

| Setting | FOASIS requirement |
|---------|-------------------|
| Database name | `postgres` (Supabase default — use this) |
| Schema | `public` (Prisma default) |
| PostgreSQL version | 15.x (Supabase default — compatible) |
| Extensions | None required for FOASIS |

Do **not** enable Supabase Auth, Storage, or Edge Functions for this migration.

### Which connection string to use with Prisma

1. In Supabase: **Project Settings** (gear) → **Database**.
2. Scroll to **Connection string**.
3. Select tab **URI**.
4. Choose **Direct connection** (host looks like `db.xxxxxxxxxxxx.supabase.co`, port **5432**).

Example shape:

```text
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

Or older format:

```text
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Use this Direct / Session connection (port 5432) for:**

- `pg_restore`
- `psql`
- `prisma migrate deploy`
- `DATABASE_URL` during initial cutover and local testing

**Do NOT use Transaction pooler (port 6543)** for `pg_restore` or `prisma migrate deploy`.

Copy the URI and replace `[YOUR-PASSWORD]` with your actual database password. If the password contains special characters (`@`, `#`, `%`), URL-encode them.

### Commands

None in this phase (dashboard only).

### Expected result

- Supabase project status: **Active**
- You have saved: project ref, database password, **direct** connection URI

### Validation

In Supabase → **Database** → **Tables**: only Supabase system tables or empty `public` schema (no FOASIS tables yet).

### Common mistakes

| Mistake | Fix |
|---------|-----|
| Losing database password | Reset under Settings → Database → Reset database password |
| Using pooler port 6543 for restore | Use direct connection port 5432 |
| Creating tables manually in SQL Editor | Leave database empty; `pg_restore` creates everything |
| Enabling Supabase Auth | Not needed; FOASIS uses its own JWT users in `User` table |

---

## Phase 2 — Backup Local PostgreSQL

### Goal

Create a verified backup of local `foasis_db` before any changes. Keep this file until Supabase is proven stable for several days.

### Prerequisites

- PostgreSQL client tools installed (`pg_dump`, `pg_restore`, `psql`)
- Local PostgreSQL running
- You know local credentials (from `apps/foasis-backend/.env`)

### Commands (PowerShell)

```powershell
# 1. Go to project root
Set-Location "D:\Subhan Folder\FYP-Collaboration-Platform"

# 2. Set local postgres password (match your .env)
$env:PGPASSWORD = "hp123456"

# 3. MANDATORY — custom-format backup (best for pg_restore)
$backupFile = "foasis_db_pre_supabase_$(Get-Date -Format yyyyMMdd_HHmm).dump"
pg_dump -h localhost -p 5432 -U postgres -Fc --no-owner --no-acl -f $backupFile foasis_db

# 4. OPTIONAL — plain SQL backup (human-readable fallback)
pg_dump -h localhost -p 5432 -U postgres --no-owner --no-acl -f "foasis_db_pre_supabase.sql" foasis_db

# 5. Show backup file size (must be > 0 bytes)
Get-Item $backupFile | Select-Object Name, Length, LastWriteTime
```

| Command | Mandatory? |
|---------|------------|
| `pg_dump ... -Fc ...` | **Yes** |
| `pg_dump ... .sql` | Optional (second safety copy) |

### Expected result

- File exists: `foasis_db_pre_supabase_YYYYMMDD_HHMM.dump`
- Size is greater than 0 bytes (typically tens of KB to several MB depending on data)

### Validation

**Method A — list dump contents (MANDATORY):**

```powershell
$env:PGPASSWORD = "hp123456"
pg_restore --list foasis_db_pre_supabase_*.dump | Select-Object -First 30
```

You should see lines containing `TABLE`, `TABLE DATA`, `ENUM`, `FK CONSTRAINT`, and `_prisma_migrations`.

**Method B — row counts on local DB (MANDATORY baseline):**

```powershell
$localUrl = "postgresql://postgres:hp123456@localhost:5432/foasis_db"
psql $localUrl -f apps/foasis-backend/docs/sql/supabase-row-counts.sql -o local_row_counts.txt
Get-Content local_row_counts.txt
```

Save `local_row_counts.txt` — you will compare it to Supabase in Phase 6.

### Common mistakes

| Mistake | Fix |
|---------|-----|
| `pg_dump: command not found` | Add PostgreSQL `bin` to PATH or use full path to `pg_dump.exe` |
| `authentication failed` | Check `$env:PGPASSWORD` and username |
| Backup file 0 bytes | Dump failed; read error output |
| Skipping backup | Never proceed without a verified `.dump` file |

---

## Phase 3 — Export Database

### Goal

Confirm local export is complete and ready for Supabase import.

If Phase 2 succeeded, **export is already done** (`pg_dump` is the export). This phase verifies completeness.

### Commands (PowerShell)

```powershell
Set-Location "D:\Subhan Folder\FYP-Collaboration-Platform"

# MANDATORY — verify all FOASIS tables exist locally
$localUrl = "postgresql://postgres:hp123456@localhost:5432/foasis_db"
psql $localUrl -f apps/foasis-backend/docs/sql/supabase-verify-schema.sql -o local_schema_verify.txt

# MANDATORY — confirm _prisma_migrations exists locally
psql $localUrl -c "SELECT migration_name, finished_at FROM \"_prisma_migrations\";"
```

| Command | Mandatory? |
|---------|------------|
| `supabase-verify-schema.sql` on local | **Yes** |
| `_prisma_migrations` query | **Yes** |

### Expected result

**Tables:** 29 rows in public schema (28 app + `_prisma_migrations`).

**Enums:** 14 enum types.

**Foreign keys:** 11 constraints.

**Migration history:**

```text
 migration_name          | finished_at
-------------------------+-------------
 20250616000000_init     | (timestamp)
```

### Validation

Compare `local_schema_verify.txt` against expected counts in Phase 6.

### Common mistakes

| Mistake | Fix |
|---------|-----|
| Exporting wrong database | Confirm database name is `foasis_db`, not `fyp_auth` etc. |
| Using `prisma db pull` as export | Wrong tool — use `pg_dump` only |

---

## Phase 4 — Import Database Into Supabase

### Goal

Restore the full local backup into Supabase `postgres` database, preserving tables, data, enums, indexes, foreign keys, and `_prisma_migrations`.

### Prerequisites

- Phase 2 backup file ready
- Supabase project **Active**
- Direct connection URI from Phase 1

### Stop writes before final import (minimal downtime)

When doing the **production cutover** import:

1. Stop `foasis-backend` so no new writes go to local DB.
2. Run **one more** `pg_dump` (repeat Phase 2 commands) for the final snapshot.
3. Restore that final snapshot to Supabase.

For **rehearsal**, you can import while local still runs (no downtime).

### Commands (PowerShell)

```powershell
Set-Location "D:\Subhan Folder\FYP-Collaboration-Platform"

# 1. Set variables — REPLACE with your values
$env:PGPASSWORD = "YOUR_SUPABASE_DB_PASSWORD"
$supabaseUrl = "postgresql://postgres.[PROJECT-REF]:YOUR_SUPABASE_DB_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
# OR: postgresql://postgres:YOUR_SUPABASE_DB_PASSWORD@db.[PROJECT-REF].supabase.co:5432/postgres

$dumpFile = "foasis_db_pre_supabase_20260625_1118.dump"   # your actual filename

# 2. MANDATORY — test connection
psql $supabaseUrl -c "SELECT 1 AS connected;"

# 3. MANDATORY — restore (custom format dump)
pg_restore --dbname=$supabaseUrl --no-owner --no-acl --verbose $dumpFile
```

**If `pg_restore` reports errors but ends with mostly successful output:** common harmless messages:

- `role "postgres" does not exist` — ignore when using `--no-owner`
- `already exists` — you ran restore twice; use a fresh Supabase project or drop objects first

**Alternative — plain SQL file (OPTIONAL, only if you created `.sql` backup):**

```powershell
psql $supabaseUrl -f foasis_db_pre_supabase.sql
```

| Command | Mandatory? |
|---------|------------|
| `psql ... SELECT 1` | **Yes** |
| `pg_restore --dbname=...` | **Yes** (if using `.dump`) |
| `psql -f .sql` | Only if using SQL backup instead |

### Expected result

- `pg_restore` completes without fatal errors
- Supabase Dashboard → **Database** → **Tables** shows all FOASIS tables (`User`, `Team`, `Proposal`, etc.)

### Validation

```powershell
psql $supabaseUrl -f apps/foasis-backend/docs/sql/supabase-verify-schema.sql -o supabase_schema_verify.txt
psql $supabaseUrl -f apps/foasis-backend/docs/sql/supabase-row-counts.sql -o supabase_row_counts.txt
```

### Common mistakes

| Mistake | Fix |
|---------|-----|
| Wrong password in URI | Reset password in Supabase Settings → Database |
| Special chars in password not URL-encoded | Encode `@` → `%40`, etc. |
| Using port 6543 (transaction pooler) | Use port 5432 direct connection |
| Running restore twice on same DB | Create new Supabase project or drop all public tables first |
| Using `prisma db push` instead of restore | Wrong — data would be empty |

---

## Phase 5 — Update Prisma Configuration

### Goal

Point Prisma and `foasis-backend` at Supabase. **Do not change** `schema.prisma` models, enums, or relations.

### Using Session pooler (your setup)

If **direct** `db.xxx.supabase.co` failed (DNS / IPv6) but **Session pooler** works, that is fine for FOASIS.

| Connection type | Host | Port | Use for |
|-----------------|------|------|---------|
| **Session pooler** ✅ | `aws-0-….pooler.supabase.com` | **5432** | `psql`, `pg_restore`, `DATABASE_URL`, `prisma migrate deploy` |
| Direct | `db.xxx.supabase.co` | 5432 | Same (if DNS works on your network) |
| Transaction pooler | `….pooler.supabase.com` | **6543** | Avoid for Prisma migrate — needs `directUrl` + `?pgbouncer=true` |

Session pooler URI shape (from Supabase → Database → Connection string → **Session pooler**):

```env
DATABASE_URL="postgresql://postgres.aydefnqsshwzwtykgeng:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?schema=public"
```

Notes:

- User is `postgres.PROJECT_REF`, not plain `postgres`.
- **No `schema.prisma` edit required** for Session pooler — keep single `url = env("DATABASE_URL")`.
- **Do not** add `directUrl` unless you switch to **Transaction** pooler (port 6543).

### Prisma datasource (no file change required)

Current `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

This is correct for Supabase Session pooler. **No edit needed.**

### Update environment variables

Edit `apps/foasis-backend/.env`:

```env
# BEFORE (local)
# DATABASE_URL="postgresql://postgres:hp123456@localhost:5432/foasis_db?schema=public"

# AFTER (Supabase — Session pooler, port 5432)
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?schema=public"

# OR direct (only if db.xxx.supabase.co resolves on your network):
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?schema=public"
```

**Optional — keep local URL for row-count comparison (do not commit):**

```env
LOCAL_DATABASE_URL="postgresql://postgres:hp123456@localhost:5432/foasis_db?schema=public"
```

Update `apps/foasis-backend/.env.example` template for your team (no real passwords).

**Do NOT change for database migration:**

- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`, `PUBLIC_URL`

### Prisma commands (run in order)

```powershell
Set-Location "D:\Subhan Folder\FYP-Collaboration-Platform\apps\foasis-backend"

# MANDATORY — regenerate Prisma Client (no database writes)
npx prisma generate

# MANDATORY — confirm migrations; should report already applied
npx prisma migrate deploy

# OPTIONAL — read-only status check
npx prisma migrate status
```

| Command | Mandatory? |
|---------|------------|
| `npx prisma generate` | **Yes** |
| `npx prisma migrate deploy` | **Yes** |
| `npx prisma migrate status` | Optional |
| `npx prisma db push` | **DO NOT RUN** |
| `npx prisma db pull` | **DO NOT RUN** |
| `npx prisma migrate reset` | **DO NOT RUN** |

### Expected result

**`prisma generate`:**

```text
✔ Generated Prisma Client
```

**`prisma migrate deploy`:**

```text
No pending migrations to apply.
```

(or lists `20250616000000_init` as already applied)

**`prisma migrate status`:**

```text
Database schema is up to date!
```

### Validation

```powershell
npx prisma migrate status
psql $supabaseUrl -c "SELECT migration_name FROM \"_prisma_migrations\";"
```

### Common mistakes

| Mistake | Fix |
|---------|-----|
| Editing `schema.prisma` models | Not needed — only change `DATABASE_URL` |
| `P1001: Can't reach database server` | Check Supabase project active, IP allowlist (allow all for dev), SSL |
| `migrate deploy` tries to re-create tables | `_prisma_migrations` not restored — re-run `pg_restore` |
| Committing `.env` with password | Add `.env` to `.gitignore`; never push secrets |

---

## Phase 6 — Verify Migration

### Goal

Prove Supabase has identical schema and row counts vs local backup baseline.

### Verification checklist

- [ ] Connection works (`SELECT 1`)
- [ ] 29 tables in `public`
- [ ] 14 enums
- [ ] 11 foreign keys
- [ ] 11 unique indexes (excluding primary keys)
- [ ] `_prisma_migrations` contains `20250616000000_init`
- [ ] Row counts match local baseline file
- [ ] `npx prisma migrate status` → up to date

### Commands (PowerShell)

```powershell
$localUrl = "postgresql://postgres:hp123456@localhost:5432/foasis_db"
$supabaseUrl = "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# Row counts — compare outputs
psql $localUrl -f apps/foasis-backend/docs/sql/supabase-row-counts.sql -o local_counts.txt
psql $supabaseUrl -f apps/foasis-backend/docs/sql/supabase-row-counts.sql -o supabase_counts.txt
fc local_counts.txt supabase_counts.txt

# Full schema verification on Supabase
psql $supabaseUrl -f apps/foasis-backend/docs/sql/supabase-verify-schema.sql

# Prisma
Set-Location "D:\Subhan Folder\FYP-Collaboration-Platform\apps\foasis-backend"
npx prisma migrate status
```

### SQL — row counts (all tables)

File: `apps/foasis-backend/docs/sql/supabase-row-counts.sql`

### SQL — tables, enums, FKs, migration history

File: `apps/foasis-backend/docs/sql/supabase-verify-schema.sql`

### SQL — migration history only

```sql
SELECT id, migration_name, checksum, finished_at, applied_steps_count
FROM "_prisma_migrations"
ORDER BY finished_at;
```

### SQL — foreign keys only

```sql
SELECT conname, conrelid::regclass AS "table", confrelid::regclass AS references
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY 1;
```

### SQL — enums only

```sql
SELECT typname FROM pg_type
WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace
ORDER BY 1;
```

### Expected result

- `fc` shows **no differences** between `local_counts.txt` and `supabase_counts.txt`
- Schema verification counts match Phase 3 baseline
- Prisma reports schema up to date

### Common mistakes

| Mistake | Fix |
|---------|-----|
| Comparing before restore finished | Re-run counts after `pg_restore` completes |
| Ignoring `_prisma_migrations` row count | Must be ≥ 1 on both sides |

---

## Phase 7 — Test FOASIS (database connectivity only)

### Goal

Confirm the NestJS app can read/write Supabase through Prisma with the new `DATABASE_URL`.

**Scope:** Database connectivity only — not full application QA.

### Commands (PowerShell)

```powershell
Set-Location "D:\Subhan Folder\FYP-Collaboration-Platform\apps\foasis-backend"

# MANDATORY — health check hits Prisma
npm run start:dev
# In another terminal:
curl.exe http://localhost:3000/health
# Expect: "database":"connected"

# OPTIONAL — smoke test (login reads User table)
# Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env first
npm run smoke-test
```

| Command | Mandatory? |
|---------|------------|
| `GET /health` | **Yes** |
| `npm run smoke-test` | Optional (confirms auth + dashboard queries work) |

### Expected result

```json
{"status":"ok","service":"foasis-backend","database":"connected",...}
```

Smoke test (if run): `GET /health`, `POST /auth/login`, `GET /dashboard` all **PASS**.

### Validation

Health endpoint `database: connected` proves Prisma → Supabase works.

### Common mistakes

| Mistake | Fix |
|---------|-----|
| Backend still on old `DATABASE_URL` | Restart after `.env` change |
| Supabase paused (free tier) | Open dashboard to wake project |

---

## Phase 8 — Rollback Plan

### Goal

Return to local PostgreSQL if Supabase migration fails or data looks wrong.

### When to rollback

- Row count mismatch after restore
- `prisma migrate deploy` fails with schema conflicts
- Missing tables or enums on Supabase
- Any unexplained data loss

### Rollback checklist

- [ ] Stop `foasis-backend`
- [ ] Restore `DATABASE_URL` to local PostgreSQL in `.env`
- [ ] Run `npx prisma generate`
- [ ] Confirm `GET /health` → `database: connected` against local
- [ ] If local DB was damaged: restore from Phase 2 `.dump` file

### Commands (PowerShell)

```powershell
# 1. Stop foasis-backend (Ctrl+C in its terminal)

# 2. Revert .env
# DATABASE_URL="postgresql://postgres:hp123456@localhost:5432/foasis_db?schema=public"

Set-Location "D:\Subhan Folder\FYP-Collaboration-Platform\apps\foasis-backend"
npx prisma generate

# 3. Verify local
$localUrl = "postgresql://postgres:hp123456@localhost:5432/foasis_db"
psql $localUrl -c "SELECT COUNT(*) FROM \"User\";"

# 4. ONLY IF local DB was corrupted — restore backup
$env:PGPASSWORD = "hp123456"
pg_restore -h localhost -U postgres -d foasis_db --clean --if-exists --no-owner --no-acl foasis_db_pre_supabase_YYYYMMDD_HHMM.dump
```

| Command | When |
|---------|------|
| Revert `DATABASE_URL` | Always |
| `prisma generate` | Always |
| `pg_restore --clean` to local | Only if local data was corrupted |

### Expected result

Application works against local `foasis_db` exactly as before migration attempt.

### Common mistakes

| Mistake | Fix |
|---------|-----|
| Deleting local backup too soon | Keep `.dump` until Supabase is stable for days |
| `pg_restore --clean` without backup | Never run on local unless you have `.dump` |

---

## Quick reference — command summary

```powershell
# BACKUP (mandatory)
pg_dump -h localhost -U postgres -Fc --no-owner --no-acl -f foasis_db.dump foasis_db

# RESTORE to Supabase (mandatory)
pg_restore --dbname="SUPABASE_DIRECT_URI" --no-owner --no-acl --verbose foasis_db.dump

# PRISMA (mandatory after URL change)
npx prisma generate
npx prisma migrate deploy

# VERIFY (mandatory)
psql $supabaseUrl -f apps/foasis-backend/docs/sql/supabase-row-counts.sql
psql $supabaseUrl -f apps/foasis-backend/docs/sql/supabase-verify-schema.sql
npx prisma migrate status
```

---

## FOASIS inventory (what must exist on Supabase)

**14 enums:** `UserRole`, `SubscriptionPlan`, `Department`, `ProfileType`, `JoinRequestStatus`, `ProposalStatus`, `RequestStatus`, `DeliverableType`, `SubmissionStatus`, `AnnouncementType`, `MeetingType`, `MilestoneStatus`, `TaskStatus`, `EvaluationType`

**28 tables:** `User`, `Organization`, `UserProfile`, `Team`, `TeamMember`, `JoinRequest`, `Proposal`, `SupervisorRequest`, `SupervisorInvitation`, `Notification`, `Meeting`, `Announcement`, `Deliverable`, `DeliverableDeadlineExtension`, `Submission`, `Milestone`, `Task`, `ActivityLog`, `GlobalAnnouncement`, `Evaluation`, `EvaluationPanel`, `PanelEvaluator`, `EvaluationAssignment`, `EvaluationResult`

**System:** `_prisma_migrations` with `20250616000000_init`

---

## Related files

| File | Purpose |
|------|---------|
| `docs/sql/supabase-row-counts.sql` | Row count comparison |
| `docs/sql/supabase-verify-schema.sql` | Tables, enums, FKs, migrations |
| `prisma/schema.prisma` | Unchanged |
| `prisma/migrations/20250616000000_init/` | Unchanged |
