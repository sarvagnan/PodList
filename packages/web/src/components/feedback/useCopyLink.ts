import { Toast } from "@base-ui/react/toast"
import { useCallback } from "react"
import { copyEpisodeLink } from "../../lib/share.ts"

/** Copies an Episode's link and says so (EDIT-05). */
export function useCopyEpisodeLink() {
  const toasts = Toast.useToastManager()
  return useCallback(
    async (episodeId: string) =>
      toasts.add({
        description: (await copyEpisodeLink(episodeId)) ? "Link copied" : "Couldn’t copy the link",
        timeout: 3000
      }),
    [toasts]
  )
}
