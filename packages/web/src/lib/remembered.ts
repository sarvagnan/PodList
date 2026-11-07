// Small per-Device conveniences kept in browser storage: where you were, and which
// Playlist Next / Last go to (DATA-06). Storage can be missing or refuse; then nothing is
// remembered and the app opens on its defaults.

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(`podlist:${key}`)
  } catch {
    return null
  }
}
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(`podlist:${key}`)
    else localStorage.setItem(`podlist:${key}`, value)
  } catch {
    // Not remembered; nothing else depends on it.
  }
}

/** Screens worth reopening on launch. */
const reopenable = /^\/(views|playlists|library|episodes)(\/|$|\?)/

export const lastScreen = {
  get: (): string | null => {
    const path = read("last-screen")
    return path !== null && reopenable.test(path) ? path : null
  },
  set: (path: string) => {
    if (reopenable.test(path)) write("last-screen", path)
  }
}

export const nextLastTarget = {
  get: () => read("next-last-target"),
  set: (playlistId: string | null) => write("next-last-target", playlistId)
}

/** This Device has shown (or been told to skip) the first-run checklist. */
export const firstRunDone = {
  get: () => read("first-run-done") === "1",
  set: () => write("first-run-done", "1"),
  clear: () => write("first-run-done", null)
}

/** Starter Views were made for this Library from this Device; never again. */
export const starterViewsMade = {
  get: () => read("starter-views") === "1",
  set: () => write("starter-views", "1")
}

/** "/" for Search and Space to play or pause: on unless turned off in Settings (WKEY-02). */
export const singleKeyShortcuts = {
  get: () => read("single-key-shortcuts") !== "off",
  set: (on: boolean) => write("single-key-shortcuts", on ? null : "off")
}
