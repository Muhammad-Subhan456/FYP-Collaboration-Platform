/**
 * Compare row counts between source microservice DBs and foasis_db.
 *
 * Usage:
 *   npm run db:validate-data
 *
 * Exits with code 1 when any configured source table count
 * does not match the target table count.
 */

import pg from 'pg';

import {
  TABLE_MIGRATIONS,
} from './lib/migration-config';
import { loadEnv } from './lib/load-env';
import {
  connectClient,
  countRows,
} from './lib/pg-utils';

loadEnv();

type RowResult = {
  table: string;
  sourceEnvKey: string;
  sourceCount: number | null;
  targetCount: number;
  ok: boolean;
};

async function main() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const target = await connectClient(targetUrl);
  const sourceClients = new Map<string, pg.Client>();
  const results: RowResult[] = [];

  try {
    for (const { table, sourceEnvKey } of TABLE_MIGRATIONS) {
      const targetCount = await countRows(target, table);
      const sourceUrl = process.env[sourceEnvKey];

      if (!sourceUrl) {
        results.push({
          table,
          sourceEnvKey,
          sourceCount: null,
          targetCount,
          ok: true,
        });
        continue;
      }

      let source = sourceClients.get(sourceUrl);
      if (!source) {
        source = await connectClient(sourceUrl);
        sourceClients.set(sourceUrl, source);
      }

      let sourceCount = 0;
      try {
        sourceCount = await countRows(source, table);
      } catch {
        sourceCount = 0;
      }

      const ok = sourceCount === targetCount;
      results.push({
        table,
        sourceEnvKey,
        sourceCount,
        targetCount,
        ok,
      });
    }
  } finally {
    await target.end();
    await Promise.all(
      [...sourceClients.values()].map((client) =>
        client.end(),
      ),
    );
  }

  console.log('\nRow count validation (source → foasis_db):\n');
  console.log(
    'Table'.padEnd(32) +
      'Source'.padStart(8) +
      'Target'.padStart(8) +
      '  Status',
  );
  console.log('-'.repeat(56));

  let failures = 0;
  let skipped = 0;

  for (const row of results) {
    if (row.sourceCount === null) {
      skipped += 1;
      console.log(
        `${row.table.padEnd(32)}${'—'.padStart(8)}${String(row.targetCount).padStart(8)}  skip (no source URL)`,
      );
      continue;
    }

    const status = row.ok ? 'OK' : 'MISMATCH';
    if (!row.ok) {
      failures += 1;
    }

    console.log(
      `${row.table.padEnd(32)}${String(row.sourceCount).padStart(8)}${String(row.targetCount).padStart(8)}  ${status}`,
    );
  }

  console.log('-'.repeat(56));
  console.log(
    `Checked: ${results.length - skipped}, Skipped: ${skipped}, Mismatches: ${failures}`,
  );

  if (failures > 0) {
    console.error(
      '\nValidation failed. Re-run `npm run db:migrate-data -- --truncate` after backup.',
    );
    process.exit(1);
  }

  console.log('\nAll configured tables match.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
