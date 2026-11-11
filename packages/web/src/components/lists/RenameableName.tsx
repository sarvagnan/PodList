import { useEffect, useId, useRef, useState } from "react"
import { useCanEdit } from "../../app/hooks.ts"
import { renameDraftKey, useDialogDraft } from "../../lib/dialogDraft.ts"
import { DraftNotice } from "../feedback/DraftNotice.tsx"
import { fieldControl } from "./SettingsRow.tsx"

/** One explicit rename, kept separately from live settings and other open drafts. */
export function RenameableName({
  kind,
  entityId,
  name,
  names,
  onSave,
  disabled = false
}: {
  readonly kind: "View" | "Playlist"
  readonly entityId: string
  readonly name: string
  readonly names: ReadonlyArray<{ readonly id: string; readonly name: string }>
  readonly onSave: (name: string) => Promise<void>
  readonly disabled?: boolean
}) {
  const id = useId()
  const canEdit = useCanEdit()
  const { draft, update, clear, unsaved, retry } = useDialogDraft(
    { kind: "rename", name: null },
    renameDraftKey(kind, entityId)
  )
  const open = draft.name !== null
  const field = useRef<HTMLInputElement>(null)
  const rename = useRef<HTMLButtonElement>(null)
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (open) {
      field.current?.focus({ preventScroll: true })
      field.current?.select()
    }
  }, [open])
  const trimmed = draft.name?.trim() ?? ""
  const taken = names.find(
    (other) => other.id !== entityId && other.name.trim().toLowerCase() === trimmed.toLowerCase()
  )
  const problem =
    trimmed === ""
      ? `A ${kind} needs a name.`
      : taken
        ? `There’s already a ${kind} called “${taken.name}”.`
        : null
  const canSave = canEdit && !disabled && !saving && problem === null && trimmed !== name
  const close = () => {
    update({ name: null })
    clear()
    setFailed(false)
    requestAnimationFrame(() => rename.current?.focus({ preventScroll: true }))
  }
  const save = async () => {
    if (!canSave || busy.current || !open) return
    busy.current = true
    setSaving(true)
    setFailed(false)
    try {
      await onSave(trimmed)
      close()
    } catch {
      setFailed(true)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }
  const reason = problem ?? (failed ? "The name couldn’t be saved. Try again." : null)
  const action = "min-h-10 rounded-full px-4 text-row font-medium disabled:opacity-50"
  return (
    <div className="min-w-0 space-y-2 px-3 py-3">
      {open && !disabled ? (
        <form
          aria-label={`Rename ${kind}`}
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              event.stopPropagation()
              if (!busy.current) close()
            }
          }}
        >
          <label htmlFor={`${id}-name`} className="mb-1 block text-row font-medium">
            Name
          </label>
          <input
            ref={field}
            id={`${id}-name`}
            data-view-name={kind === "View" ? "" : undefined}
            type="text"
            value={draft.name ?? ""}
            required
            disabled={saving}
            aria-invalid={reason !== null}
            aria-describedby={reason ? `${id}-error` : undefined}
            onChange={(event) => {
              if (busy.current) return
              update({ name: event.target.value })
              setFailed(false)
            }}
            className={fieldControl}
          />
          {reason && (
            <p id={`${id}-error`} className="mt-1 text-small text-destructive">
              {reason}
            </p>
          )}
          <DraftNotice unsaved={unsaved} retry={retry} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={close}
              className={`${action} bg-secondary hover:bg-input`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className={`${action} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-row font-medium">Name</p>
          <p className="break-words text-row">{name}</p>
          {disabled ? (
            <p className="text-small text-muted-foreground">The Default Playlist keeps its name.</p>
          ) : (
            <button
              ref={rename}
              data-rename=""
              type="button"
              disabled={!canEdit}
              onClick={() => update({ name })}
              className={`${action} bg-secondary hover:bg-input`}
            >
              Rename
            </button>
          )}
        </>
      )}
    </div>
  )
}
