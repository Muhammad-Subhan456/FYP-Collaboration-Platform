import { existsSync } from 'fs';
import { resolve } from 'path';

import { config } from 'dotenv';

export function loadEnv(): void {
  const envPath = resolve(__dirname, '../../.env');
  if (existsSync(envPath)) {
    config({ path: envPath });
  }

  if (
    process.argv.some((arg) =>
      arg.includes('benchmark-endpoints'),
    )
  ) {
    process.env.PERF_LOG = 'true';
  }
}
