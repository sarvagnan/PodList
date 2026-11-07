import { useAtomSet } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { useNavigate } from "@tanstack/react-router"
import { Schema } from "effect"
import { useCallback } from "react"
import { recordAtom } from "../../app/runtime.ts"
import { useConfirm } from "../feedback/useConfirm.ts"

const change = Schema.decodeUnknownSync(Operation.Change)

/** Create, delete (to the Trash, with Undo) and restore Playlists. */
export function usePlaylistActions() {
  const record = useAtomSet(recordAtom, { mode: "promise" })
  const navigate = useNavigate()
  const confirm = useConfirm()
  const create = useCallback(
    async (name: string, clearOnPlayed: boolean) => {
      const playlistId = crypto.randomUUID()
      await record(change({ _tag: "CreatePlaylist", playlistId, name, clearOnPlayed }))
      await navigate({ to: "/playlists/$playlistId", params: { playlistId } })
    },
    [record, navigate]
  )
  const remove = useCallback(
    async (playlistId: string, name: string) => {
      const step = {
        message: `Moved “${name}” to the Trash`,
        undo: [change({ _tag: "RestorePlaylist", playlistId })]
      }
      await record(change({ _tag: "DeletePlaylist", playlistId }))
      confirm(
        step,
        async () => {
          await record(change({ _tag: "DeletePlaylist", playlistId }))
          return step
        },
        () =>
          document.querySelector<HTMLElement>(`main a[href="/playlists/${playlistId}"]`) ??
          document.querySelector<HTMLElement>(`a[href="/playlists/${playlistId}"]`)
      )
      await navigate({ to: "/playlists" })
    },
    [record, navigate, confirm]
  )
  // Restoring is a step like deleting: Undo sends it back to the Trash.
  const restore = useCallback(
    async (playlistId: string, name: string) => {
      const step = {
        message: `Restored “${name}”`,
        undo: [change({ _tag: "DeletePlaylist", playlistId })]
      }
      await record(change({ _tag: "RestorePlaylist", playlistId }))
      confirm(
        step,
        async () => {
          await record(change({ _tag: "RestorePlaylist", playlistId }))
          return step
        },
        () => document.querySelector<HTMLElement>(`a[href="/playlists/trash"]`)
      )
    },
    [record, confirm]
  )
  return { create, remove, restore }
}
