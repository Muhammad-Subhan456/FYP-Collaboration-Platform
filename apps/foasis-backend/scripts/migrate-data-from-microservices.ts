/**
 * Copy data from six microservice PostgreSQL databases into foasis_db.
 *
 * Usage:
 *   npm run db:migrate-data
 *   npm run db:migrate-data -- --truncate
 *
 * Prerequisites:
 *   1. npx prisma migrate deploy (schema on foasis_db)
 *   2. Set DATABASE_URL + *_SOURCE_DATABASE_URL in .env
 *   3. Back up all databases before running with --truncate
 */

import pg from 'pg';

import {
  SOURCE_ENV_KEYS,
  TABLE_MIGRATIONS,
  ALL_TABLES,
} from './lib/migration-config';
import { loadEnv } from './lib/load-env';
import {
  connectClient,
  copyTable,
  truncateAllTables,
} from './lib/pg-utils';

loadEnv();

const truncate = process.argv.includes('--truncate');

async function main() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) {
    throw new Error('DATABASE_URL is required (foasis_db).');
  }

  const sourceClients = new Map<string, pg.Client>();
  const target = await connectClient(targetUrl);

  try {
    if (truncate) {
      console.log(
        'Truncating all tables in foasis_db (RESTART IDENTITY CASCADE)...',
      );
      await truncateAllTables(target, ALL_TABLES);
    }

    const summary: Record<string, number> = {};

    for (const { table, sourceEnvKey } of TABLE_MIGRATIONS) {
      const sourceUrl = process.env[sourceEnvKey];
      if (!sourceUrl) {
        console.warn(
          `Skipping ${table}: ${sourceEnvKey} is not set.`,
        );
        continue;
      }

      let source = sourceClients.get(sourceUrl);
      if (!source) {
        source = await connectClient(sourceUrl);
        sourceClients.set(sourceUrl, source);
        console.log(`\nConnected source: ${sourceEnvKey}`);
      }

      const copied = await copyTable(source, target, table);
      summary[table] = copied;
      console.log(`  ${table}: ${copied} rows inserted`);
    }

    console.log('\nMigration summary:');
    for (const [table, count] of Object.entries(summary)) {
      console.log(`  ${table}: ${count}`);
    }

    const missingSources = Object.values(SOURCE_ENV_KEYS).filter(
      (key) => !process.env[key],
    );
    if (missingSources.length > 0) {
      console.warn(
        '\nWarning: some source URLs were not set:',
        missingSources.join(', '),
      );
    }

    console.log(
      '\nDone. Run `npm run db:validate-data` to compare row counts.',
    );
  } finally {
    await target.end();
    await Promise.all(
      [...sourceClients.values()].map((client) =>
        client.end(),
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
