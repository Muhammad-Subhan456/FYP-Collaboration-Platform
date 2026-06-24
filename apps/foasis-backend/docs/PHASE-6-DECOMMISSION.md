# Phase 6 — Frontend cutover & microservice decommission

After Phase 5 (data cutover + smoke tests pass), switch the UI to the monolith and stop legacy services.

## Checklist

### 1. Backend running (monolith only)

```bash
cd apps/foasis-backend
npm run start:dev
```

Verify:

```bash
npm run smoke-test
```

Expected: `GET /health`, `POST /auth/login`, and `GET /dashboard` all **PASS**.

> Stop `api-gateway` and all `*-service` processes before starting `foasis-backend` on port 3000.

### 2. Frontend environment

```bash
cd apps/frontend
cp .env.example .env.local
```

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

`JWT_SECRET` in `foasis-backend/.env` must match the value used when user passwords were created (same as former `auth-service`).

### 3. Start frontend

```bash
cd apps/frontend
npm install
npm run dev
```

Open **http://localhost:3007** (frontend dev server; backend stays on 3000).

### 4. Manual regression (recommended)

| Role | Flow |
|------|------|
| Student | Login → dashboard → team → proposal → deliverables |
| Supervisor | Login → review queue → deliverables → meetings |
| Coordinator | Login → users → teams → system health → evaluations |

### 5. Legacy services

Do **not** start:

- `apps/api-gateway`
- `apps/auth-service`
- `apps/user-service`
- `apps/team-service`
- `apps/proposal-service`
- `apps/notification-service`
- `apps/progress-service`

See [apps/LEGACY.md](../../LEGACY.md).

## Port map (target)

| Process | Port |
|---------|------|
| `foasis-backend` | 3000 |
| `frontend` (`npm run dev`) | 3007 |
| PostgreSQL | 5432 |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `EADDRINUSE :3000` | Stop api-gateway; only run `foasis-backend` |
| CORS errors | Set `CORS_ORIGIN=http://localhost:3007` in `foasis-backend/.env` |
| Login 401/400 | Wrong credentials or user not migrated |
| Login 500 | Restart backend after JWT config changes; check `JWT_SECRET` |
| Empty dashboards | Re-run `npm run db:cutover` or verify `DATABASE_URL` |

## Status

Phase 6 complete when:

- [x] Frontend `.env.example` points at monolith
- [x] Frontend dev runs on port 3007
- [x] `/health` returns `services` array for coordinator UI
- [x] Legacy apps documented as archived
- [ ] Full UI regression signed off locally
