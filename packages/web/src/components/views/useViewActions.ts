import { useAtomSet } from "@effect/atom-react"
import type { View } from "@podlist/domain"
import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"
import { useAppState } from "../../app/hooks.ts"
import { recordAtom } from "../../app/runtime.ts"
import { blankView, deleteViewChange, saveViewChange, viewData } from "../../lib/viewEdit.ts"
import { useConfirm } from "../feedback/useConfirm.ts"

/** Views made by New View on this page and not yet given a name or a condition: left
 * like that, they go (with Undo) rather than piling up as identical "New View" rows. */
const fresh = new Set<string>()

/** A new View still as New View made it: its own default name, every condition at Any. */
export const untouched = (view: View.View) =>
  fresh.has(view.id) &&
  /^New View( \d+)?$/.test(view.name) &&
  Object.keys(view.filter).length === 0 &&
  view.sort === "publishedDesc" &&
  view.limit === null

/** "New View", or "New View 2", 3… when that name is taken. */
const freshName = (taken: ReadonlyArray<string>) => {
  if (!taken.includes("New View")) return "New View"
  let n = 2
  while (taken.includes(`New View ${n}`)) n++
  return `New View ${n}`
}

/** New View (opens its editor), Delete View (with Undo), and discarding an untouched one. */
export function useViewActions() {
  const record = useAtomSet(recordAtom, { mode: "promise" })
  const navigate = useNavigate()
  const confirm = useConfirm()
  const state = useAppState()
  // An untouched new View is about to go as this one opens: its name is free again.
  const names = state?.views.filter((v) => !untouched(v)).map((v) => v.name) ?? []
  const namesKey = names.join("\u0000")
  // biome-ignore lint/correctness/useExhaustiveDependencies: names is read through its key.
  const create = useCallback(async () => {
    const view = blankView(crypto.randomUUID(), freshName(names))
    fresh.add(view.id)
    await record(saveViewChange(view))
    await navigate({ to: "/views/$viewId", params: { viewId: view.id }, search: { edit: true } })
    // Its name is the first thing to give it, as with New Playlist (KEY-06): after the
    // screen's own focus on arrival.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const field = document.querySelector<HTMLInputElement>("main [data-view-name]")
        field?.focus()
        field?.select()
      })
    )
  }, [record, navigate, namesKey])
  /** Leaving a new View untouched: it goes, and the toast can bring it back. */
  const discard = useCallback(
    async (view: View.View) => {
      fresh.delete(view.id)
      const before = viewData(view)
      const step = {
        message: `Discarded empty View “${view.name}”`,
        undo: [saveViewChange(before)]
      }
      await record(deleteViewChange(view.id))
      confirm(step, async () => {
        await record(deleteViewChange(view.id))
        return step
      })
    },
    [record, confirm]
  )
  const remove = useCallback(
    async (view: View.View) => {
      const before = viewData(view)
      const step = { message: `Deleted “${view.name}”`, undo: [saveViewChange(before)] }
      await record(deleteViewChange(view.id))
      confirm(
        step,
        async () => {
          await record(deleteViewChange(view.id))
          return step
        },
        () =>
          document.querySelector<HTMLElement>(`main a[href="/views/${view.id}"]`) ??
          document.querySelector<HTMLElement>(`a[href="/views/${view.id}"]`)
      )
      await navigate({ to: "/views" })
    },
    [record, navigate, confirm]
  )
  return { create, remove, discard }
}
