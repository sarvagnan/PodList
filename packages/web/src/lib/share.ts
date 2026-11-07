// Links to share: the Episode's page on the PodList server. In the Mac app the page's own
// address is app://podlist, which opens nowhere else, so it asks the shell for the server.

declare global {
  interface Window {
    readonly podlistApp?: {
      readonly server: () => Promise<string | null>
      /** Names the steps Edit › Undo and Redo will act on, in the Mac app's menu. */
      readonly setUndoRedo?: (undo: string | null, redo: string | null) => void
    }
  }
}

/** The Mac app (Electron), whose right-click menus are native. */
export const inMacApp = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron")

const origin = async () => (await window.podlistApp?.server()) ?? window.location.origin

export const episodeLink = async (episodeId: string) =>
  new URL(`/episodes/${episodeId}`, await origin()).href

/** Copies an Episode's link; answers whether it worked. */
export const copyEpisodeLink = async (episodeId: string) => {
  try {
    await navigator.clipboard.writeText(await episodeLink(episodeId))
    return true
  } catch {
    return false
  }
}
