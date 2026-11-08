import { Dialog } from "@base-ui/react/dialog"
import { useAtomSet } from "@effect/atom-react"
import { useNavigate } from "@tanstack/react-router"
import { X } from "lucide-react"
import { useId, useRef, useState } from "react"
import { recordAtom } from "../../app/runtime.ts"
import { useBackLayers } from "../../lib/backLayers.ts"
import { useDialogDraft } from "../../lib/dialogDraft.ts"
import { wrapTab } from "../../lib/focusTrap.ts"
import { saveViewChange, type ViewData } from "../../lib/viewEdit.ts"
import { DraftNotice } from "../feedback/DraftNotice.tsx"

/** Saves a Search, its words and any conditions, as a View, which needs a name
 * (CONTEXT.md › Search). */
export function SaveSearchDialog({
  view: draft,
  open,
  onOpenChange
}: {
  readonly view: ViewData
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const id = useId()
  const {
    draft: saved,
    update,
    clear,
    unsaved,
    retry
  } = useDialogDraft({ kind: "view", name: "", view: draft })
  const { name } = saved
  const close = (next: boolean) => {
    if (!next) clear()
    onOpenChange(next)
  }
  const nameField = useRef<HTMLInputElement>(null)
  const [error, setError] = useState(false)
  const record = useAtomSet(recordAtom, { mode: "promise" })
  const navigate = useNavigate()
  useBackLayers(open ? 1 : 0, () => close(false))
  const save = async () => {
    const trimmed = name.trim()
    if (trimmed === "") {
      setError(true)
      return
    }
    const view: ViewData = { ...draft, id: crypto.randomUUID(), name: trimmed }
    await record(saveViewChange(view))
    close(false)
    await navigate({ to: "/views/$viewId", params: { viewId: view.id } })
  }
  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          initialFocus={nameField}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(26rem,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:data-[ending-style]:translate-y-[-45%] md:data-[ending-style]:opacity-0 md:data-[starting-style]:translate-y-[-45%] md:data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-heading text-xl font-semibold">
              Save as a View
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-row text-muted-foreground">
            Keeps this search, with its conditions, and shows its latest matches whenever you open
            it. You can change it later with Edit View.
          </Dialog.Description>
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
              update({ name: event.target.value })
              setError(false)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save()
            }}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-field bg-card px-3 py-2 text-row"
          />
          {error && (
            <p id={`${id}-error`} className="mt-1 text-small text-destructive">
              A View needs a name.
            </p>
          )}
          <DraftNotice unsaved={unsaved} retry={retry} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Dialog.Close className="h-11 rounded-full bg-secondary font-semibold text-secondary-foreground hover:bg-input active:bg-input/70">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void save()}
              className="h-11 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Save View
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
