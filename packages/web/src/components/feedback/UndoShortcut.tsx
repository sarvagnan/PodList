import { Toast } from "@base-ui/react/toast"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useEffect, useRef } from "react"
import { undoAtom, undoStackAtom } from "../../app/episodeActions.ts"

const editing = (el: Element | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && !["checkbox", "radio", "range", "button"].includes(el.type)))

/** Cmd/Ctrl-Z takes back the latest step, outside text fields, which keep their own undo. */
export function UndoShortcut() {
  const stack = useAtomValue(undoStackAtom)
  const setStack = useAtomSet(undoStackAtom)
  const undo = useAtomSet(undoAtom)
  const toasts = Toast.useToastManager()
  // Read at key time, and updated at once, so quick presses each take a different step.
  const latest = useRef(stack)
  latest.current = stack
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return
      if (event.key.toLowerCase() !== "z" || editing(document.activeElement)) return
      event.preventDefault()
      const step = latest.current.at(-1)
      if (step === undefined) {
        toasts.add({ description: "Nothing to undo", timeout: 3000 })
        return
      }
      latest.current = latest.current.slice(0, -1)
      setStack(latest.current)
      undo(step.undo)
      toasts.add({ description: `Undone: ${step.message}`, timeout: 4000 })
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [setStack, undo, toasts])
  return null
}
