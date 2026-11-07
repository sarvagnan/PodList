import { useAtomSet } from "@effect/atom-react"
import type { View } from "@podlist/domain"
import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"
import { recordAtom } from "../../app/runtime.ts"
import { blankView, deleteViewChange, saveViewChange, viewData } from "../../lib/viewEdit.ts"
import { useConfirm } from "../feedback/useConfirm.ts"

/** New View (opens its editor) and Delete View (with Undo). */
export function useViewActions() {
  const record = useAtomSet(recordAtom, { mode: "promise" })
  const navigate = useNavigate()
  const confirm = useConfirm()
  const create = useCallback(async () => {
    const view = blankView(crypto.randomUUID())
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
  }, [record, navigate])
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
  return { create, remove }
}
