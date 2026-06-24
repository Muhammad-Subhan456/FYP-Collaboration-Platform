# FOASIS Frontend

Next.js web application for FOASIS (students, supervisors, coordinators).

## Prerequisites

- Node.js 20+
- `foasis-backend` running on **http://localhost:3000**

## Setup

```bash
cd apps/frontend
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3007**.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | FOASIS backend (modular monolith) |

API client: `src/lib/axios.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port **3007** |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

## Architecture note

The frontend talks only to `foasis-backend`. Legacy microservices and `api-gateway` are not used — see [apps/LEGACY.md](../LEGACY.md).
