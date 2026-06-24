# FOASIS Architecture Migration

## From Microservices to Modular Monolith

**Principle:** Ship first, then scale — phased migration to minimize risk.

**Goal:** Merge services into a single deployable backend while preserving module boundaries inside the codebase. **No rewrite.** **No API contract changes.** **No frontend changes.**

---

## Executive Summary

FOASIS currently runs as **6 microservices + 1 API gateway + 1 frontend**, each with its own PostgreSQL database and deployment process. Operational complexity (HTTP hops, env sprawl, cross-service debugging, port conflicts) outweighs the scaling benefits at the current project stage.

**Recommendation:** Migrate to a **Modular Monolith** (`apps/foasis-backend`) that:

- Preserves NestJS, Prisma, PostgreSQL, JWT, and all existing REST routes
- Replaces inter-service HTTP with in-process service calls
- Consolidates to **one database** (`foasis_db`) in Phase 5
- Keeps modules isolated so services can be extracted later if needed

---

## Current vs Target

### Current

```text
Frontend (Next.js)
       ↓
API Gateway (:3000)
       ↓
├── Auth Service         (:3001)  → foasis_auth
├── User Service         (:3002)  → foasis_user
├── Team Service         (:3003)  → foasis_team
├── Proposal Service     (:3004)  → foasis_proposal
├── Notification Service (:3005)  → foasis_notification
└── Progress Service     (:3006)  → foasis_progress
```

### Target

```text
Frontend (Next.js)
       ↓
FOASIS Backend — single NestJS app (:3000)
       ↓
foasis_db (single PostgreSQL)
```

**Modules inside the monolith:**

| Module | Source | Notes |
|--------|--------|-------|
| `auth` | `apps/auth-service` | Users, JWT, organizations |
| `users` | `apps/user-service` | Profiles (`/profiles/*`) |
| `teams` | `apps/team-service` | Teams, members, join requests |
| `proposals` | `apps/proposal-service` | Proposals, supervisor matching |
| `notifications` | `apps/notification-service` | User notifications |
| `progress` | `apps/progress-service` | Deliverables, submissions, milestones, meetings, evaluations, announcements, activity logs |
| `dashboard` | `apps/api-gateway/src/dashboard` | Aggregated dashboard APIs |
| `uploads` | `apps/api-gateway/src/uploads` | Local file uploads |
| `health` | Combined | Health check |

> **Note:** Evaluations and announcements are **not** separate services today — they live inside `progress-service`. The gateway only proxies them.

---

## What NOT To Do

| Do not | Reason |
|--------|--------|
| Rewrite business logic | High risk, no user value |
| Change API routes or response shapes | Breaks frontend |
| Change JWT payload format | Breaks auth across app |
| Replace NestJS or Prisma | Team already proficient |
| Migrate feature-by-feature with rewrites | Inconsistent state |

---

## API Contract Preservation

The frontend calls `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`). These routes **must remain identical**:

| Current route | Method | Module |
|---------------|--------|--------|
| `/auth/register` | POST | auth |
| `/auth/login` | POST | auth |
| `/profiles/*` | * | users |
| `/teams/*` | * | teams |
| `/proposals/*` | * | proposals |
| `/notifications/*` | * | notifications |
| `/deliverables/*`, `/submissions/*`, `/milestones/*`, `/meetings/*`, `/evaluations/*`, `/evaluation-panels/*`, `/evaluation-results/*`, `/announcements/*`, `/global-announcements/*`, `/tasks/*`, `/activity-logs/*`, `/stats/*` | * | progress |
| `/dashboard/*` | * | dashboard |
| `/uploads` | POST | uploads |
| `/health` | GET | health |
| `/organizations/*` | * | auth |

> Correction: registration is `POST /auth/register`, not `/auth/signup`.

---

## Migration Phases

### Phase 1 — Monolith skeleton ✅ (started)

**Location:** `apps/foasis-backend/`

```text
apps/foasis-backend/
├── prisma/
│   └── schema.prisma          # Merged schema (reference for Phase 5)
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   ├── common/
│   ├── auth/
│   ├── users/
│   ├── teams/
│   ├── proposals/
│   ├── notifications/
│   ├── progress/
│   ├── dashboard/
│   ├── uploads/
│   └── health/
└── package.json
```

**Status:** ✅ Complete — skeleton, merged schema, all modules in `apps/foasis-backend/`.

---

### Phase 2 — Move services as modules

Copy entire feature folders from each service **without refactoring**:

```text
apps/auth-service/src/auth/*     → apps/foasis-backend/src/auth/*
apps/user-service/src/profiles/* → apps/foasis-backend/src/users/*
apps/team-service/src/teams/*    → apps/foasis-backend/src/teams/*
...
```

**Also move from gateway (these are not separate services today):**

```text
apps/api-gateway/src/dashboard/* → apps/foasis-backend/src/dashboard/*
apps/api-gateway/src/uploads/*   → apps/foasis-backend/src/uploads/*
```

**Rules:**

- Keep controller route prefixes unchanged
- Keep DTOs, services, and guards as-is initially
- One `PrismaService` wired to merged schema (after Phase 5)

**Status:** ✅ Complete — all modules copied and `npm run build` passes.

---

### Phase 3 — Preserve controllers

Gateway proxy controllers become the real controllers. Delete the gateway layer once the monolith serves all routes.

**Checklist per module:**

- [x] Route paths match gateway exactly
- [x] HTTP methods match
- [x] Request/response bodies unchanged
- [x] Guards (`JwtAuthGuard`, `RolesGuard`) still applied

**Status:** ✅ Complete — gateway parity routes added (`/me`, `/users/profile`), initial migration at `prisma/migrations/20250616000000_init`, data copy script at `scripts/migrate-data-from-microservices.ts`. See `apps/foasis-backend/docs/ROUTE-PARITY.md`.

---

### Phase 4 — Replace HTTP with direct calls

**Before (cross-service HTTP):**

```typescript
await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notifications`, payload, {
  headers: { 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY },
});
```

**After (in-process):**

```typescript
await this.notificationsService.create(payload);
```

**High-impact replacements:**

| Caller | Current HTTP target | Replace with |
|--------|---------------------|--------------|
| `proposals.service` | team-service `/teams/my-team` | `TeamsService.getMyTeam()` |
| `proposals.service` | notification-service | `NotificationsService.create()` |
| `progress.service` | team-service, proposal-service | `TeamsService`, `ProposalsService` |
| `team.service` | notification-service | `NotificationsService.create()` |
| `user-service` profiles | progress activity-logs | `ActivityLogsService.create()` |
| `dashboard.controller` | all services | direct service injection |

Remove `INTERNAL_API_KEY` guards on endpoints that become internal-only methods (not HTTP routes).

**Status:** ✅ Complete — all `*_SERVICE_URL` / `axios` inter-service calls replaced with injected services (`TeamsService`, `ProposalsService`, `NotificationsService`, `ActivityLogsService`, `DashboardService`, etc.). `NotificationDispatchService` centralizes notification creation.

---

### Phase 5 — Consolidate databases

**Target:** single database `foasis_db`

**Strategy:**

1. Merge Prisma schemas → `apps/foasis-backend/prisma/schema.prisma` (reference file already prepared)
2. Keep **table names unchanged**
3. Write data migration scripts from 6 DBs → 1 DB
4. Validate row counts per table before cutover
5. Full backup before migration

**Pre-merge checklist:**

- [ ] Export all 6 databases (`scripts/backup-microservice-databases.ps1`)
- [x] Resolve `authUserId` / `userId` consistency across tables (same UUIDs, no remap)
- [ ] Run `prisma migrate deploy` on monolith
- [ ] Run `npm run db:cutover` (migrate + copy + validate)
- [ ] Integration test full user journey (`npm run smoke-test`)

**Status:** ✅ Tooling complete — `db:cutover`, `db:validate-data`, `smoke-test`, [DATA-CUTOVER.md](../apps/foasis-backend/docs/DATA-CUTOVER.md). Run locally when PostgreSQL credentials are configured.

---

### Phase 6 — Decommission microservices

1. Point `NEXT_PUBLIC_API_URL` to monolith (same port `3000`) — see `apps/frontend/.env.example`
2. Stop running individual services
3. Archive `apps/*-service` and `apps/api-gateway` (keep in git history) — see `apps/LEGACY.md`
4. Update README and deployment docs

**Status:** ✅ Complete — frontend defaults to monolith; dev server on port 3007; legacy apps documented. See [PHASE-6-DECOMMISSION.md](../apps/foasis-backend/docs/PHASE-6-DECOMMISSION.md).

---

## Authentication Strategy

**No changes required:**

- JWT via `@nestjs/jwt` + Passport
- `@Roles()` decorator + `RolesGuard`
- Same `JWT_SECRET`
- User lookup becomes a local Prisma query (faster, no network)

---

## Module Isolation Rules (future-proofing)

Even inside the monolith:

```text
✅ teams.module imports TeamsService (exported)
✅ proposals.module imports TeamsModule (exported service only)
❌ proposals.service calls prisma.team directly
❌ Cross-module Prisma queries on foreign tables
```

Use **module exports** and **service interfaces** so a module can be extracted to a microservice later by re-adding HTTP at the boundary.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Broken endpoints | Contract tests; compare gateway routes to monolith routes |
| DB migration data loss | Full backup; row-count validation; staged cutover |
| Hidden HTTP dependencies | Grep for `SERVICE_URL` and `axios` across codebase |
| Frontend breakage | Zero API contract changes; run frontend E2E after each phase |
| Port conflicts (`EADDRINUSE :3000`) | Run only monolith on 3000; frontend on 3007 |

---

## Deployment (Target)

```text
Frontend  → Vercel / static host
Backend   → Railway / Render / VPS (single process)
Database  → Managed PostgreSQL (foasis_db)
Uploads   → Local disk or S3 (future)
```

**Current (7 processes):** gateway + 6 services  
**Target (1 process):** `foasis-backend`

---

## Ship First, Then Scale Roadmap

| Step | Action | Status |
|------|--------|--------|
| 1 | Create monolith skeleton | ✅ Done |
| 2 | Move modules without changing logic | ✅ Done |
| 3 | Wire merged Prisma + migrate data | ✅ Done (migration + script; run deploy locally) |
| 4 | Replace HTTP with service calls | ✅ Done |
| 5 | Regression test all workflows | ⬜ Run locally after Phase 6 cutover |
| 6 | Deploy single backend | ⬜ Pending |
| 7 | Gather usage metrics | ⬜ Pending |
| 8 | Extract only proven bottlenecks | ⬜ Future |

---

## Local Development During Migration

**Recommended (monolith only):**

```bash
# Terminal 1 — backend
cd apps/foasis-backend
npm run start:dev   # PORT=3000

# Terminal 2 — frontend
cd apps/frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev                  # PORT=3007
```

**Legacy (microservices):** The folders under `apps/*-service` and `apps/api-gateway` remain for reference only. See [apps/LEGACY.md](../apps/LEGACY.md). Do not run them alongside `foasis-backend` on port 3000.

**Port 3000 conflict:** Only one process can bind to `:3000`. Stop the API gateway before starting `foasis-backend`, or run the monolith on a different port during parallel testing.

---

## Final Recommendation

For FOASIS at its current stage — evolving requirements, low traffic, academic deployment — a **Modular Monolith** is the most practical architecture.

Keep what works. Remove operational complexity. Preserve a clean path back to microservices if a specific module becomes a proven bottleneck.
