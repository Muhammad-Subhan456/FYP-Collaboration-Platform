/**
 * Phase 5 cutover helper: schema deploy → data copy → validation.
 *
 * Usage:
 *   npm run db:cutover
 *   npm run db:cutover -- --skip-migrate   (data only)
 *   npm run db:cutover -- --skip-data       (schema + validate only)
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

import { loadEnv } from './lib/load-env';

loadEnv();

const skipMigrate = process.argv.includes('--skip-migrate');
const skipData = process.argv.includes('--skip-data');
const root = resolve(__dirname, '..');

function run(command: string, label: string) {
  console.log(`\n=== ${label} ===\n`);
  execSync(command, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL must be set in apps/foasis-backend/.env',
    );
  }

  console.log('FOASIS Phase 5 database cutover');
  console.log(`Target: ${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}`);

  if (!skipMigrate) {
    run('npx prisma migrate deploy', 'Apply Prisma migrations');
  }

  if (!skipData) {
    run(
      'npx ts-node scripts/migrate-data-from-microservices.ts --truncate',
      'Copy microservice data (truncate target first)',
    );
  }

  run(
    'npx ts-node scripts/validate-data-migration.ts',
    'Validate row counts',
  );

  console.log('\nCutover scripts completed successfully.');
  console.log(
    'Next: start foasis-backend, run smoke tests, point frontend to :3000.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
