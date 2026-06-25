# FOASIS — Docker Guide

Run the full stack with one command (Supabase PostgreSQL stays **external**):

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3007 |
| Backend API | http://localhost:3000 |
| Health | http://localhost:3000/health |

---

## Phase 1 — Analysis Findings

| Area | Finding |
|------|---------|
| **Monolith** | `apps/foasis-backend` (NestJS 11) + `apps/frontend` (Next.js 16) |
| **Backend build** | `nest build` → output at `dist/main.js` (`rootDir: src` in `tsconfig.build.json`) |
| **Backend start** | `start:prod` → `node dist/main.js` |
| **Prisma** | 6.19.3 in lockfile; schema at `prisma/schema.prisma`; one migration `20250616000000_init` |
| **Database** | External Supabase via `DATABASE_URL` — not containerized |
| **Uploads** | `UPLOAD_DIR` env + `multer` disk storage; static files at `/files/*` via `main.ts` |
| **File URLs** | `PUBLIC_URL` + `/files/{filename}` in `uploads.controller.ts` |
| **CORS** | `origin: true` in `main.ts` — works for browser on `:3007` |
| **Frontend API** | `NEXT_PUBLIC_API_URL` — **build-time** env for Next.js (browser calls host `localhost:3000`) |
| **Ports** | Backend `3000`, Frontend `3007` (matches local dev) |

### Docker risk items addressed

| Risk | Mitigation |
|------|------------|
| Wrong NestJS entry path | CMD `dist/main.js` |
| Prisma engine on Linux | `node:20-bookworm-slim` + `openssl` |
| Prisma Client missing | `prisma generate` in build + runner |
| Migrations on startup | `docker-entrypoint.sh` runs `prisma migrate deploy` |
| Uploads lost on restart | Named volume `foasis_uploads` → `/app/uploads` |
| `PUBLIC_URL` wrong in container | Set to `http://localhost:3000` in compose (browser-facing) |
| Next image size | `output: 'standalone'` in `next.config.ts` |
| `NEXT_PUBLIC_*` at runtime | Passed as Docker **build arg** |

---

## Phase 2 — Docker Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Host (Windows + Docker Desktop)                        │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │ foasis-frontend  │    │ foasis-backend   │          │
│  │ :3007            │───▶│ :3000            │          │
│  │ Next standalone  │    │ NestJS + Prisma  │          │
│  └────────┬─────────┘    └────────┬─────────┘          │
│           │ browser               │                     │
│           │ localhost:3000        │ DATABASE_URL        │
│           ▼                       ▼                     │
│     User browser            Supabase PostgreSQL         │
│                             (external)                  │
│                                                         │
│  Volume: foasis_uploads → /app/uploads (backend)        │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 3 — Files Generated

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates frontend + backend |
| `docker.env.example` | Template for required env vars |
| `apps/foasis-backend/Dockerfile` | Multi-stage NestJS + Prisma image |
| `apps/foasis-backend/.dockerignore` | Smaller build context |
| `apps/foasis-backend/docker-entrypoint.sh` | `prisma migrate deploy` then start |
| `apps/frontend/Dockerfile` | Multi-stage Next.js standalone image |
| `apps/frontend/.dockerignore` | Smaller build context |

**Also updated:**

- `apps/foasis-backend/package.json` — `start:prod` path
- `apps/frontend/next.config.ts` — `output: 'standalone'`

---

## Phase 4 — Explanation of Each File

### `apps/foasis-backend/Dockerfile`

1. **deps** — `npm ci` with OpenSSL (Prisma requirement)
2. **builder** — `prisma generate` + `nest build`
3. **runner** — production deps, Prisma CLI for migrations, non-root user, upload volume

### `docker-entrypoint.sh`

Runs `npx prisma migrate deploy` before `node dist/main.js`. Safe when `_prisma_migrations` already exists (no-op).

### `apps/frontend/Dockerfile`

1. **deps** — `npm ci`
2. **builder** — `NEXT_PUBLIC_API_URL` build arg → `npm run build`
3. **runner** — copies `.next/standalone` + static assets, runs `server.js` on port 3007

### `docker-compose.yml`

- Loads secrets from `apps/foasis-backend/.env`
- Overrides `UPLOAD_DIR`, `PUBLIC_URL` for container paths
- Backend healthcheck gates frontend start
- Named volume for uploads persistence

---

## Phase 5 — Build Commands

```bash
# From repository root
cd "D:\Subhan Folder\FYP-Collaboration-Platform"

# Ensure backend .env exists with Supabase DATABASE_URL
copy apps\foasis-backend\.env.example apps\foasis-backend\.env
# Edit .env — set DATABASE_URL, JWT_SECRET

# Build all images
docker compose build

# Build without cache (if Prisma/client issues)
docker compose build --no-cache
```

| Command | Mandatory? |
|---------|------------|
| `docker compose build` | Yes (first time / after code changes) |
| `docker compose build --no-cache` | Only when debugging cache issues |

---

## Phase 6 — Run Commands

```bash
# Foreground (logs in terminal)
docker compose up --build

# Detached
docker compose up --build -d

# Stop
docker compose down

# Stop and remove uploads volume (destructive)
docker compose down -v

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Re-run migrations manually
docker compose exec backend npx prisma migrate deploy
```

| Command | Mandatory? |
|---------|------------|
| `docker compose up --build` | Yes |
| `docker compose down` | When stopping |
| `prisma db push` | **DO NOT RUN** |
| `prisma migrate reset` | **DO NOT RUN** |

---

## Phase 7 — Validation Checklist

### Infrastructure

- [ ] `docker compose up --build` exits without build errors
- [ ] `curl http://localhost:3000/health` → `"database":"connected"`
- [ ] `curl http://localhost:3007` → Next.js HTML
- [ ] Backend logs show `prisma migrate deploy` success
- [ ] `docker volume ls` shows `foasis_uploads`

### Auth

- [ ] Register new user
- [ ] Login returns JWT
- [ ] Protected routes reject missing token (401)
- [ ] Logout / token expiry redirects to login

### Core features

- [ ] Team management (create/join team)
- [ ] Proposals (submit, review)
- [ ] Notifications (list, mark read, deep links)
- [ ] Meetings (create, list)
- [ ] Evaluations (coordinator flow)
- [ ] Deliverables + submissions
- [ ] File upload → URL uses `http://localhost:3000/files/...`
- [ ] Uploaded file opens in browser

### Database

- [ ] Prisma queries work (no engine errors in logs)
- [ ] Supabase dashboard shows expected row counts after actions
- [ ] `docker compose exec backend npx prisma migrate status` → up to date

---

## Phase 8 — Troubleshooting Guide

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Can't reach database server` | Wrong `DATABASE_URL` or Supabase paused | Check `.env`; wake Supabase project |
| `P1001` / SSL errors | Missing SSL in URL | Add `?sslmode=require` to Supabase URI |
| `prisma migrate deploy` fails | Empty DB, no restore | Run Supabase migration guide first, or let init migration apply on empty DB |
| `ENOENT dist/main` | Wrong start path | Use `node dist/main.js` |
| Frontend calls wrong API | `NEXT_PUBLIC_API_URL` at build time | Rebuild: `docker compose build --no-cache frontend` |
| Upload 404 | `PUBLIC_URL` mismatch | Must be `http://localhost:3000` for local Docker |
| Uploads disappear | Volume not mounted | Check `foasis_uploads` volume in compose |
| CORS errors | Rare with `origin: true` | Verify backend is `:3000`, frontend `:3007` |
| Port already in use | Local dev servers running | Stop `npm run start:dev` / `npm run dev` |
| IPv6 / Supabase DNS | Direct host fails | Use Session pooler URL in `DATABASE_URL` |
| Prisma binary target error | Wrong base image | Image uses `bookworm-slim` + OpenSSL — rebuild with `--no-cache` |

### Prisma: build vs startup

| Step | When | Why |
|------|------|-----|
| `prisma generate` | **Docker build** (builder + runner) | Generates client for Linux engine |
| `prisma migrate deploy` | **Container startup** (entrypoint) | Applies pending migrations safely |

**Do not use** `prisma db push` in Docker or production.

---

## Environment variables

| Variable | Service | Set in |
|----------|---------|--------|
| `DATABASE_URL` | Backend | `apps/foasis-backend/.env` |
| `JWT_SECRET` | Backend | `apps/foasis-backend/.env` |
| `JWT_EXPIRES_IN` | Backend | `apps/foasis-backend/.env` |
| `PUBLIC_URL` | Backend | `docker-compose.yml` → `http://localhost:3000` |
| `UPLOAD_DIR` | Backend | `docker-compose.yml` → `/app/uploads` |
| `NEXT_PUBLIC_API_URL` | Frontend | `docker-compose.yml` build arg |

`prisma/schema.prisma` unchanged — reads `env("DATABASE_URL")` only.
