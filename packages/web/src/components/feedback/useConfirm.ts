import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useCallback } from "react"
import { redoStackAtom, undoAtom, undoStackAtom } from "../../app/episodeActions.ts"
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
  const setRedo = useAtomSet(redoStackAtom)
  return useCallback(
    (outcome: Outcome, again: () => Promise<Outcome>) => {
      if (outcome.undo.length === 0) {
        toasts.add({ description: outcome.message, timeout: 4000 })
        return
      }
      const id = ++nextId
      setStack((stack) => [...stack.slice(1 - depth), { id, ...outcome, again }])
      setRedo([])
      const toast = toasts.add({
        description: outcome.message,
        // Stays until dismissed or replaced by the next step (one shows at a time): on a
        // phone this Undo is the way back (WDATA-04).
        timeout: 0,
        actionProps: {
          children: "Undo",
          onClick: () => {
            setStack((stack) => stack.filter((step) => step.id !== id))
            undo(outcome.undo)
            // Used: it goes (APPEAR-11).
            toasts.close(toast)
          }
        }
      })
    },
    [toasts, undo, setStack, setRedo]
  )
}

/**
 * Puts a step on the undo stack without a toast, for edits that show themselves (a
 * View's conditions change its list at once).
 */
export function useUndoable() {
  const setStack = useAtomSet(undoStackAtom)
  const setRedo = useAtomSet(redoStackAtom)
  return useCallback(
    (step: Outcome & { readonly again: () => Promise<Outcome> }) => {
      setStack((stack) => [...stack.slice(1 - depth), { id: ++nextId, ...step }])
      setRedo([])
    },
    [setStack, setRedo]
  )
}
