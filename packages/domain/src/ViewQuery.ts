import type { EpochMillis } from "./Units.ts"
import type { ViewFilter, ViewSort } from "./View.ts"

// Compiles a View (or an unsaved Search) into one SQL query over the shared schema
// (Sql.ts). All values travel as parameters. Text matching uses LIKE in v1 (Q51); this
// module is the only place that would change for FTS5 (pod-301.11).

export interface CompiledQuery {
  readonly sql: string
  readonly params: ReadonlyArray<string | number>
}

export interface ViewQueryInput {
  readonly filter: ViewFilter
  readonly sort: ViewSort
  readonly limit: number | null
}

const day = 24 * 60 * 60 * 1000

/** Columns every View returns: the Episode plus the user's state for it. */
export const columns = [
  "e.id",
  "e.subscription_id",
  "e.title",
  "e.published",
  "e.duration",
  "e.artwork_url",
  "s.title AS podcast",
  "s.artwork_url AS podcast_artwork_url",
  "st.played_at",
  "COALESCE(st.starred, 0) AS starred"
] as const

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`)

const inEntry = "EXISTS (SELECT 1 FROM entry_index x WHERE x.episode_id = e.id)"

const orderBy: Record<ViewSort, string> = {
  publishedDesc: "e.published DESC, e.id",
  publishedAsc: "e.published ASC, e.id",
  durationAsc: "e.duration ASC NULLS LAST, e.id",
  durationDesc: "e.duration DESC NULLS LAST, e.id"
}

/** `now` resolves relative date conditions such as "last 7 days". */
export const compile = (view: ViewQueryInput, now: EpochMillis): CompiledQuery => {
  const where: Array<string> = []
  const params: Array<string | number> = []
  const f = view.filter

  // The Library: subscribed podcasts, plus Orphaned Episodes that are still an Entry
  // somewhere or Starred (Q31).
  where.push(`(s.unsubscribed_at IS NULL OR COALESCE(st.starred, 0) = 1 OR ${inEntry})`)

  if (f.published !== undefined) {
    if (f.published._tag === "LastDays") {
      where.push("e.published >= ?")
      params.push(now - f.published.days * day)
    } else {
      if (f.published.from !== null) {
        where.push("e.published >= ?")
        params.push(f.published.from)
      }
      if (f.published.to !== null) {
        where.push("e.published <= ?")
        params.push(f.published.to)
      }
    }
  }

  if (f.podcasts !== undefined) {
    const ids = f.podcasts.subscriptionIds
    where.push(
      `e.subscription_id ${f.podcasts.mode === "include" ? "IN" : "NOT IN"} (${ids.map(() => "?").join(", ")})`
    )
    params.push(...ids)
  }

  if (f.text !== undefined) {
    // Every word must appear in the title, the show notes or the podcast's name
    // (case-insensitive).
    for (const word of f.text.trim().split(/\s+/)) {
      where.push(
        "(e.title LIKE ? ESCAPE '\\' OR e.description LIKE ? ESCAPE '\\' OR s.title LIKE ? ESCAPE '\\')"
      )
      const pattern = `%${escapeLike(word)}%`
      params.push(pattern, pattern, pattern)
    }
  }

  switch (f.played) {
    case "unplayed":
      where.push("st.played_at IS NULL")
      break
    case "played":
      where.push("st.played_at IS NOT NULL")
      break
    case "inProgress":
      where.push(
        "st.played_at IS NULL AND EXISTS (SELECT 1 FROM entry_index x WHERE x.episode_id = e.id AND x.position > 0)"
      )
      break
    case undefined:
      break
  }

  if (f.starred !== undefined) where.push(`COALESCE(st.starred, 0) = ${f.starred ? 1 : 0}`)
  if (f.notInAnyPlaylist === true) where.push(`NOT ${inEntry}`)
  if (f.minDuration !== undefined) {
    where.push("e.duration >= ?")
    params.push(f.minDuration)
  }
  if (f.maxDuration !== undefined) {
    where.push("e.duration <= ?")
    params.push(f.maxDuration)
  }

  let sql = `SELECT ${columns.join(", ")}
FROM episode e
JOIN subscription s ON s.id = e.subscription_id
LEFT JOIN episode_state st ON st.episode_id = e.id
WHERE ${where.join("\n  AND ")}
ORDER BY ${orderBy[view.sort]}`
  if (view.limit !== null) {
    sql += "\nLIMIT ?"
    params.push(view.limit)
  }
  return { sql, params }
}
