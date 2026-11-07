import { Toast } from "@base-ui/react/toast"
import { useCallback } from "react"
import { copyLink } from "../../lib/share.ts"

/** Copies a page's link and says so (EDIT-05). */
export function useCopyLink() {
  const toasts = Toast.useToastManager()
  return useCallback(
    async (path: string) =>
      toasts.add({
        description: (await copyLink(path)) ? "Link copied" : "Couldn’t copy the link",
        timeout: 3000
      }),
    [toasts]
  )
}

/** Copies an Episode's link and says so. */
export function useCopyEpisodeLink() {
  const copy = useCopyLink()
  return useCallback((episodeId: string) => copy(`/episodes/${episodeId}`), [copy])
}
