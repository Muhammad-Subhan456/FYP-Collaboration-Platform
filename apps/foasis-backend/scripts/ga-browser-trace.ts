/**
 * Browser-side GA trace: captures frontend console [GA-TRACE] logs while
 * publishing two announcements via the API (coordinator JWT from DB).
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   NEXT_PUBLIC_GA_TRACE=true npm run dev
 *
 *   GA_TRACE=true npm run ga-browser-trace
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

import { loadEnv } from './lib/load-env';

loadEnv();

const baseUrl = process.env.GA_TRACE_BASE_URL ?? 'http://localhost:3000';
const frontendUrl =
  process.env.GA_TRACE_FRONTEND_URL ?? 'http://localhost:3007';
const jwtSecret = process.env.JWT_SECRET;

type ConsoleLine = {
  text: string;
  ts: number;
};

async function getCoordinatorToken(): Promise<string> {
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
    throw new Error('No active coordinator membership');
  }

  return jwt.sign(
    {
      sub: membership.user.id,
      email: membership.user.email,
      role: UserRole.COORDINATOR,
      workspaceId: membership.workspaceId,
    },
    jwtSecret,
    { expiresIn: '1h' },
  );
}

async function createAnnouncement(token: string, index: number) {
  const title = `GA-BROWSER-${index}-${Date.now()}`;
  const response = await fetch(`${baseUrl}/global-announcements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      message: `Browser trace ${index}`,
      audienceRoles: ['STUDENT', 'SUPERVISOR', 'EVALUATOR'],
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Create failed: ${JSON.stringify(body)}`);
  }
  return { id: body.id as string, title };
}

function filterTrace(lines: ConsoleLine[], announcementId: string) {
  return lines.filter((line) => line.text.includes(announcementId));
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { chromium } = require('playwright');

  const token = await getCoordinatorToken();
  const consoleLines: ConsoleLine[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[GA-TRACE]')) {
      consoleLines.push({ text, ts: Date.now() });
      console.log(`[browser-console] ${text}`);
    }
  });

  await page.goto(`${frontendUrl}/auth/login`);
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    ['fyp_access_token', token],
  );

  await page.goto(`${frontendUrl}/coordinator/announcements`);
  await page.waitForTimeout(3000);

  const first = await createAnnouncement(token, 1);
  await page.waitForTimeout(3000);

  const second = await createAnnouncement(token, 2);
  await page.waitForTimeout(3000);

  console.log('\n========== BROWSER TRACE: FIRST ==========');
  for (const line of filterTrace(consoleLines, first.id)) {
    console.log(line.text);
  }

  console.log('\n========== BROWSER TRACE: SECOND ==========');
  for (const line of filterTrace(consoleLines, second.id)) {
    console.log(line.text);
  }

  const firstReceived = filterTrace(consoleLines, first.id).some((line) =>
    line.text.includes('9-event-received'),
  );
  const secondReceived = filterTrace(consoleLines, second.id).some((line) =>
    line.text.includes('9-event-received'),
  );

  console.log('\n========== BROWSER DIVERGENCE ==========');
  console.log(`First WS received in browser: ${firstReceived}`);
  console.log(`Second WS received in browser: ${secondReceived}`);

  if (firstReceived && !secondReceived) {
    console.log(
      '>>> FIRST divergence in browser at step 9 — socket listener did not fire for 2nd event.',
    );
  } else if (secondReceived) {
    const firstRender = filterTrace(consoleLines, first.id).filter((line) =>
      line.text.includes('14-component-render'),
    );
    const secondRender = filterTrace(consoleLines, second.id).filter((line) =>
      line.text.includes('14-component-render'),
    );
    console.log(`First render logs mentioning id: ${firstRender.length}`);
    console.log(`Second render logs mentioning id: ${secondRender.length}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
