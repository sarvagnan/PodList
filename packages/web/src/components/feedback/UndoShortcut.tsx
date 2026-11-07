import { Toast } from "@base-ui/react/toast"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useEffect, useRef } from "react"
import { redoStackAtom, undoAtom, undoStackAtom } from "../../app/episodeActions.ts"

const editing = (el: Element | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && !["checkbox", "radio", "range", "button"].includes(el.type)))

/**
 * Cmd/Ctrl-Z takes back the latest step and Cmd/Ctrl-Shift-Z (or Ctrl-Y) does it again,
 * outside text fields, which keep their own undo. In the Mac app, Edit › Undo and Redo
 * name the step they will act on.
 */
export function UndoShortcut() {
  const undoStack = useAtomValue(undoStackAtom)
  const redoStack = useAtomValue(redoStackAtom)
  const setUndo = useAtomSet(undoStackAtom)
  const setRedo = useAtomSet(redoStackAtom)
  const undo = useAtomSet(undoAtom)
  const toasts = Toast.useToastManager()
  // Read at key time, and updated at once, so quick presses each take a different step.
  const latest = useRef({ undo: undoStack, redo: redoStack })
  latest.current = { undo: undoStack, redo: redoStack }

  useEffect(() => {
    window.podlistApp?.setUndoRedo?.(
      undoStack.at(-1)?.message ?? null,
      redoStack.at(-1)?.message ?? null
    )
  }, [undoStack, redoStack])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key.toLowerCase()
      const isRedo =
        (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey && !event.shiftKey)
      const isUndo = key === "z" && !event.shiftKey
      if ((!isUndo && !isRedo) || editing(document.activeElement)) return
      event.preventDefault()
      const { undo: done, redo: undone } = latest.current
      if (isUndo) {
        const step = done.at(-1)
        if (step === undefined) {
          toasts.add({ description: "Nothing to undo", timeout: 3000 })
          return
        }
        latest.current = { undo: done.slice(0, -1), redo: [...undone, step] }
        setUndo(latest.current.undo)
        setRedo(latest.current.redo)
        undo(step.undo)
        toasts.add({ description: `Undone: ${step.message}`, timeout: 4000 })
        return
      }
      const step = undone.at(-1)
      if (step === undefined) {
        toasts.add({ description: "Nothing to redo", timeout: 3000 })
        return
      }
      latest.current = { undo: done, redo: undone.slice(0, -1) }
      setRedo(latest.current.redo)
      void step.again().then((outcome) => {
        setUndo((stack) => [...stack, { ...step, undo: outcome.undo }])
        toasts.add({ description: `Redone: ${step.message}`, timeout: 4000 })
      })
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [setUndo, setRedo, undo, toasts])
  return null
}
