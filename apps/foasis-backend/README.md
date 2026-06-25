# FOASIS Backend (Modular Monolith)

Unified NestJS backend for FOASIS. This app will eventually replace:

- `apps/api-gateway`
- `apps/auth-service`
- `apps/user-service`
- `apps/team-service`
- `apps/proposal-service`
- `apps/notification-service`
- `apps/progress-service`

## Migration status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Skeleton + merged Prisma schema | ✅ Done |
| 2 | Copy service modules | ✅ Done |
| 3 | Preserve API routes + Prisma migrate | ✅ Done |
| 4 | Replace HTTP with in-process calls | ✅ Done |
| 5 | Single database data cutover | ✅ Tooling ready (`npm run db:cutover`) |
| 6 | Decommission microservices | ✅ Done (frontend + docs; legacy apps archived in repo) |

See [docs/MODULAR-MONOLITH-MIGRATION.md](../../docs/MODULAR-MONOLITH-MIGRATION.md), [docs/ROUTE-PARITY.md](./docs/ROUTE-PARITY.md), [docs/DATA-CUTOVER.md](./docs/DATA-CUTOVER.md), [docs/PHASE-6-DECOMMISSION.md](./docs/PHASE-6-DECOMMISSION.md), [docs/SUPABASE-MIGRATION.md](./docs/SUPABASE-MIGRATION.md), and [../../docs/DOCKER.md](../../docs/DOCKER.md).

## Quick start

```bash
cd apps/foasis-backend
npm install
cp .env.example .env
# Create database: createdb foasis_db  (or via pgAdmin)
# Edit DATABASE_URL in .env

npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Health check: `GET http://localhost:3000/health`

> **Port conflict:** Do not run `foasis-backend` and `api-gateway` on port 3000 at the same time.

## Migrate existing microservice data

See **[docs/DATA-CUTOVER.md](./docs/DATA-CUTOVER.md)** for the full Phase 5 guide.

Quick cutover (after configuring `.env`):

```bash
npm run db:cutover
npm run start:dev
npm run smoke-test
```

## Environment

See `.env.example` for all variables. Minimum:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/foasis_db
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:3007
UPLOAD_DIR=../../uploads
PUBLIC_URL=http://localhost:3000
```

`INTERNAL_API_KEY` is only needed if you still call internal HTTP routes from outside the process (legacy). Normal monolith operation does not require `*_SERVICE_URL` variables.
