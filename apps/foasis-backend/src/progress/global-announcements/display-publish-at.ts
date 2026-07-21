import { BadRequestException } from '@nestjs/common';

/**
 * Parse optional display-only publish date/time from the client.
 * This value is persisted for UI display and must not affect delivery.
 */
export function parseDisplayPublishAt(
  value?: string | null,
): Date | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid publish date');
  }

  return parsed;
}
