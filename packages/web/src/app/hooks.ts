import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { nextLastTargetAtom } from "./episodeActions.ts"
import { nowPlayingAtom, stateAtom, syncStatusAtom } from "./runtime.ts"

/** The user State, or null until the local database has loaded. */
export const useAppState = () => AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)

/** False until this Device has synced once: empty lists then mean "not here yet". */
export const useLibraryReady = () =>
  AsyncResult.getOrElse(useAtomValue(syncStatusAtom), () => null)?.ready ?? false

/** The loaded Entry and whether it's playing, or null. */
export const useNowPlaying = () => AsyncResult.getOrElse(useAtomValue(nowPlayingAtom), () => null)

/** "Playing" or "Paused" for the Active Playlist; nothing for the others. */
export const usePlaylistStatus = (playlistId: string) => {
  const state = useAppState()
  const now = useNowPlaying()
  if (state?.activePlaylistId !== playlistId) return null
  return now?.playlistId === playlistId && now.playing ? "Playing" : "Paused"
}

/** The Playlist that Next and Last add to: the one chosen, else the Active one. */
export function useNextLastTarget() {
  const state = useAppState()
  const chosen = useAtomValue(nextLastTargetAtom)
  return (
    state?.playlists.find((p) => p.id === chosen) ??
    state?.playlists.find((p) => p.id === state.activePlaylistId)
  )
}

/** Local clients allow offline edits. Web waits for State and server reachability. */
export const useCanEdit = () => {
  const status = AsyncResult.getOrElse(useAtomValue(syncStatusAtom), () => null)
  return status?.writable === undefined ? true : status.ready && status.writable
}
