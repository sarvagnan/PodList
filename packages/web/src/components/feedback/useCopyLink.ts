import { Toast } from "@base-ui/react/toast"
import { useCallback } from "react"
import { episodeLink, shareLink } from "../../lib/share.ts"

/**
 * Copies text and says so. A failure stays until dismissed, with Try again, rather than
 * passing on a timer (WDATA-04).
 */
export function useCopyText() {
  const toasts = Toast.useToastManager()
  const copy = useCallback(
    async (text: () => Promise<string> | string, what: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(await text())
        toasts.add({ description: `${what} copied`, timeout: 3000 })
      } catch {
        const toast = toasts.add({
          description: `Couldn’t copy the ${what.toLowerCase()}`,
          timeout: 0,
          actionProps: {
            children: "Try again",
            onClick: () => {
              toasts.close(toast)
              void copy(text, what)
            }
          }
        })
      }
    },
    [toasts]
  )
  return copy
}

/** Copies a page's link (on the PodList server) and says so (EDIT-05). */
export function useCopyLink() {
  const copy = useCopyText()
  return useCallback((path: string) => copy(() => shareLink(path), "Link"), [copy])
}

/** Copies an Episode's link and says so. */
export function useCopyEpisodeLink() {
  const copy = useCopyText()
  return useCallback(
    (episodeId: string | ReadonlyArray<string>) => {
      const ids = typeof episodeId === "string" ? [episodeId] : episodeId
      // Copy every ticked Episode, in list order, including virtual rows (EDIT-02).
      return copy(
        async () => (await Promise.all(ids.map(episodeLink))).join("\n"),
        ids.length === 1 ? "Link" : "Links"
      )
    },
    [copy]
  )
}
