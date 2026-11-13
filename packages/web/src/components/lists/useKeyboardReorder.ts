import { createContext, type HTMLAttributes, useEffect, useId, useRef, useState } from "react"

type Drag = { readonly id: string; readonly original: readonly string[]; readonly order: string[] }
export const KeyboardReorderContext = createContext<
  ((id: string) => HTMLAttributes<HTMLElement>) | null
>(null)

/** Keyboard moves are intentions in list order, independent of animation and measurement.
 * Keep the current order in a ref: several keys can arrive before React paints a frame. */
export function useKeyboardReorder({
  ids,
  label,
  onMove,
  enabled
}: {
  readonly ids: readonly string[]
  readonly label: (id: string) => string
  readonly onMove: (id: string, after: string | null) => void
  readonly enabled: boolean
}) {
  const instructions = useId()
  const current = useRef<Drag | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [announcement, announce] = useState("")
  const finish = (cancel: boolean) => {
    const moving = current.current
    if (!moving) return
    current.current = null
    setDrag(null)
    const index = moving.order.indexOf(moving.id)
    if (!cancel && !moving.order.every((id, i) => id === moving.original[i]))
      onMove(moving.id, moving.order[index - 1] ?? null)
    announce(
      cancel
        ? `Moving ${label(moving.id)} was cancelled.`
        : `${label(moving.id)} moved to position ${index + 1} of ${ids.length}.`
    )
  }
  useEffect(() => {
    const moving = current.current
    if (
      moving &&
      (ids.length !== moving.original.length || ids.some((id, i) => id !== moving.original[i]))
    ) {
      current.current = null
      setDrag(null)
      announce(`Moving ${label(moving.id)} was cancelled because the list changed.`)
    }
  }, [ids, label])
  const handle = (id: string): HTMLAttributes<HTMLElement> => ({
    "aria-pressed": drag?.id === id,
    "aria-describedby": instructions,
    onPointerDownCapture: () => finish(true),
    onKeyDown: (event) => {
      if (!enabled) return
      const moving = current.current
      if (moving === null) {
        if (event.code !== "Space" && event.code !== "Enter") return
        event.preventDefault()
        event.stopPropagation()
        const next = { id, original: ids, order: [...ids] }
        current.current = next
        setDrag(next)
        announce(`Picked up ${label(id)}.`)
        return
      }
      if (moving.id !== id) return
      if (!["Space", "Enter", "Escape", "Tab", "ArrowDown", "ArrowUp"].includes(event.code)) return
      event.preventDefault()
      event.stopPropagation()
      if (
        event.code === "Space" ||
        event.code === "Enter" ||
        event.code === "Escape" ||
        event.code === "Tab"
      ) {
        finish(event.code === "Escape" || event.code === "Tab")
        return
      }
      const from = moving.order.indexOf(id)
      const to = Math.max(0, Math.min(ids.length - 1, from + (event.code === "ArrowDown" ? 1 : -1)))
      if (from === to) return
      const order = [...moving.order]
      order.splice(from, 1)
      order.splice(to, 0, id)
      const next = { ...moving, order }
      current.current = next
      setDrag(next)
      announce(`${label(id)} is at position ${to + 1} of ${ids.length}.`)
    }
  })
  return { ids: drag?.order ?? ids, active: drag?.id ?? null, handle, announcement, instructions }
}
