import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useCallback } from "react"
import { undoAtom, undoStackAtom } from "../../app/episodeActions.ts"
import type { Outcome } from "../../lib/episodeActions.ts"

let nextId = 0
/** How many steps Cmd/Ctrl-Z can take back. */
const depth = 30

/**
 * Confirms a step with a toast. A step that can be taken back goes on the undo stack,
 * and its toast offers Undo; Cmd/Ctrl-Z (UndoShortcut) reaches it after the toast is gone.
 */
export function useConfirm() {
  const toasts = Toast.useToastManager()
  const undo = useAtomSet(undoAtom)
  const setStack = useAtomSet(undoStackAtom)
  return useCallback(
    (outcome: Outcome) => {
      if (outcome.undo.length === 0) {
        toasts.add({ description: outcome.message, timeout: 4000 })
        return
      }
      const id = ++nextId
      setStack((stack) => [...stack.slice(1 - depth), { id, ...outcome }])
      toasts.add({
        description: outcome.message,
        timeout: 8000,
        actionProps: {
          children: "Undo",
          onClick: () => {
            setStack((stack) => stack.filter((step) => step.id !== id))
            undo(outcome.undo)
          }
        }
      })
    },
    [toasts, undo, setStack]
  )
}
