import { View } from "@podlist/domain"
import { Schema } from "effect"
import { useEffect, useRef, useState } from "react"
import type { ViewData } from "./viewEdit.ts"

export type DialogDraft =
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

export const readDialogDraft = (): DialogDraft | null => {
  try {
    return decode(JSON.parse(sessionStorage.getItem(key) ?? "null"))
  } catch {
    return null
  }
}

const write = (draft: DialogDraft | null) => {
  try {
    if (draft === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // Storage refused: the dialog still works for this visit (WDATA-01).
  }
}

/** One open input dialog per tab; origin (and Electron's server partition) scopes it.
 * Write at each edit, before React renders, as the typed-edit journal does (DATA-01). */
export function useDialogDraft<K extends DialogDraft["kind"]>(
  initial: { readonly kind: K } & Extract<DialogDraft, { readonly kind: K }>
) {
  type D = Extract<DialogDraft, { readonly kind: K }>
  const [draft, setDraft] = useState<D>(() => {
    const saved = readDialogDraft()
    return saved?.kind === initial.kind ? (saved as D) : initial
  })
  const latest = useRef(draft)
  useEffect(() => write(latest.current), [])
  const update = (patch: Partial<D>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    write(next)
    setDraft(next)
  }
  return { draft, update, clear: () => write(null) }
}
