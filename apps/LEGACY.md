# Legacy microservices (archived)

These apps are **no longer required** for local development or deployment. FOASIS now runs as a single backend at `apps/foasis-backend/`.

| Legacy app | Former port | Replaced by |
|------------|-------------|-------------|
| `api-gateway` | 3000 | `foasis-backend` (routing, uploads, dashboard, health) |
| `auth-service` | 3001 | `foasis-backend/src/auth` |
| `user-service` | 3002 | `foasis-backend/src/users` |
| `team-service` | 3003 | `foasis-backend/src/teams` |
| `proposal-service` | 3004 | `foasis-backend/src/proposals` |
| `notification-service` | 3005 | `foasis-backend/src/notifications` |
| `progress-service` | 3006 | `foasis-backend/src/progress` |

## Why they remain in the repo

- Git history and reference during migration
- Source for data migration scripts (`*_SOURCE_DATABASE_URL`)
- Rollback reference if needed during cutover

## Do not run alongside the monolith

Only **one** process should bind to port **3000** — use `foasis-backend`, not `api-gateway`.

## Active apps

```text
apps/foasis-backend/   ← API (port 3000)
apps/frontend/         ← UI (port 3007)
```

See [foasis-backend/README.md](./foasis-backend/README.md) and [docs/MODULAR-MONOLITH-MIGRATION.md](../docs/MODULAR-MONOLITH-MIGRATION.md).
