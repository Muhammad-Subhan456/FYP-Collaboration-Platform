import type { GlobalAnnouncement } from "@/types/coordinator";

/** Timestamp used for newest-first ordering across list, cache, and UI. */
export function getGlobalAnnouncementSortTime(
  announcement: Pick<
    GlobalAnnouncement,
    "publishedAt" | "publishAt" | "createdAt"
  >,
): number {
  const raw =
    announcement.publishedAt ??
    announcement.publishAt ??
    announcement.createdAt;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function dedupeGlobalAnnouncementsById(
  items: GlobalAnnouncement[],
): GlobalAnnouncement[] {
  const seen = new Set<string>();
  const result: GlobalAnnouncement[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

export function sortGlobalAnnouncementsNewestFirst(
  items: GlobalAnnouncement[],
): GlobalAnnouncement[] {
  return dedupeGlobalAnnouncementsById(items).sort(
    (a, b) =>
      getGlobalAnnouncementSortTime(b) - getGlobalAnnouncementSortTime(a),
  );
}

export function getGlobalAnnouncementAttachmentCount(
  announcement: Pick<
    GlobalAnnouncement,
    "attachments" | "attachmentCount"
  >,
): number {
  if (announcement.attachments?.length) {
    return announcement.attachments.length;
  }

  return announcement.attachmentCount ?? 0;
}

export function hasGlobalAnnouncementAttachments(
  announcement: Pick<
    GlobalAnnouncement,
    "attachments" | "attachmentCount"
  >,
): boolean {
  return getGlobalAnnouncementAttachmentCount(announcement) > 0;
}
