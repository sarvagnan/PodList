import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useCallback } from "react"
import { redoStackAtom, undoAtom, undoStackAtom } from "../../app/episodeActions.ts"
import type { Outcome } from "../../lib/episodeActions.ts"

let nextId = 0
/** Each step's Undo toast, so ⌘Z can close the toast of the step it takes back. */
export const toastOfStep = new Map<number, string>()
/** How many steps Cmd/Ctrl-Z can take back. */
const depth = 30

/** After Undo, where focus goes: the given element once it is back (a restored row
 * arrives a moment later), else what had focus when the step was taken, else the screen's
 * heading. The toast's Undo button is going away, and focus must not fall to the page. */
const refocus = (find: (() => HTMLElement | null) | undefined, origin: Element | null) => {
  let frames = 60
  const attempt = () => {
    const target = find?.()
    if (target) return target.focus()
    if (--frames > 0 && find) return requestAnimationFrame(attempt)
    if (origin instanceof HTMLElement && origin.isConnected) return origin.focus()
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true })
  }
  requestAnimationFrame(attempt)
}

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
    (
      outcome: Outcome,
      again: () => Promise<Outcome>,
      /** Finds what Undo brings back, to put focus on it (WKEY-03). */
      focus?: () => HTMLElement | null
    ) => {
      const origin = document.activeElement
      if (outcome.undo.length === 0) {
        toasts.add({ description: outcome.message, timeout: 4000 })
        return
      }
      const id = ++nextId
      setStack((stack) => [...stack.slice(1 - depth), { id, ...outcome, again }])
      setRedo([])
      const toast: string = toasts.add({
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
            // Says it's done, as ⌘Z does.
            toasts.add({ description: `Undone: ${outcome.message}`, timeout: 3000 })
            refocus(focus, origin)
          }
        }
      })
      toastOfStep.set(id, toast)
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
