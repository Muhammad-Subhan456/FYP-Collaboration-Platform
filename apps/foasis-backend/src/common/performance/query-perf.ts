import { AsyncLocalStorage } from 'node:async_hooks';

export type QueryPerfEntry = {
  model: string;
  operation: string;
  durationMs: number;
  query: string;
};

export type QueryPerfSnapshot = {
  queries: QueryPerfEntry[];
  totalDbMs: number;
  queryCount: number;
};

const storage = new AsyncLocalStorage<QueryPerfEntry[]>();

let globalQueryLog: QueryPerfEntry[] | null = null;

export function beginGlobalQueryCapture() {
  globalQueryLog = [];
}

export function endGlobalQueryCapture(): QueryPerfSnapshot {
  const queries = globalQueryLog ?? [];
  globalQueryLog = null;
  const totalDbMs = queries.reduce(
    (sum, entry) => sum + entry.durationMs,
    0,
  );

  return {
    queries: [...queries],
    totalDbMs,
    queryCount: queries.length,
  };
}

export function runWithQueryPerf<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; perf: QueryPerfSnapshot }> {
  const queries: QueryPerfEntry[] = [];
  beginGlobalQueryCapture();

  return storage.run(queries, async () => {
    const result = await fn();
    const perf = endGlobalQueryCapture();
    const totalDbMs = perf.totalDbMs || queries.reduce(
      (sum, entry) => sum + entry.durationMs,
      0,
    );

    return {
      result,
      perf: {
        queries: perf.queries.length ? perf.queries : [...queries],
        totalDbMs,
        queryCount: perf.queryCount || queries.length,
      },
    };
  });
}

export function recordQuery(entry: QueryPerfEntry) {
  if (globalQueryLog) {
    globalQueryLog.push(entry);
  }

  const queries = storage.getStore();
  if (queries) {
    queries.push(entry);
  }
}

export function getCurrentQueryPerf(): QueryPerfSnapshot | null {
  const queries = storage.getStore();
  if (!queries) {
    return null;
  }

  const totalDbMs = queries.reduce(
    (sum, entry) => sum + entry.durationMs,
    0,
  );

  return {
    queries: [...queries],
    totalDbMs,
    queryCount: queries.length,
  };
}
