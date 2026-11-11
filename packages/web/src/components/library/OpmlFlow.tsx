import { useAtomSet } from "@effect/atom-react"
import { useId, useRef, useState, useSyncExternalStore } from "react"
import { localClient } from "#client"
import { useCanEdit } from "../../app/hooks.ts"
import { opmlCommandAtom } from "../../app/library.ts"
import { opmlImport } from "../../library/OpmlImport.ts"

const button =
  "mt-2 min-h-10 rounded-full bg-secondary px-4 text-row font-medium hover:bg-input disabled:opacity-50"
export function OpmlStatus() {
  const state = useSyncExternalStore(opmlImport.listen, opmlImport.getSnapshot)
  const command = useAtomSet(opmlCommandAtom)
  const canEdit = useCanEdit()
  if (state.phase !== "running" && state.phase !== "finished") return null
  const completed = state.podcasts.filter((p) => p.result !== "pending").length
  return (
    <section aria-label="OPML import progress" className="px-4 py-3">
      <p role="status">
        {state.phase === "running" ? "Importing" : "Imported"} {completed} of{" "}
        {state.podcasts.length} · {state.name}
      </p>
      <p className="text-small text-muted-foreground">
        Closing Add podcasts does not stop the import. Progress stays in Library.{" "}
        {localClient
          ? "Keep the app running. If you quit, import the same file again to finish the rest."
          : "Keep this tab open. Closing it stops the import. Import the same file again to finish the rest."}{" "}
        Podcasts already in the Library are skipped.
      </p>
      <ul className="max-h-48 overflow-auto text-small">
        {state.podcasts.map((p) => (
          <li key={p.feedUrl}>
            {p.title} ·{" "}
            {p.result === "pending"
              ? "Waiting"
              : p.result === "failed"
                ? `Failed: ${p.reason}`
                : p.result === "added"
                  ? "Added"
                  : "Already in the Library"}
          </li>
        ))}
      </ul>
      {state.phase === "finished" && state.podcasts.some((p) => p.result === "failed") && (
        <button
          type="button"
          className={button}
          disabled={!canEdit}
          onClick={() => command("retry")}
        >
          Retry failed imports
        </button>
      )}
    </section>
  )
}
export function OpmlFlow() {
  const state = useSyncExternalStore(opmlImport.listen, opmlImport.getSnapshot)
  const command = useAtomSet(opmlCommandAtom)
  const canEdit = useCanEdit()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const busy = state.phase === "running"
  const choose = (file: File | undefined) => {
    if (file && canEdit && !busy) command(file)
  }
  return (
    <div>
      <label htmlFor={id} className="font-medium">
        OPML file
      </label>
      <p className="text-small text-muted-foreground">
        Choose a file to review before Import. Closing Add podcasts does not stop an import.
        Progress stays in Library.{" "}
        {localClient
          ? "Keep the app running; after quitting, import the same file again to finish the rest."
          : "Keep this tab open; closing it stops the import. Import the same file again to finish the rest."}{" "}
        Podcasts already in the Library are skipped.
      </p>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the file button provides keyboard access. */}
      <div
        data-file-drop=""
        className={`mt-2 rounded-xl border-2 border-dashed p-4 text-center ${over ? "border-primary" : "border-input"}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault()
            setOver(true)
            e.dataTransfer.dropEffect = busy ? "none" : "copy"
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          choose(e.dataTransfer.files[0])
        }}
      >
        <p>{over ? "Drop to select" : "Drop an OPML file here"}</p>
        <button
          type="button"
          className={button}
          disabled={!canEdit || busy}
          onClick={() => input.current?.click()}
        >
          Choose a file…
        </button>
        <input
          ref={input}
          id={id}
          type="file"
          className="sr-only"
          tabIndex={-1}
          disabled={!canEdit || busy}
          accept=".opml,.xml,text/xml,text/x-opml,application/xml"
          onClick={(e) => {
            e.currentTarget.value = ""
          }}
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>
      {state.phase === "reading" && <p role="status">Reading {state.name}…</p>}
      {state.phase === "error" && (
        <p role="alert">
          {state.name}: {state.error}
        </p>
      )}
      {state.phase === "ready" && (
        <div>
          <p role="status">
            {state.name}: {state.podcasts.length} podcasts;{" "}
            {state.podcasts.filter((p) => p.result === "already in the Library").length} already in
            the Library.
          </p>
          <button
            type="button"
            className={button}
            disabled={!canEdit || state.podcasts.length === 0}
            onClick={() => command("import")}
          >
            Import
          </button>
        </div>
      )}
      {(state.phase === "ready" || state.phase === "reading" || state.phase === "error") && (
        <button type="button" className={button} onClick={() => opmlImport.cancel()}>
          Cancel
        </button>
      )}
      <OpmlStatus />
    </div>
  )
}
