# FOASIS — Docker Guide

Two Compose files:

| File | Use | Public ports |
|------|-----|----------------|
| `docker-compose.yml` | Local: Next.js + NestJS, **external** Postgres | `3007` frontend, `3000` backend |
| `docker-compose.prod.yml` | University VM: Nginx + Next.js + NestJS + Postgres | **80** and **443** only |

Package manager: **npm** (`package-lock.json` in each app). Do not switch to pnpm/yarn.

---

## Production architecture

```text
Internet
  → Nginx :80/:443
       ├─ /              → frontend :3007  (Next.js)
       ├─ /api/*         → backend :3000   (NestJS; `/api` is stripped)
       ├─ /socket.io/*   → backend         (Socket.IO)
       └─ /health        → backend /health
            └─ postgres :5432  (internal Docker network only)
```

NestJS has **no** global `/api` prefix. Nginx adds `/api` so API routes do not collide with Next.js pages such as `/auth/login`.

Build the frontend with `NEXT_PUBLIC_API_URL=/api` so the browser calls same-origin `/api/...`. Socket.IO uses the page origin (`/socket.io` + `/realtime` namespace).

---

## Local (`docker-compose.yml`)

```bash
copy docker.env.example apps\foasis-backend\.env
# Edit DATABASE_URL, JWT_SECRET, RESEND_API_KEY

docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3007 |
| Backend | http://localhost:3000 |
| Health | http://localhost:3000/health |

Stop: `docker compose down`  
Do **not** use `docker compose down -v` unless you intend to delete the uploads volume.

---

## University VM (`docker-compose.prod.yml`)

### 1. Environment

```bash
copy docker.prod.env.example .env
```

Edit `.env`:

- `POSTGRES_PASSWORD` and matching `DATABASE_URL` (hostname **must** be `postgres`, not `localhost`)
- `JWT_SECRET` — `openssl rand -base64 48` (≥32 chars, not a placeholder)
- `RESEND_API_KEY`, `EMAIL_FROM`
- `FRONTEND_URL` / `CORS_ORIGIN` / `PUBLIC_URL` — real public origin, e.g. `http://10.x.x.x` and `http://10.x.x.x/api`

`.env` is gitignored. Never commit secrets.

### 2. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env up --build -d
```

### 3. Stop / restart (keeps Postgres data)

```bash
docker compose -f docker-compose.prod.yml --env-file .env stop
docker compose -f docker-compose.prod.yml --env-file .env start

docker compose -f docker-compose.prod.yml --env-file .env down
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

**Do not** run `docker compose down -v` on the VM — that deletes `foasis_postgres_data` and `foasis_uploads`.

### 4. Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f nginx
docker compose -f docker-compose.prod.yml --env-file .env logs -f backend
docker compose -f docker-compose.prod.yml --env-file .env logs -f frontend
docker compose -f docker-compose.prod.yml --env-file .env logs -f postgres
```

### 5. Prisma (production)

Startup already runs `npx prisma migrate deploy` (never `db push` / `migrate reset`).

Manual re-run:

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec backend npx prisma migrate deploy
```

### 6. Firewall

Open **80** (HTTP) and **443** (HTTPS, when certificates are installed).  
Do **not** open 3000, 3007, or 5432. Optional `.env` overrides: `NGINX_HTTP_PORT`, `NGINX_HTTPS_PORT`.

### 7. HTTPS later

See `deploy/nginx/ssl.conf.example`. Uncomment the certs volume in `docker-compose.prod.yml`, then rebuild/restart nginx. Update `FRONTEND_URL`, `CORS_ORIGIN`, and `PUBLIC_URL` to `https://...`.

---

## Required environment variables (production)

| Variable | Service | Notes |
|----------|---------|--------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | postgres | Not committed |
| `DATABASE_URL` | backend | Host `postgres`, port `5432` |
| `JWT_SECRET` | backend | Required, strong |
| `FRONTEND_URL` and/or `CORS_ORIGIN` | backend | Required in production |
| `PUBLIC_URL` | backend | Public API base, including `/api` |
| `EMAIL_PROVIDER` | backend | `resend` (not `log`) |
| `RESEND_API_KEY` | backend | Required when provider is resend |
| `EMAIL_FROM` | backend | Required |
| `NEXT_PUBLIC_API_URL` | frontend **build** | `/api` behind Nginx |
| `ALLOW_OPEN_REGISTRATION` | backend | Must stay `false` in production |

Optional: `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`, SMTP rollback vars, throttle/JWT timing vars. See `docker.prod.env.example`.

---

## Health and startup order

1. Postgres becomes healthy (`pg_isready`).
2. Backend waits, runs `prisma migrate deploy`, then `node dist/main.js`.
3. Backend `/health` must return 200 (database connected).
4. Frontend starts; Nginx starts last and proxies `/` and `/api`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Can't reach database server` | `DATABASE_URL` host must be `postgres` inside Compose |
| Backend exits on JWT/email | Fill `JWT_SECRET` and `RESEND_API_KEY`; do not use `EMAIL_PROVIDER=log` |
| Frontend calls wrong API | Rebuild frontend after changing `NEXT_PUBLIC_API_URL` |
| Upload 404 | `PUBLIC_URL` must be the public API base (`http://HOST/api`) |
| Socket.IO fails | Confirm `/socket.io` is proxied; page origin must match `FRONTEND_URL` for WS CORS |
| Port 80 in use | Stop IIS/other HTTP service on the VM |

**Do not use** `prisma db push` or `prisma migrate reset` in production.
