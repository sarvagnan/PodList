import { Dialog } from "@base-ui/react/dialog"
import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { X } from "lucide-react"
import { useState } from "react"
import { stateAtom } from "../../app/runtime.ts"
import { useBackLayers } from "../../lib/backLayers.ts"
import { wrapTab } from "../../lib/focusTrap.ts"
import { useEpisodeActions } from "./useEpisodeActions.ts"

/**
 * Add an Episode to a Playlist: choose one (the Active Playlist first), then Play Next
 * or Play Last. A sheet from the bottom on the phone, a small dialog on the desktop.
 */
export function AddToPlaylist({
  episode,
  open,
  onOpenChange
}: {
  readonly episode: { readonly id: string; readonly title: string }
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const act = useEpisodeActions()
  const [chosen, setChosen] = useState<string | null>(null)
  useBackLayers(open ? 1 : 0, () => {
    setChosen(null)
    onOpenChange(false)
  })
  const playlists = state
    ? [...state.playlists].sort(
        (a, b) => Number(b.id === state.activePlaylistId) - Number(a.id === state.activePlaylistId)
      )
    : []
  const target = chosen ?? state?.activePlaylistId ?? null
  const add = (placement: "next" | "last") => {
    if (target === null) return
    onOpenChange(false)
    void act({ _tag: "Add", episodeId: episode.id, playlistId: target, placement })
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setChosen(null)
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(24rem,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:data-[ending-style]:translate-y-[-45%] md:data-[ending-style]:opacity-0 md:data-[starting-style]:translate-y-[-45%] md:data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-heading text-xl font-semibold">
              Add to a Playlist
            </Dialog.Title>
            <Dialog.Close
              aria-label="Cancel"
              className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 line-clamp-2 text-row text-muted-foreground">
            {episode.title}
          </Dialog.Description>
          <fieldset className="mt-4">
            <legend className="sr-only">Playlist</legend>
            {playlists.map((p) => (
              <label
                key={p.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 has-[:checked]:bg-accent"
              >
                <input
                  type="radio"
                  name="playlist"
                  value={p.id}
                  checked={target === p.id}
                  onChange={() => setChosen(p.id)}
                  className="size-4 accent-primary"
                />
                <span className="flex-1 text-row font-medium">{p.name}</span>
                <span className="text-small text-muted-foreground">
                  {p.id === state?.activePlaylistId ? "Active · " : ""}
                  {p.entries.length}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => add("next")}
              className="h-11 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Play Next
            </button>
            <button
              type="button"
              onClick={() => add("last")}
              className="h-11 rounded-full bg-secondary font-semibold text-secondary-foreground hover:bg-input active:bg-input/70"
            >
              Play Last
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
