import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useCallback } from "react"
import { redoStackAtom, undoAtom, undoStackAtom } from "../../app/episodeActions.ts"
import type { Outcome } from "../../lib/episodeActions.ts"

let nextId = 0
/** Each step's Undo toast, so ⌘Z can close the toast of the step it takes back. */
export const toastOfStep = new Map<number, string>()
/** What each step's Undo brings back, so ⌘Z can put focus on it too. */
export const focusOfStep = new Map<number, () => HTMLElement | null>()
/** Edits in quick succession to one thing (a View's conditions) are one step: Undo goes
 * back to before the first of them. */
let burst: { key: string; id: number; at: number; undo: Outcome["undo"] } | null = null
const burstMillis = 2000

/** How many steps Cmd/Ctrl-Z can take back. */
const depth = 30

/** After Undo, where focus goes: the given element once it is back (a restored row
 * arrives a moment later), else what had focus when the step was taken, else the screen's
 * heading. The toast's Undo button is going away, and focus must not fall to the page. */
export const refocus = (find: (() => HTMLElement | null) | undefined, origin: Element | null) => {
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
      given: Outcome,
      again: () => Promise<Outcome>,
      /** Finds what Undo brings back, to put focus on it (WKEY-03). */
      focus?: () => HTMLElement | null,
      /** Joins this step to the last one with the same key, if that was moments ago. */
      merge?: string
    ) => {
      const origin = document.activeElement
      if (given.undo.length === 0) {
        toasts.add({ description: given.message, timeout: 4000 })
        return
      }
      const now = Date.now()
      const joined =
        merge !== undefined && burst !== null && burst.key === merge && now - burst.at < burstMillis
          ? burst
          : null
      if (joined !== null) {
        // The earlier step gives way to this one, which undoes the whole burst.
        setStack((stack) => stack.filter((step) => step.id !== joined.id))
        const earlier = toastOfStep.get(joined.id)
        if (earlier !== undefined) toasts.close(earlier)
        toastOfStep.delete(joined.id)
        focusOfStep.delete(joined.id)
      }
      const outcome = joined === null ? given : { ...given, undo: joined.undo }
      const id = ++nextId
      burst = merge === undefined ? null : { key: merge, id, at: now, undo: outcome.undo }
      const step = { id, ...outcome, again }
      setStack((stack) => [...stack.slice(1 - depth), step])
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
            // Toast Undo retains the same replayable step as keyboard Undo (DATA-04).
            setRedo((stack) => [...stack, step])
            burst = null
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
      if (focus) focusOfStep.set(id, focus)
    },
    [toasts, undo, setStack, setRedo]
  )
}
