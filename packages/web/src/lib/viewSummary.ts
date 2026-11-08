import type { View } from "@podlist/domain"

const sorts: Record<View.ViewSort, string> = {
  publishedDesc: "Newest first",
  publishedAsc: "Oldest first",
  durationAsc: "Shortest first",
  durationDesc: "Longest first"
}

const minutes = (seconds: number) => `${Math.round(seconds / 60)} min`

/** A View's conditions in a few words: "Last 7 days · Unplayed · Newest first". */
export const describeView = (view: View.View) => {
  const f = view.filter
  const parts: Array<string> = []
  if (f.published?._tag === "LastDays") {
    parts.push(f.published.days === 1 ? "Last day" : `Last ${f.published.days} days`)
  } else if (f.published) parts.push("Date range")
  if (f.podcasts) {
    const n = f.podcasts.subscriptionIds.length
    parts.push(`${f.podcasts.mode === "include" ? "" : "Not "}${n} podcast${n === 1 ? "" : "s"}`)
  }
  if (f.text) parts.push(`“${f.text}”`)
  if (f.played === "unplayed") parts.push("Unplayed")
  if (f.played === "played") parts.push("Played")
  if (f.played === "inProgress") parts.push("In progress")
  if (f.starred === true) parts.push("Starred")
  if (f.starred === false) parts.push("Not starred")
  if (f.notInAnyPlaylist) parts.push("Not in a Playlist")
  if (f.minDuration !== undefined && f.maxDuration !== undefined) {
    parts.push(`${minutes(f.minDuration)}–${minutes(f.maxDuration)}`)
    // The form's own words for the condition (At least, At most).
  } else if (f.minDuration !== undefined) parts.push(`At least ${minutes(f.minDuration)}`)
  else if (f.maxDuration !== undefined) parts.push(`At most ${minutes(f.maxDuration)}`)
  if (parts.length === 0) parts.push("Everything")
  parts.push(sorts[view.sort])
  return parts.join(" · ")
}
