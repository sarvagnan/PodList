// Where each screen was reached from, so it can say so: its back link ("‹ Commute", not
// "‹ Back") and the tab or sidebar item that stays selected (LIST-06). Kept per history
// entry, for this tab, so a reload remembers it. AppShell records it on every navigation.

const storageKey = (entry: string) => `podlist:from:${entry}`

let latest: string | null = null

export const cameFrom = {
  /** Where the screen being opened now came from. */
  get: () => latest,
  /** Where this history entry's screen was opened from, if known. */
  of: (entry: string): string | null => {
    try {
      return sessionStorage.getItem(storageKey(entry))
    } catch {
      return null
    }
  },
  set: (pathname: string, entry?: string) => {
    latest = pathname
    if (entry === undefined) return
    try {
      sessionStorage.setItem(storageKey(entry), pathname)
    } catch {
      // Not remembered across a reload.
    }
  }
}

/** The section a screen belongs to, for one reached from elsewhere (an Episode). */
export const sectionOf = (path: string | null) =>
  path?.startsWith("/library")
    ? "/library"
    : path?.startsWith("/playlists")
      ? "/playlists"
      : "/views"
