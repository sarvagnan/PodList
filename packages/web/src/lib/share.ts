// Links to share: the page on the PodList server. In the Mac app the page's own
// address is app://podlist, which opens nowhere else, so it asks the shell for the server.

declare global {
  interface Window {
    readonly podlistApp?: {
      readonly automation?: {
        readonly status: () => Promise<
          import("../automation/AutomationSettings.tsx").AutomationStatus
        >
        readonly setEnabled: (
          enabled: boolean
        ) => Promise<import("../automation/AutomationSettings.tsx").AutomationStatus>
        readonly onCall: (
          call: (name: string, args: Record<string, unknown>) => Promise<unknown>
        ) => () => void
      }
      readonly server: () => Promise<string | null>
      /** Names the steps Edit › Undo and Redo will act on, in the Mac app's menu. */
      readonly setUndoRedo?: (undo: string | null, redo: string | null, editing: boolean) => void
    }
  }
}

/** The Mac app (Electron), whose right-click menus are native. */
export const inMacApp = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron")

const origin = async () => (await window.podlistApp?.server()) ?? window.location.origin

/** A page of the app as a link that opens anywhere: on the PodList server. */
export const shareLink = async (path: string) => new URL(path, await origin()).href

export const episodeLink = (episodeId: string) => shareLink(`/episodes/${episodeId}`)
