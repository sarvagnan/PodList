import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { useId, useRef, useState } from "react"
import { useBackLayers } from "../../lib/backLayers.ts"
import { wrapTab } from "../../lib/focusTrap.ts"
import { usePlaylistActions } from "./usePlaylistActions.ts"

/** Names a new Playlist; a Playlist needs a name. */
export function NewPlaylistDialog({
  open,
  onOpenChange
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const id = useId()
  const [name, setName] = useState("")
  const nameField = useRef<HTMLInputElement>(null)
  const [clearOnPlayed, setClearOnPlayed] = useState(false)
  const [error, setError] = useState(false)
  const { create } = usePlaylistActions()
  useBackLayers(open ? 1 : 0, () => onOpenChange(false))
  const save = async () => {
    if (name.trim() === "") {
      setError(true)
      return
    }
    onOpenChange(false)
    await create(name.trim(), clearOnPlayed)
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          initialFocus={nameField}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(26rem,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:data-[ending-style]:translate-y-[-45%] md:data-[ending-style]:opacity-0 md:data-[starting-style]:translate-y-[-45%] md:data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-heading text-xl font-semibold">New Playlist</Dialog.Title>
            <Dialog.Close
              aria-label="Cancel"
              className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <label htmlFor={`${id}-name`} className="mt-4 block text-row font-medium">
            Name
          </label>
          <input
            ref={nameField}
            id={`${id}-name`}
            type="text"
            value={name}
            required
            aria-invalid={error}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => {
              setName(event.target.value)
              setError(false)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save()
            }}
            className="mt-1.5 h-11 w-full rounded-lg border border-field bg-card px-3 text-row"
          />
          {error && (
            <p id={`${id}-error`} className="mt-1 text-small text-destructive">
              A Playlist needs a name.
            </p>
          )}
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={clearOnPlayed}
              onChange={(event) => setClearOnPlayed(event.target.checked)}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-row font-medium">Clear on Played</span>
              <span className="block text-small text-muted-foreground">
                An Entry leaves once its Episode is Played, wherever you heard it.
              </span>
            </span>
          </label>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Dialog.Close className="h-11 rounded-full bg-secondary font-semibold text-secondary-foreground hover:bg-input active:bg-input/70">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void save()}
              className="h-11 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Create
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
