/**
 * invalidate-only WITHOUT active QueryObserver (simulates page not mounted).
 */

import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 5 * 60 * 1000;
let apiCallCount = 0;

async function main() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, refetchOnMount: false },
    },
  });

  const queryKey = ["coordinator", "announcements", "u1", "ws1"] as const;

  queryClient.setQueryDefaults(queryKey, {
    queryFn: async () => {
      apiCallCount += 1;
      return [`api-item-${apiCallCount}`];
    },
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
  });

  await queryClient.fetchQuery({ queryKey });

  for (const index of [1, 2]) {
    await queryClient.invalidateQueries({
      queryKey: ["coordinator", "announcements"],
    });
    await new Promise((r) => setTimeout(r, 100));
    console.log(
      JSON.stringify({
        tag: "[GA-TRACE-OLD]",
        step: "14-no-observer",
        publishIndex: index,
        cacheLength: (queryClient.getQueryData<string[]>(queryKey) ?? []).length,
        ids: queryClient.getQueryData<string[]>(queryKey),
        apiCallCount,
      }),
    );
  }
}

main().catch(console.error);
