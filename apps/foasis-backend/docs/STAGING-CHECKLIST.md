# FOASIS — University staging / production checklist

Use this before exposing FOASIS to a real cohort. Complete each section in order.

## 1. Secrets & environment

- [ ] `JWT_SECRET` is unique, ≥ 32 characters (not the example value)
- [ ] `ALLOW_OPEN_REGISTRATION=false`
- [ ] `CORS_ORIGIN` and/or `FRONTEND_URL` set to the real HTTPS frontend origin(s)
- [ ] `PUBLIC_URL` points at the public API base (used in upload/email links)
- [ ] Frontend build has `NEXT_PUBLIC_API_URL` matching the API
- [ ] `DATABASE_URL` points at the staging/production Postgres (pooler if Supabase)
- [ ] SMTP vars configured; send a test invitation email
- [ ] Super-admin credentials rotated from defaults

## 2. Network & TLS

- [ ] Reverse proxy terminates HTTPS (nginx/Caddy/IIS)
- [ ] API and frontend only reachable over HTTPS
- [ ] WebSocket `/realtime` works through the proxy (upgrade headers)
- [ ] Health probe: `GET /health` returns 200 when DB is up, **503** when DB is down

## 3. Smoke tests

- [ ] Login / logout for Student, Supervisor, Coordinator, Evaluator, Super Admin
- [ ] Invitation accept + password set
- [ ] File upload appears via `/files/...`
- [ ] Work Stream comment appears for the other role without refresh
- [ ] Coordinator assigns evaluator; evaluator sees assignment live
- [ ] Evaluation submit updates student/coordinator results without refresh
- [ ] Auth rate limit: rapid login attempts return 429

## 4. Data & ops

- [ ] `prisma migrate deploy` applied
- [ ] Backup plan for Postgres + `UPLOAD_DIR` / volume
- [ ] Docker healthcheck uses `/health` (non-2xx fails the container)
- [ ] Optional: `PERF_LOG=true` briefly on staging to spot slow aggregators

## 5. Known follow-ups (not blockers)

- Coordinator users/teams/evaluations pages are still unbounded dumps — paginate when cohort size grows
- `/files` is publicly readable by URL — consider signed URLs if policy requires it
- Structured request logging (pino) if university IT requires audit trails beyond Nest logs
