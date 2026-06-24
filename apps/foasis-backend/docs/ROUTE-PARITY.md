# Gateway → Monolith route parity (Phase 3)

Controllers in `apps/foasis-backend` must expose the same HTTP surface as `apps/api-gateway` (proxy layer).

## Top-level routes

| Gateway route prefix | Monolith module | Status |
|---------------------|-----------------|--------|
| `GET /health` | `health` | ✅ |
| `POST /auth/*` | `auth` | ✅ |
| `GET /auth/supervisors`, `GET /auth/users`, … | `auth` | ✅ |
| `GET /organizations/*` | `auth/organizations` | ✅ |
| `GET|POST|PATCH /profiles/*` | `users` | ✅ |
| `GET /users/profile` | `users` (alias) | ✅ Phase 3 |
| `GET /me/team`, `GET /me/proposal` | `me` | ✅ Phase 3 |
| `GET|POST|PATCH /teams/*` | `teams` | ✅ |
| `GET|POST|PATCH /proposals/*` | `proposals` | ✅ |
| `GET|POST|PATCH /notifications/*` | `notifications` | ✅ |
| `GET /dashboard` | `dashboard` | ✅ |
| `POST /uploads` | `uploads` | ✅ |
| Progress routes (no prefix) | `progress/*` | ✅ |

Progress endpoints (`/deliverables`, `/meetings`, `/milestones`, `/tasks`, `/announcements`, `/submissions`, `/evaluations`, `/evaluation-panels`, `/evaluation-results`, `/stats`, `/activity-logs`, `/global-announcements`) are served directly by progress submodules with the same path prefixes as the gateway `ProgressController`.

## Verification

With the monolith running on port 3000:

```bash
curl http://localhost:3000/health
```

Compare gateway OpenAPI or frontend `api.ts` calls against monolith — no path changes should be required on the frontend until cutover.

## Database (Phase 3)

1. Create `foasis_db` in PostgreSQL.
2. `cp .env.example .env` and set `DATABASE_URL`.
3. `npx prisma migrate deploy`
4. Optionally copy existing data: see [DATA-CUTOVER.md](./DATA-CUTOVER.md)
