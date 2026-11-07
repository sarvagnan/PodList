import { Operation, type View } from "@podlist/domain"
import { Schema } from "effect"

// Editing a View (docs/design/ui-layout.md › View editor): every condition is a row that
// is "Any" until changed; "Any" means the key is absent from the filter.

export type Filter = View.ViewFilter

/** A View as edited: the domain's fields, as plain data. */
export interface ViewData {
  readonly id: string
  readonly name: string
  readonly filter: Filter
  readonly sort: View.ViewSort
  readonly limit: number | null
}

export const blankView = (id: string, name = "New View"): ViewData => ({
  id,
  name,
  filter: {},
  sort: "publishedDesc",
  limit: null
})

/** Sets one condition; `undefined` sets it back to Any. */
export const withCondition = <K extends keyof Filter>(
  filter: Filter,
  key: K,
  value: Filter[K] | undefined
): Filter => {
  const next: Record<string, unknown> = { ...filter }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next as Filter
}

export type PublishedChoice = "any" | "7" | "14" | "30" | "between"

export const publishedChoice = (filter: Filter): PublishedChoice => {
  const p = filter.published
  if (p === undefined) return "any"
  if (p._tag === "Between") return "between"
  return p.days === 7 || p.days === 14 || p.days === 30
    ? (String(p.days) as PublishedChoice)
    : "between"
}

export const withPublished = (filter: Filter, choice: PublishedChoice): Filter =>
  choice === "any"
    ? withCondition(filter, "published", undefined)
    : choice === "between"
      ? withCondition(filter, "published", {
          _tag: "Between",
          from: null,
          to: null
        } as unknown as Filter["published"])
      : withCondition(filter, "published", {
          _tag: "LastDays",
          days: Number(choice)
        } as unknown as Filter["published"])

const decodeChange = Schema.decodeUnknownSync(Operation.Change)

export const saveViewChange = (view: ViewData) => decodeChange({ _tag: "SaveView", view })
export const deleteViewChange = (viewId: string) => decodeChange({ _tag: "DeleteView", viewId })

/** The View's fields as plain data, from the State's View. */
export const viewData = (view: View.View): ViewData => ({
  id: view.id,
  name: view.name,
  filter: view.filter,
  sort: view.sort,
  limit: view.limit
})
