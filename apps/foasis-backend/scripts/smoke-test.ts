/**
 * Basic HTTP smoke tests against a running foasis-backend instance.
 *
 * Usage:
 *   npm run start:dev   (separate terminal)
 *   npm run smoke-test
 *
 * Optional env:
 *   SMOKE_BASE_URL=http://localhost:3000
 *   SMOKE_TEST_EMAIL=student@example.com
 *   SMOKE_TEST_PASSWORD=password
 */

import { loadEnv } from './lib/load-env';

loadEnv();

const baseUrl =
  process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

async function request(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

async function main() {
  const results: CheckResult[] = [];

  try {
    const health = await request('/health');
    const healthBody = await health.json().catch(() => ({}));
    results.push({
      name: 'GET /health',
      ok: health.ok,
      detail: health.ok
        ? JSON.stringify(healthBody)
        : `status ${health.status}`,
    });
  } catch (error: any) {
    results.push({
      name: 'GET /health',
      ok: false,
      detail: error.message,
    });
  }

  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;

  if (email && password) {
    try {
      const login = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await login.json().catch(() => ({}));
      const token = body?.access_token ?? body?.accessToken;

      results.push({
        name: 'POST /auth/login',
        ok: login.ok && !!token,
        detail: login.ok
          ? token
            ? 'token received'
            : `no token in response — ${JSON.stringify(body)}`
          : `status ${login.status} — ${JSON.stringify(body)}`,
      });

      if (token) {
        const dashboard = await request('/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        results.push({
          name: 'GET /dashboard',
          ok: dashboard.ok,
          detail: `status ${dashboard.status}`,
        });
      }
    } catch (error: any) {
      results.push({
        name: 'POST /auth/login',
        ok: false,
        detail: error.message,
      });
    }
  } else {
    results.push({
      name: 'POST /auth/login',
      ok: true,
      detail: 'skipped (set SMOKE_TEST_EMAIL/PASSWORD to enable)',
    });
  }

  console.log(`\nSmoke tests → ${baseUrl}\n`);
  let failed = 0;
  for (const result of results) {
    const mark = result.ok ? 'PASS' : 'FAIL';
    if (!result.ok) {
      failed += 1;
    }
    console.log(
      `[${mark}] ${result.name}${result.detail ? ` — ${result.detail}` : ''}`,
    );
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
