import { Dialog } from "@base-ui/react/dialog"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { X } from "lucide-react"
import { useRef, useState } from "react"
import { bulkActionAtom, createAndAddAtom } from "../../app/episodeActions.ts"
import { stateAtom } from "../../app/runtime.ts"
import { useBackLayers } from "../../lib/backLayers.ts"
import { wrapTab } from "../../lib/focusTrap.ts"
import { useConfirm } from "../feedback/useConfirm.ts"
import { useEpisodeActions } from "./useEpisodeActions.ts"

/**
 * Add an Episode to a Playlist: choose one (the Active Playlist first), then Play Next
 * or Play Last. A sheet from the bottom on the phone, a small dialog on the desktop.
 */
export function AddToPlaylist({
  episode,
  episodeIds,
  startNew = false,
  open,
  onOpenChange
}: {
  readonly episode: { readonly id: string; readonly title: string }
  readonly episodeIds?: ReadonlyArray<string>
  readonly startNew?: boolean
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const act = useEpisodeActions()
  const [chosen, setChosen] = useState<string | null>(startNew ? "new" : null)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameField = useRef<HTMLInputElement>(null)
  const create = useAtomSet(createAndAddAtom, { mode: "promise" })
  const bulk = useAtomSet(bulkActionAtom, { mode: "promise" })
  const confirm = useConfirm()
  const ids = episodeIds ?? [episode.id]
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
  const add = async (placement: "next" | "last") => {
    if (target === null || busy) return
    if (target === "new") {
      const trimmed = name.trim()
      if (!trimmed || playlists.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
        setError(
          !trimmed ? "A Playlist needs a name." : `There’s already a Playlist called “${trimmed}”.`
        )
        nameField.current?.focus()
        return
      }
      setBusy(true)
      try {
        const again = () => create({ name: trimmed, episodeIds: ids, placement })
        const outcome = await again()
        if (outcome.undo.length === 0) {
          setError(outcome.message)
          return
        }
        confirm(outcome, again)
        onOpenChange(false)
      } finally {
        setBusy(false)
      }
      return
    }
    if (episodeIds) {
      const ordered = placement === "next" ? [...ids].reverse() : ids
      const again = () =>
        bulk({
          actions: ordered.map((episodeId) => ({
            _tag: "Add",
            episodeId,
            playlistId: target,
            placement
          })),
          message: `${ids.length} Episodes play ${placement} in ${playlists.find((p) => p.id === target)?.name}`
        })
      confirm(await again(), again)
    } else await act({ _tag: "Add", episodeId: episode.id, playlistId: target, placement })
    onOpenChange(false)
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setChosen(null)
          setName("")
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          // Opens on the chosen Playlist, ready to change or confirm (KEY-04).
          initialFocus={() =>
            nameField.current ??
            document.querySelector<HTMLElement>('[data-sheet] input[name="playlist"]:checked')
          }
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(24rem,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:data-[ending-style]:translate-y-[-45%] md:data-[ending-style]:opacity-0 md:data-[starting-style]:translate-y-[-45%] md:data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-heading text-xl font-semibold">
              Add to a Playlist
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
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
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 has-[:checked]:bg-accent">
              <input
                type="radio"
                name="playlist"
                value="new"
                checked={target === "new"}
                onChange={() => {
                  setChosen("new")
                  requestAnimationFrame(() => nameField.current?.focus())
                }}
                className="size-4 accent-primary"
              />
              <span className="text-row font-medium">New Playlist…</span>
            </label>
          </fieldset>
          {target === "new" && (
            <div className="mt-3">
              <label className="block text-row font-medium">
                Name
                <input
                  ref={nameField}
                  type="text"
                  value={name}
                  required
                  aria-invalid={error !== null}
                  aria-describedby={error ? "new-playlist-error" : undefined}
                  onChange={(event) => {
                    setName(event.target.value)
                    setError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void add("next")
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-field bg-card px-3 py-2 text-row"
                />
              </label>
              {error && (
                <p
                  id="new-playlist-error"
                  role="alert"
                  className="mt-1 text-small text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {/* The filled primary on the right, as in every other dialog (FLOW-07). */}
            <button
              type="button"
              aria-disabled={busy}
              onClick={() => void add("last")}
              className="h-11 rounded-full bg-secondary font-semibold text-secondary-foreground hover:bg-input active:bg-input/70"
            >
              Play Last
            </button>
            <button
              type="button"
              aria-disabled={busy}
              onClick={() => void add("next")}
              className="h-11 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Play Next
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
