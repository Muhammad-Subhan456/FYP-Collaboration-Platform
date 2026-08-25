# FOASIS frontend — production image (Next.js standalone)
# NEXT_PUBLIC_* values are inlined at build time.
FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_WS_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
  NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
  PORT=3007 \
  HOSTNAME=0.0.0.0 \
  NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system foasis \
  && useradd --system --gid foasis --create-home foasis

COPY --from=builder /app/public ./public
COPY --from=builder --chown=foasis:foasis /app/.next/standalone ./
COPY --from=builder --chown=foasis:foasis /app/.next/static ./.next/static

USER foasis

EXPOSE 3007

CMD ["node", "server.js"]
