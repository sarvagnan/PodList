// What Download Rules want on this Device (CONTEXT.md › Download Rule, Manual Download).
// A pure plan from the facts; the Downloads service carries it out.
//
// - Stream ("never"): nothing is fetched for that podcast.
// - Entries ("onEntry"): an Episode is fetched while it is an Entry anywhere.
// - Every new Episode ("allNew"): Unplayed Episodes published since this Device took the
//   rule are fetched, newest first, up to the cap; Entries don't count toward the cap.
// - A download the rules fetched is let go once no rule wants it any more: no longer an
//   Entry, Played, or past the cap. Starred Episodes are never let go, and Manual
//   Downloads are never touched (they belong to the person, not the rules).

export interface RuleFacts {
  readonly subscriptionId: string
  readonly mode: "never" | "onEntry" | "allNew"
  readonly keepAtMost: number | null
  /** When All New was most recently switched on for this Device. */
  readonly since: number
}

export interface EpisodeFacts {
  readonly id: string
  readonly subscriptionId: string
  readonly published: number
  readonly played: boolean
  readonly starred: boolean
  readonly entry: boolean
}

export interface StoredFacts {
  readonly episodeId: string
  readonly manual: boolean
}

export interface DownloadPlan {
  readonly fetch: ReadonlyArray<string>
  readonly discard: ReadonlyArray<string>
}

export const planDownloads = (
  rules: ReadonlyArray<RuleFacts>,
  episodes: ReadonlyArray<EpisodeFacts>,
  stored: ReadonlyArray<StoredFacts>
): DownloadPlan => {
  const wanted = new Set<string>()
  const bySubscription = new Map<string, Array<EpisodeFacts>>()
  for (const e of episodes) {
    const list = bySubscription.get(e.subscriptionId) ?? []
    list.push(e)
    bySubscription.set(e.subscriptionId, list)
  }
  for (const rule of rules) {
    const own = bySubscription.get(rule.subscriptionId) ?? []
    if (rule.mode === "never") continue
    for (const e of own) if (e.entry && !e.played) wanted.add(e.id)
    if (rule.mode === "allNew") {
      const fresh = own
        .filter((e) => !e.played && !e.entry && e.published >= rule.since)
        .sort((a, b) => b.published - a.published)
      const kept = rule.keepAtMost === null ? fresh : fresh.slice(0, rule.keepAtMost)
      for (const e of kept) wanted.add(e.id)
    }
  }
  const storedIds = new Set(stored.map((s) => s.episodeId))
  const starred = new Set(episodes.filter((e) => e.starred).map((e) => e.id))
  return {
    fetch: [...wanted].filter((id) => !storedIds.has(id)),
    discard: stored
      .filter((s) => !s.manual && !wanted.has(s.episodeId) && !starred.has(s.episodeId))
      .map((s) => s.episodeId)
  }
}
