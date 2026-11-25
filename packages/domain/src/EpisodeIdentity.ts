export interface EpisodeIdentity {
  readonly guid: string
  readonly audioUrl: string
  readonly title: string
  readonly published: number
}

/** Candidates belong to one Subscription. Fallbacks are enabled for a complete feed. */
export function matchEpisode<Stored extends EpisodeIdentity>(
  incoming: EpisodeIdentity,
  candidates: Iterable<Stored>,
  guidsInFeed?: ReadonlySet<string>
): Stored | undefined {
  let fallback: Stored | undefined
  let ambiguous = false
  for (const stored of candidates) {
    if (stored.guid === incoming.guid) return stored
    if (!guidsInFeed || guidsInFeed.has(stored.guid)) continue
    if (
      stored.audioUrl === incoming.audioUrl ||
      (stored.title === incoming.title && stored.published === incoming.published)
    ) {
      if (fallback !== undefined) ambiguous = true
      else fallback = stored
    }
  }
  return ambiguous ? undefined : fallback
}
