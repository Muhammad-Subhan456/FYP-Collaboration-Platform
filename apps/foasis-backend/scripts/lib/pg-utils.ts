import pg from 'pg';

const { Client } = pg;

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function connectClient(
  connectionString: string,
): Promise<pg.Client> {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

export async function countRows(
  client: pg.Client,
  table: string,
): Promise<number> {
  const quoted = quoteIdent(table);
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM ${quoted}`,
  );
  return result.rows[0]?.count ?? 0;
}

export async function truncateAllTables(
  client: pg.Client,
  tables: string[],
): Promise<void> {
  if (tables.length === 0) {
    return;
  }

  const list = tables.map(quoteIdent).join(', ');
  await client.query(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

export async function copyTable(
  source: pg.Client,
  target: pg.Client,
  table: string,
): Promise<number> {
  const quoted = quoteIdent(table);
  const { rows } = await source.query(
    `SELECT * FROM ${quoted}`,
  );

  if (rows.length === 0) {
    return 0;
  }

  const columns = Object.keys(rows[0]);
  const columnList = columns.map(quoteIdent).join(', ');
  const placeholders = columns
    .map((_, index) => `$${index + 1}`)
    .join(', ');

  let copied = 0;

  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    const result = await target.query(
      `INSERT INTO ${quoted} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values,
    );
    copied += result.rowCount ?? 0;
  }

  return copied;
}
