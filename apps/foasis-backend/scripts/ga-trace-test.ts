/**
 * End-to-end trace test for Global Announcements (1st vs 2nd publish).
 *
 * Prerequisites:
 *   GA_TRACE=true npm run start:dev   (backend terminal)
 *   NEXT_PUBLIC_GA_TRACE=true npm run dev   (frontend terminal)
 *
 * Usage:
 *   GA_TRACE_EMAIL=coordinator@... GA_TRACE_PASSWORD=... npm run ga-trace-test
 *
 * Optional:
 *   GA_TRACE_BASE_URL=http://localhost:3000
 *   GA_TRACE_FRONTEND_URL=http://localhost:3007
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

import { io, type Socket } from 'socket.io-client';

import { loadEnv } from './lib/load-env';

loadEnv();

process.env.GA_TRACE = 'true';

const baseUrl = process.env.GA_TRACE_BASE_URL ?? 'http://localhost:3000';
const frontendUrl =
  process.env.GA_TRACE_FRONTEND_URL ?? 'http://localhost:3007';
const email =
  process.env.GA_TRACE_EMAIL ?? process.env.SMOKE_TEST_EMAIL ?? '';
const password =
  process.env.GA_TRACE_PASSWORD ?? process.env.SMOKE_TEST_PASSWORD ?? '';

type TraceLine = {
  source: 'backend-script' | 'socket-client';
  step: string;
  ts: string;
  publishIndex?: number;
  payload: Record<string, unknown>;
};

const traceLog: TraceLine[] = [];

function scriptTrace(
  step: string,
  payload: Record<string, unknown> = {},
  publishIndex?: number,
) {
  const line: TraceLine = {
    source: 'backend-script',
    step,
    ts: new Date().toISOString(),
    publishIndex,
    payload,
  };
  traceLog.push(line);
  console.log(JSON.stringify({ tag: '[GA-TRACE]', ...line }));
}

async function request(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function login(): Promise<{
  token: string;
  userId: string;
  workspaceId: string;
  role: string;
}> {
  const { status, body } = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (status !== 200 && status !== 201) {
    throw new Error(
      `Login failed (${status}): ${JSON.stringify(body)}`,
    );
  }

  const token =
    (body as { accessToken?: string; access_token?: string }).accessToken ??
    (body as { access_token?: string }).access_token;

  if (!token) {
    throw new Error(`No token in login response: ${JSON.stringify(body)}`);
  }

  const payload = JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
  ) as {
    sub: string;
    role: string;
    workspaceId?: string;
  };

  return {
    token,
    userId: payload.sub,
    workspaceId: payload.workspaceId ?? '',
    role: payload.role,
  };
}

function connectSocket(
  token: string,
  publishEvents: TraceLine[],
): Promise<Socket> {
  return new Promise((resolveSocket, reject) => {
    const socket = io(`${baseUrl}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20_000,
    });

    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timed out after 20s'));
    }, 20_000);

    socket.on('connect', () => {
      scriptTrace('5-socket-connected', { socketId: socket.id });
    });

    socket.on('realtime.connected', (payload: { userId: string; rooms: string[] }) => {
      scriptTrace('7-room-join', {
        socketId: socket.id,
        rooms: payload.rooms,
        userId: payload.userId,
      });
      clearTimeout(timeout);
      resolveSocket(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.on('global_announcement.published', (envelope) => {
      const line: TraceLine = {
        source: 'socket-client',
        step: '9-event-received',
        ts: new Date().toISOString(),
        payload: {
          socketId: socket.id,
          announcementId: envelope?.payload?.announcement?.id,
          title: envelope?.payload?.announcement?.title,
          envelopeTimestamp: envelope?.timestamp,
        },
      };
      publishEvents.push(line);
      console.log(JSON.stringify({ tag: '[GA-TRACE]', ...line }));
    });
  });
}

async function createAnnouncement(
  token: string,
  index: number,
): Promise<{ id: string; title: string }> {
  const title = `GA-TRACE-${index}-${Date.now()}`;
  const message = `Trace test announcement ${index}`;

  scriptTrace('POST-global-announcements', { title, index }, index);

  const { status, body } = await request('/global-announcements', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      message,
      audienceRoles: ['STUDENT', 'SUPERVISOR', 'EVALUATOR'],
    }),
  });

  if (status !== 201 && status !== 200) {
    throw new Error(
      `Create announcement ${index} failed (${status}): ${JSON.stringify(body)}`,
    );
  }

  const announcement = body as { id: string; title: string };
  scriptTrace('POST-response', { announcementId: announcement.id, title }, index);
  return announcement;
}

function printComparison(
  socketEvents: TraceLine[],
  firstId: string,
  secondId: string,
) {
  console.log('\n========== GA-TRACE COMPARISON ==========\n');

  const firstSocket = socketEvents.filter(
    (event) => event.payload.announcementId === firstId,
  );
  const secondSocket = socketEvents.filter(
    (event) => event.payload.announcementId === secondId,
  );

  console.log('FIRST announcement socket events:', firstSocket.length);
  for (const event of firstSocket) {
    console.log(JSON.stringify(event));
  }

  console.log('\nSECOND announcement socket events:', secondSocket.length);
  for (const event of secondSocket) {
    console.log(JSON.stringify(event));
  }

  if (firstSocket.length > 0 && secondSocket.length === 0) {
    console.log(
      '\n>>> DIVERGENCE: Socket client received 1st event but NOT 2nd.',
    );
    console.log(
      '>>> Check backend terminal for [GA-TRACE] steps 1-4 on 2nd publish.',
    );
  } else if (firstSocket.length === 0) {
    console.log('\n>>> DIVERGENCE: Socket client received NEITHER event.');
  } else if (secondSocket.length > 0) {
    console.log(
      '\n>>> Backend + socket delivery OK for both. Compare frontend browser console for steps 10-14.',
    );
    console.log(`>>> Open ${frontendUrl}/coordinator/announcements with NEXT_PUBLIC_GA_TRACE=true`);
  }

  console.log('\n=========================================\n');
}

async function main() {
  if (!email || !password) {
    console.error(
      'Set GA_TRACE_EMAIL and GA_TRACE_PASSWORD (or SMOKE_TEST_EMAIL/PASSWORD)',
    );
    process.exit(1);
  }

  scriptTrace('health-check', { baseUrl });
  const health = await request('/health');
  if (health.status !== 200) {
    throw new Error(`Backend not healthy at ${baseUrl}`);
  }

  const auth = await login();
  scriptTrace('login-ok', {
    userId: auth.userId,
    role: auth.role,
    workspaceId: auth.workspaceId,
  });

  const socketEvents: TraceLine[] = [];
  const socket = await connectSocket(auth.token, socketEvents);
  scriptTrace('6-socket-id', { socketId: socket.id });

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));

  const first = await createAnnouncement(auth.token, 1);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));

  const second = await createAnnouncement(auth.token, 2);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));

  printComparison(socketEvents, first.id, second.id);

  socket.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
