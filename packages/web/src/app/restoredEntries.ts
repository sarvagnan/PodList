import type { State } from "@podlist/domain"
import { Atom } from "effect/reactivity"

export interface RestoredEntries {
  readonly playlistId: string
  readonly episodeIds: ReadonlyArray<string>
}

export const restoredBetween = (before: State.State, after: State.State): RestoredEntries[] => {
  if (before.playlists === after.playlists) return []
  const previous = new Map(before.playlists.map((playlist) => [playlist.id, playlist.entries]))
  return after.playlists.flatMap((playlist) => {
    const previousEntries = previous.get(playlist.id)
    if (previousEntries === playlist.entries) return []
    const oldIds = new Set(previousEntries?.map(({ episodeId }) => episodeId))
    const episodeIds = playlist.entries
      .map(({ episodeId }) => episodeId)
      .filter((id) => !oldIds.has(id))
    return episodeIds.length ? [{ playlistId: playlist.id, episodeIds }] : []
  })
}

interface RestorationOffer {
  readonly entries: ReadonlyArray<RestoredEntries>
  readonly origin: string
}
export const restoredEntriesAtom = Atom.make<RestorationOffer | null>(null).pipe(Atom.keepAlive)

/** Shared by the menu, status action and virtualized Playlist rows. */
export const restoredSelectionAtom = Atom.make<{
  readonly playlistId: string
  readonly episodeId: string
} | null>(null).pipe(Atom.keepAlive)
