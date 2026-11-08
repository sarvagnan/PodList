import { useAtomValue } from "@effect/atom-react"
import { useEffect } from "react"
import { redoStackAtom, undoStackAtom } from "../../app/episodeActions.ts"
import { useUndoRedo } from "./useConfirm.ts"

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
  const run = useUndoRedo()

  // The Mac app's Edit menu: the next steps, and whether a text field has focus (it has
  // its own undo), so Undo and Redo are dimmed only when there's nothing to take back.
  useEffect(() => {
    const setUndoRedo = window.podlistApp?.setUndoRedo
    if (setUndoRedo === undefined) return
    const report = () => {
      const el = document.activeElement
      const editing =
        el instanceof HTMLElement &&
        (el.isContentEditable ||
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLInputElement &&
            !["checkbox", "radio", "range", "button", "file"].includes(el.type)))
      setUndoRedo(undoStack.at(-1)?.message ?? null, redoStack.at(-1)?.message ?? null, editing)
    }
    report()
    document.addEventListener("focusin", report)
    document.addEventListener("focusout", report)
    return () => {
      document.removeEventListener("focusin", report)
      document.removeEventListener("focusout", report)
    }
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
      void run(undefined, isRedo)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [run])
  return null
}
