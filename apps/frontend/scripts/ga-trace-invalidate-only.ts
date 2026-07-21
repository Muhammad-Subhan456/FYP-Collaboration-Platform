/**
 * Reproduces OLD handler behavior: invalidateQueries ONLY (no setQueryData).
 * Shows divergence at step 14 when refetchOnMount:false.
 *
 *   npx tsx scripts/ga-trace-invalidate-only.ts
 */

import { QueryClient, QueryObserver } from "@tanstack/react-query";

const STALE_TIME_MS = 5 * 60 * 1000;
let apiCallCount = 0;

async function main() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        refetchOnMount: false,
      },
    },
  });

  const queryKey = [
    "coordinator",
    "announcements",
    "u1",
    "ws1",
  ] as const;

  queryClient.setQueryDefaults(queryKey, {
    queryFn: async () => {
      apiCallCount += 1;
      console.log(
        JSON.stringify({
          tag: "[GA-TRACE-OLD]",
          step: "queryFn-refetch",
          apiCallCount,
          ts: new Date().toISOString(),
        }),
      );
      return [`api-item-${apiCallCount}`];
    },
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
  });

  await queryClient.fetchQuery({ queryKey });
  console.log(
    JSON.stringify({
      tag: "[GA-TRACE-OLD]",
      step: "14-after-initial-fetch",
      cacheLength: 1,
      ids: queryClient.getQueryData<string[]>(queryKey),
    }),
  );

  const observer = new QueryObserver(queryClient, { queryKey });
  observer.subscribe(() => undefined);

  for (const index of [1, 2]) {
    console.log(`\n--- invalidate-only publish #${index} ---`);
    await queryClient.invalidateQueries({
      queryKey: ["coordinator", "announcements"],
    });
    await new Promise((r) => setTimeout(r, 100));
    const data = queryClient.getQueryData<string[]>(queryKey) ?? [];
    console.log(
      JSON.stringify({
        tag: "[GA-TRACE-OLD]",
        step: "14-after-invalidate",
        publishIndex: index,
        cacheLength: data.length,
        announcementIds: data,
        apiCallCount,
      }),
    );
  }

  observer.destroy();
}

main().catch(console.error);
