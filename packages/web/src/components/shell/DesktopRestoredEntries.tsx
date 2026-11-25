import { useAtom, useAtomSet } from "@effect/atom-react"
import { useRouter, useRouterState } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"
import { useAppState } from "../../app/hooks.ts"
import { restoredEntriesAtom, restoredSelectionAtom } from "../../app/restoredEntries.ts"

export function DesktopRestoredEntries() {
  const [offer, setOffer] = useAtom(restoredEntriesAtom)
  const requestSelection = useAtomSet(restoredSelectionAtom)
  const state = useAppState()
  const router = useRouter()
  const path = useRouterState({ select: (value) => value.location.pathname })
  const targets = offer?.entries.flatMap(({ playlistId, episodeIds }) => {
    const playlist = state?.playlists.find(({ id }) => id === playlistId)
    if (!playlist) return []
    const live = new Set<string>(playlist.entries.map(({ episodeId }) => episodeId))
    const episodeId = episodeIds.find((id) => live.has(id))
    return episodeId ? [{ playlistId, episodeId }] : []
  })
  const current = targets?.find(
    (candidate) => path === `/playlists/${encodeURIComponent(candidate.playlistId)}`
  )
  const target = current ?? targets?.[0]
  const playlistId = target?.playlistId
  const episodeId = target?.episodeId
  const reveal = useCallback(() => {
    if (!playlistId || !episodeId) return
    void router
      .navigate({
        to: "/playlists/$playlistId",
        params: { playlistId },
        search: { episode: episodeId }
      })
      .then(() => {
        requestSelection({ playlistId, episodeId })
        setOffer(null)
      })
  }, [episodeId, playlistId, requestSelection, router, setOffer])

  const href = useRouterState({ select: (value) => value.location.href })
  const staysOnList =
    current !== undefined && !new URLSearchParams(window.location.search).has("tab")
  useEffect(() => {
    if (staysOnList && offer?.origin === href) reveal()
  }, [staysOnList, href, offer?.origin, reveal])

  const available = target !== undefined
  useEffect(() => {
    const command = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === "showRestoredEntries") reveal()
    }
    window.podlistApp?.setRestoredEntries?.(available)
    document.addEventListener("podlist:command", command)
    return () => document.removeEventListener("podlist:command", command)
  }, [available, reveal])

  if (!available) return null
  return (
    <div className="flex justify-end px-5 py-1 md:px-8">
      <button
        type="button"
        className="rounded-md px-2 py-1 text-row font-medium text-primary hover:bg-secondary"
        onClick={reveal}
      >
        Show Restored Entries
      </button>
    </div>
  )
}
