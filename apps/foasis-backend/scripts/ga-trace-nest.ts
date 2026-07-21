/**
 * Backend + socket trace using the real NestJS service (coordinator JWT from DB).
 * Produces [GA-TRACE] logs for announcement #1 and #2 without HTTP login credentials.
 *
 * Run with backend stopped OR running on another port — this script bootstraps its own app.
 *
 *   GA_TRACE=true npx ts-node scripts/ga-trace-nest.ts
 */

import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { io, type Socket } from 'socket.io-client';

import { AppModule } from '../src/app.module';
import { gaTrace } from '../src/common/trace/ga-trace';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalAnnouncementsService } from '../src/progress/global-announcements/global-announcements.service';

import { loadEnv } from './lib/load-env';

loadEnv();
process.env.GA_TRACE = 'true';

const baseUrl = process.env.GA_TRACE_BASE_URL ?? 'http://localhost:3000';

type SocketEvent = {
  step: string;
  ts: string;
  announcementId?: string;
  title?: string;
};

async function connectCoordinatorSocket(token: string): Promise<{
  socket: Socket;
  events: SocketEvent[];
}> {
  const events: SocketEvent[] = [];

  return new Promise((resolveSocket, reject) => {
    const socket = io(`${baseUrl}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20_000,
    });

    const timeout = setTimeout(() => {
      reject(new Error('Socket connect timeout'));
    }, 20_000);

    socket.on('connect', () => {
      console.log(
        JSON.stringify({
          tag: '[GA-TRACE]',
          step: '5-socket-connected',
          ts: new Date().toISOString(),
          socketId: socket.id,
        }),
      );
    });

    socket.on('realtime.connected', (payload: { rooms: string[] }) => {
      console.log(
        JSON.stringify({
          tag: '[GA-TRACE]',
          step: '7-room-join-client',
          ts: new Date().toISOString(),
          socketId: socket.id,
          rooms: payload.rooms,
        }),
      );
      clearTimeout(timeout);
      resolveSocket({ socket, events });
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.on('global_announcement.published', (envelope) => {
      const line: SocketEvent = {
        step: '9-event-received',
        ts: new Date().toISOString(),
        announcementId: envelope?.payload?.announcement?.id,
        title: envelope?.payload?.announcement?.title,
      };
      events.push(line);
      console.log(JSON.stringify({ tag: '[GA-TRACE]', ...line }));
    });
  });
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);
  const announcementsService = app.get(GlobalAnnouncementsService);

  const membership = await prisma.workspaceMembership.findFirst({
    where: {
      role: UserRole.COORDINATOR,
      isActive: true,
    },
    include: {
      user: { select: { id: true, email: true, isActive: true } },
    },
  });

  if (!membership?.user?.isActive) {
    throw new Error('No active coordinator membership found in database');
  }

  const token = await jwtService.signAsync({
    sub: membership.user.id,
    email: membership.user.email,
    role: UserRole.COORDINATOR,
    workspaceId: membership.workspaceId,
  });

  gaTrace('nest-bootstrap', {
    coordinatorUserId: membership.user.id,
    workspaceId: membership.workspaceId,
  });

  const { socket, events } = await connectCoordinatorSocket(token);
  console.log(
    JSON.stringify({
      tag: '[GA-TRACE]',
      step: '6-socket-id',
      ts: new Date().toISOString(),
      socketId: socket.id,
    }),
  );

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));

  const first = await announcementsService.createAnnouncement(
    membership.user.id,
    {
      title: `GA-NEST-1-${Date.now()}`,
      message: 'Nest trace announcement 1',
      audienceRoles: ['STUDENT', 'SUPERVISOR', 'EVALUATOR'],
    },
    membership.workspaceId,
  );

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));

  const second = await announcementsService.createAnnouncement(
    membership.user.id,
    {
      title: `GA-NEST-2-${Date.now()}`,
      message: 'Nest trace announcement 2',
      audienceRoles: ['STUDENT', 'SUPERVISOR', 'EVALUATOR'],
    },
    membership.workspaceId,
  );

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));

  const firstEvents = events.filter((event) => event.announcementId === first.id);
  const secondEvents = events.filter(
    (event) => event.announcementId === second.id,
  );

  console.log('\n========== NEST TRACE SUMMARY ==========');
  console.log('FIRST id:', first.id);
  console.log('FIRST socket events:', JSON.stringify(firstEvents));
  console.log('SECOND id:', second.id);
  console.log('SECOND socket events:', JSON.stringify(secondEvents));

  if (firstEvents.length > 0 && secondEvents.length === 0) {
    console.log(
      '\n>>> DIVERGENCE at socket delivery: 2nd announcement emit/receive failed.',
    );
    console.log('>>> Inspect backend [GA-TRACE] steps 1-4 for second id above.');
  } else if (firstEvents.length > 0 && secondEvents.length > 0) {
    console.log('\n>>> Backend + socket OK for both announcements.');
  }

  socket.disconnect();
  await app.close();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
