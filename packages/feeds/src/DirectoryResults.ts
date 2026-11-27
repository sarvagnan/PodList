export interface AppleDirectoryResult {
  readonly title: string
  readonly author: string | null
  readonly feedUrl: string
  readonly artworkUrl: string | null
  readonly source: "itunes"
}

interface AppleDirectoryRow {
  readonly collectionName?: string
  readonly artistName?: string
  readonly feedUrl?: string
  readonly artworkUrl600?: string
  readonly artworkUrl100?: string
}

const playableFeed = (address: string) => {
  try {
    const url = new URL(address)
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
  } catch {
    return false
  }
}

/** Standalone filters unusable and duplicate addresses before asking publishers for feeds. */
export function normalizeAppleDirectoryResults(
  rows: ReadonlyArray<unknown>,
  policy: "standalone" | "server" = "standalone"
): ReadonlyArray<AppleDirectoryResult> {
  const standalone = policy === "standalone"
  const seen = new Set<string>()
  const text = (value: unknown) =>
    typeof value === "string" && (standalone ? value.trim() : value) ? value : null
  const results: AppleDirectoryResult[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue
    const row = raw as AppleDirectoryRow
    const feedUrl = row.feedUrl
    if (
      typeof feedUrl !== "string" ||
      (standalone && (!playableFeed(feedUrl) || seen.has(feedUrl)))
    )
      continue
    seen.add(feedUrl)
    results.push({
      feedUrl,
      title: (standalone ? text(row.collectionName) : row.collectionName) ?? feedUrl,
      author: text(row.artistName),
      artworkUrl: text(row.artworkUrl600) ?? text(row.artworkUrl100),
      source: "itunes"
    })
  }
  return results
}
