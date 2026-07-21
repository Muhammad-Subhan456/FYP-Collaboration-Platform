/**
 * Full pipeline trace against a RUNNING backend (port 3000).
 * Signs a coordinator JWT from DB membership — no password required.
 *
 *   GA_TRACE=true npm run start:dev
 *   GA_TRACE=true npm run ga-trace-e2e
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { io, type Socket } from 'socket.io-client';

import { loadEnv } from './lib/load-env';

loadEnv();
process.env.GA_TRACE = 'true';

const baseUrl = process.env.GA_TRACE_BASE_URL ?? 'http://localhost:3000';
const jwtSecret = process.env.JWT_SECRET;

type TraceEvent = Record<string, unknown>;

const backendTraceLines: TraceEvent[] = [];
const socketEvents: TraceEvent[] = [];

function capture(line: TraceEvent) {
  console.log(JSON.stringify(line));
}

async function request(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function getCoordinatorToken(): Promise<{
  token: string;
  userId: string;
  workspaceId: string;
}> {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET missing from .env');
  }

  const prisma = new PrismaClient();
  const membership = await prisma.workspaceMembership.findFirst({
    where: { role: UserRole.COORDINATOR, isActive: true },
    include: { user: { select: { id: true, email: true, isActive: true } } },
  });
  await prisma.$disconnect();

  if (!membership?.user?.isActive) {
    throw new Error('No active coordinator membership in database');
  }

  const token = jwt.sign(
    {
      sub: membership.user.id,
      email: membership.user.email,
      role: UserRole.COORDINATOR,
      workspaceId: membership.workspaceId,
    },
    jwtSecret,
    { expiresIn: '1h' },
  );

  return {
    token,
    userId: membership.user.id,
    workspaceId: membership.workspaceId,
  };
}

function connectSocket(token: string): Promise<Socket> {
  return new Promise((resolveSocket, reject) => {
    const socket = io(`${baseUrl}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20_000,
    });

    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 20_000);

    socket.on('connect', () => {
      capture({
        tag: '[GA-TRACE]',
        step: '5-socket-connected',
        ts: new Date().toISOString(),
        socketId: socket.id,
      });
    });

    socket.on('realtime.connected', (payload: { userId: string; rooms: string[] }) => {
      capture({
        tag: '[GA-TRACE]',
        step: '7-room-join',
        ts: new Date().toISOString(),
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
      const line = {
        tag: '[GA-TRACE]',
        step: '9-event-received',
        ts: new Date().toISOString(),
        socketId: socket.id,
        announcementId: envelope?.payload?.announcement?.id,
        title: envelope?.payload?.announcement?.title,
      };
      socketEvents.push(line);
      capture(line);
    });
  });
}

async function publishAnnouncement(token: string, index: number) {
  const title = `GA-E2E-${index}-${Date.now()}`;
  capture({
    tag: '[GA-TRACE]',
    step: 'POST-before',
    ts: new Date().toISOString(),
    publishIndex: index,
    title,
  });

  const { status, body } = await request('/global-announcements', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      message: `E2E trace ${index}`,
      audienceRoles: ['STUDENT', 'SUPERVISOR', 'EVALUATOR'],
    }),
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`Publish ${index} failed (${status}): ${JSON.stringify(body)}`);
  }

  const announcement = body as { id: string; title: string };
  capture({
    tag: '[GA-TRACE]',
    step: 'POST-after',
    ts: new Date().toISOString(),
    publishIndex: index,
    announcementId: announcement.id,
    title: announcement.title,
  });

  return announcement;
}

async function main() {
  const health = await request('/health');
  if (health.status !== 200) {
    throw new Error(`Backend not running at ${baseUrl}`);
  }

  const auth = await getCoordinatorToken();
  capture({
    tag: '[GA-TRACE]',
    step: 'auth-jwt-signed',
    ts: new Date().toISOString(),
    userId: auth.userId,
    workspaceId: auth.workspaceId,
    role: 'COORDINATOR',
  });

  const socket = await connectSocket(auth.token);
  capture({
    tag: '[GA-TRACE]',
    step: '6-socket-id',
    ts: new Date().toISOString(),
    socketId: socket.id,
  });

  await new Promise((r) => setTimeout(r, 500));

  const first = await publishAnnouncement(auth.token, 1);
  await new Promise((r) => setTimeout(r, 2500));

  const second = await publishAnnouncement(auth.token, 2);
  await new Promise((r) => setTimeout(r, 2500));

  const firstSocket = socketEvents.filter(
    (event) => event.announcementId === first.id,
  );
  const secondSocket = socketEvents.filter(
    (event) => event.announcementId === second.id,
  );

  console.log('\n========== E2E COMPARISON ==========');
  console.log('\n--- FIRST announcement ---');
  console.log('id:', first.id);
  console.log('socket step-9 count:', firstSocket.length);
  console.log(JSON.stringify(firstSocket, null, 2));

  console.log('\n--- SECOND announcement ---');
  console.log('id:', second.id);
  console.log('socket step-9 count:', secondSocket.length);
  console.log(JSON.stringify(secondSocket, null, 2));

  console.log(
    '\n>>> Backend steps 1-4: grep backend terminal for announcementId',
  );
  console.log(`>>> FIRST:  ${first.id}`);
  console.log(`>>> SECOND: ${second.id}`);

  if (firstSocket.length > 0 && secondSocket.length === 0) {
    console.log(
      '\n>>> DIVERGENCE: Socket received 1st but NOT 2nd. Check backend [GA-TRACE] 3-pre-emit for 2nd id.',
    );
  } else if (firstSocket.length > 0 && secondSocket.length > 0) {
    console.log(
      '\n>>> Socket delivery identical for both. Run ga-browser-trace for frontend steps 10-14.',
    );
  }

  socket.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
