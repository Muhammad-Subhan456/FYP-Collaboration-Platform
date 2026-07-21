/**
 * Simulates frontend steps 10-14 with a mounted QueryObserver (like the React page).
 *
 *   npx tsx scripts/ga-trace-handler.ts
 */

import { QueryClient, QueryObserver } from "@tanstack/react-query";

import { handleGlobalAnnouncementPublished } from "../src/lib/realtime/global-announcement-cache";
import type { RealtimeEventEnvelope } from "../src/lib/realtime/types";

process.env.NEXT_PUBLIC_GA_TRACE = "true";

const STALE_TIME_MS = 5 * 60 * 1000;

function makeEnvelope(
  id: string,
  title: string,
): RealtimeEventEnvelope<{
  announcement: {
    id: string;
    workspaceId: string;
    title: string;
    message: string;
    audienceRoles: string[];
    attachmentCount: number;
    publishedAt: string;
  };
}> {
  return {
    event: "global_announcement.published",
    timestamp: new Date().toISOString(),
    scope: { type: "workspace", id: "00000000-0000-0000-0000-000000000001" },
    entity: { type: "GLOBAL_ANNOUNCEMENT", id },
    payload: {
      announcement: {
        id,
        workspaceId: "00000000-0000-0000-0000-000000000001",
        title,
        message: `msg-${title}`,
        audienceRoles: ["STUDENT", "SUPERVISOR", "EVALUATOR"],
        attachmentCount: 0,
        publishedAt: new Date().toISOString(),
      },
    },
  };
}

async function runPublish(
  queryClient: QueryClient,
  index: number,
  queryKey: readonly unknown[],
) {
  const id = `trace-id-${index}`;
  const title = `GA-HANDLER-${index}`;

  console.log(`\n========== HANDLER RUN #${index} ==========`);

  handleGlobalAnnouncementPublished(
    queryClient,
    "COORDINATOR",
    "00000000-0000-0000-0000-000000000001",
    "coord-user-id",
    makeEnvelope(id, title),
  );

  await new Promise((r) => setTimeout(r, 200));

  const data = queryClient.getQueryData<{ id: string }[]>(queryKey) ?? [];
  console.log(
    JSON.stringify({
      tag: "[GA-TRACE]",
      step: "14-snapshot-after-handler",
      publishIndex: index,
      queryKey,
      cacheLength: data.length,
      announcementIds: data.map((item) => item.id),
    }),
  );

  return { id, data };
}

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
    "coord-user-id",
    "00000000-0000-0000-0000-000000000001",
  ] as const;

  queryClient.setQueryDefaults(queryKey, {
    queryFn: async () => {
      console.log(
        JSON.stringify({
          tag: "[GA-TRACE]",
          step: "queryFn-refetch",
          ts: new Date().toISOString(),
          queryKey,
        }),
      );
      return queryClient.getQueryData(queryKey) ?? [];
    },
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
  });

  queryClient.setQueryData(queryKey, [
    {
      id: "seed-existing",
      coordinatorId: "",
      title: "Seed",
      message: "seed",
      audienceRoles: [],
      status: "PUBLISHED",
      attachments: [],
      createdAt: new Date().toISOString(),
    },
  ]);

  const observer = new QueryObserver(queryClient, { queryKey });
  observer.subscribe(() => undefined);

  const first = await runPublish(queryClient, 1, queryKey);
  const second = await runPublish(queryClient, 2, queryKey);

  console.log("\n========== HANDLER COMPARISON ==========");
  console.log("FIRST ids:", first.data.map((item) => item.id));
  console.log("SECOND ids:", second.data.map((item) => item.id));

  const secondHasFirst = second.data.some((item) => item.id === first.id);
  const secondHasSecond = second.data.some((item) => item.id === second.id);

  if (secondHasFirst && secondHasSecond) {
    console.log(">>> Both announcements present in cache after 2nd handler run.");
  } else {
    console.log(">>> DIVERGENCE in cache after 2nd handler run.");
    console.log(`>>> first still present: ${secondHasFirst}`);
    console.log(`>>> second present: ${secondHasSecond}`);
  }

  observer.destroy();
}

main().catch(console.error);
