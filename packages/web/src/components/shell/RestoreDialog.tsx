import { useState } from "react"
import { readDialogDraft } from "../../lib/dialogDraft.ts"
import { AddToPlaylist } from "../episodes/AddToPlaylist.tsx"
import { AddPodcastSheet } from "../library/AddPodcastSheet.tsx"
import { NewPlaylistDialog } from "../playlists/NewPlaylistDialog.tsx"
import { SaveSearchDialog } from "../views/SaveSearchDialog.tsx"

/** Restore the open draft independently of rows that may not be mounted yet (WDATA-01). */
export function RestoreDialog() {
  const [draft, setDraft] = useState(readDialogDraft)
  const close = () => setDraft(null)
  if (draft === null) return null
  switch (draft.kind) {
    case "playlist":
      return <NewPlaylistDialog open onOpenChange={close} />
    case "view":
      return <SaveSearchDialog open view={draft.view} onOpenChange={close} />
    case "podcasts":
      return <AddPodcastSheet open onOpenChange={close} />
    case "add":
      return (
        <AddToPlaylist
          open
          episode={draft.episode}
          {...(draft.episodeIds === undefined ? {} : { episodeIds: draft.episodeIds })}
          onOpenChange={close}
        />
      )
  }
}
