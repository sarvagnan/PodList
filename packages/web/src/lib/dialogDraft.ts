import { View } from "@podlist/domain"
import { Schema } from "effect"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ViewData } from "./viewEdit.ts"

export type DialogDraft =
  | { readonly kind: "rename"; readonly name: string | null }
  | { readonly kind: "playlist"; readonly name: string; readonly clearOnPlayed: boolean }
  | { readonly kind: "view"; readonly name: string; readonly view: ViewData }
  | {
      readonly kind: "podcasts"
      readonly tab: "search" | "address" | "opml"
      readonly search: string
      readonly address: string
    }
  | {
      readonly kind: "add"
      readonly name: string
      readonly chosen: string | null
      readonly episode: { readonly id: string; readonly title: string }
      readonly episodeIds?: ReadonlyArray<string>
    }

const key = "podlist:dialog-draft"
const decode = Schema.decodeUnknownSync(
  Schema.Union([
    Schema.Struct({ kind: Schema.Literal("rename"), name: Schema.NullOr(Schema.String) }),
    Schema.Struct({
      kind: Schema.Literal("playlist"),
      name: Schema.String,
      clearOnPlayed: Schema.Boolean
    }),
    Schema.Struct({
      kind: Schema.Literal("view"),
      name: Schema.String,
      view: Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        filter: View.ViewFilter,
        sort: View.ViewSort,
        limit: Schema.NullOr(Schema.Number)
      })
    }),
    Schema.Struct({
      kind: Schema.Literal("podcasts"),
      tab: Schema.Literals(["search", "address", "opml"]),
      search: Schema.String,
      address: Schema.String
    }),
    Schema.Struct({
      kind: Schema.Literal("add"),
      name: Schema.String,
      chosen: Schema.NullOr(Schema.String),
      episode: Schema.Struct({ id: Schema.String, title: Schema.String }),
      episodeIds: Schema.optionalKey(Schema.Array(Schema.String))
    })
  ])
)

export const readDialogDraft = (storageKey = key): DialogDraft | null => {
  try {
    return decode(JSON.parse(localStorage.getItem(storageKey) ?? "null"))
  } catch {
    return null
  }
}

export const storeDialogDraft = (draft: DialogDraft | null, storageKey = key): boolean => {
  try {
    if (draft === null) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, JSON.stringify(draft))
    return true
  } catch {
    // A refused write leaves the previous durable copy intact (DATA-01).
    return false
  }
}

/** Recover the open typed draft across tab closure; the origin (and Electron’s server
 * partition) scopes it (DATA-01, WDATA-01).
 * Write at each edit, before React renders, as the typed-edit journal does (DATA-01). */
export function useDialogDraft<K extends DialogDraft["kind"]>(
  initial: { readonly kind: K } & Extract<DialogDraft, { readonly kind: K }>,
  storageKey = key
) {
  type D = Extract<DialogDraft, { readonly kind: K }>
  const [draft, setDraft] = useState<D>(() => {
    const saved = readDialogDraft(storageKey)
    return saved?.kind === initial.kind ? (saved as D) : initial
  })
  const latest = useRef(draft)
  const stored = useRef(false)
  const unsafe = useRef(false)
  const [unsaved, setUnsaved] = useState(false)
  const persist = useCallback(
    (next: D) => {
      // A closed rename is not unfinished input. Do not create an idle draft or
      // warn about leaving it when this browser refuses storage.
      const value: DialogDraft = next
      if (value.kind === "rename" && value.name === null) {
        storeDialogDraft(null, storageKey)
        unsafe.current = false
        setUnsaved(false)
        return
      }
      stored.current =
        storeDialogDraft(next, storageKey) ||
        JSON.stringify(readDialogDraft(storageKey)) === JSON.stringify(next)
      unsafe.current = !stored.current
      setUnsaved(unsafe.current)
    },
    [storageKey]
  )
  useEffect(() => {
    persist(latest.current)
    // Warn only for the latest value without a durable copy (DATA-01, WDATA-02).
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!unsafe.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [persist])
  const update = (patch: Partial<D>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    persist(next)
    setDraft(next)
  }
  const clear = () => {
    // Never erase the last saved copy after a newer write was refused (DATA-01).
    if (stored.current) storeDialogDraft(null, storageKey)
    unsafe.current = false
    setUnsaved(false)
  }
  return { draft, update, clear, unsaved, retry: () => persist(latest.current) }
}

/** Rename drafts coexist with dialogs and with other Views and Playlists. */
export const renameDraftKey = (kind: "View" | "Playlist", id: string) =>
  `podlist:rename-draft:${kind}:${id}`
