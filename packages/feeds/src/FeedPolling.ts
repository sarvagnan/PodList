export const pollIntervalMillis = 30 * 60_000
const dayMillis = 24 * 60 * 60_000

export const backoffMillis = (failures: number) =>
  failures <= 0 ? 0 : Math.min(pollIntervalMillis * 2 ** (failures - 1), dayMillis)

export interface FeedValidators {
  readonly etag: string | null
  readonly lastModified: string | null
}

export function conditionalFeedHeaders(validators?: FeedValidators): Record<string, string> {
  const headers: Record<string, string> = {}
  if (validators?.etag) headers["if-none-match"] = validators.etag
  if (validators?.lastModified) headers["if-modified-since"] = validators.lastModified
  return headers
}

export function feedPollDecision({
  checkedAt,
  failures,
  now,
  automatic = true,
  successInterval = pollIntervalMillis
}: {
  readonly checkedAt: number | null
  readonly failures: number
  readonly now: number
  readonly automatic?: boolean
  /** Standalone can wake at any time. The server already spaces its scheduled sweeps. */
  readonly successInterval?: number
}) {
  const nextCheckAt =
    checkedAt === null ? null : checkedAt + Math.max(successInterval, backoffMillis(failures))
  return { due: !automatic || nextCheckAt === null || now >= nextCheckAt, nextCheckAt }
}
