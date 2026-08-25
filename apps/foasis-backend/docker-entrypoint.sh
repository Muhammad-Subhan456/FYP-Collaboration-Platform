#!/bin/sh
set -e

echo "Waiting for PostgreSQL and applying Prisma migrations (migrate deploy)..."

TRIES=0
MAX_TRIES=24

until npx prisma migrate deploy; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "Prisma migrate deploy failed after ${MAX_TRIES} attempts."
    echo "Check DATABASE_URL (use the Docker service hostname, not localhost) and that postgres is healthy."
    exit 1
  fi
  echo "Database not reachable (attempt ${TRIES}/${MAX_TRIES}). Retrying in 5s..."
  sleep 5
done

echo "Starting FOASIS backend..."

if [ -f dist/main.js ]; then
  exec node dist/main.js
elif [ -f dist/src/main.js ]; then
  exec node dist/src/main.js
else
  echo "ERROR: NestJS entry file not found (expected dist/main.js)."
  find dist -name 'main.js' 2>/dev/null || ls -laR dist 2>/dev/null || echo "(dist/ missing)"
  exit 1
fi
