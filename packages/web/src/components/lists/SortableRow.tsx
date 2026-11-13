import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type * as React from "react"
import { type ReactNode, useContext, useMemo } from "react"

import { KeyboardReorderContext } from "./useKeyboardReorder.ts"

// Reordering a list by dragging its rows' handles: pointer, touch (press and hold) or
// keyboard (Space on the handle, arrows, Space again). Announcements name the rows.

export function SortableList({
  ids,
  label,
  onMove,
  children,
  onDragChange
}: {
  readonly ids: ReadonlyArray<string>
  /** Names a row for screen reader announcements. */
  readonly label: (id: string) => string
  /** The row `id` now sits right after `after` (null: first). */
  readonly onMove: (id: string, after: string | null) => void
  readonly children: ReactNode
  readonly onDragChange?: (id: string | null) => void
}) {
  const items = useMemo(() => [...ids], [ids])
  const pointer = useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  const touch = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  const sensors = useSensors(pointer, touch)
  const position = (id: string | number) => ids.indexOf(String(id)) + 1
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    onDragChange?.(null)
    if (over === null || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    const order = [...ids]
    order.splice(from, 1)
    order.splice(to, 0, String(active.id))
    onMove(String(active.id), to === 0 ? null : (order[to - 1] ?? null))
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => onDragChange?.(String(active.id))}
      onDragCancel={() => onDragChange?.(null)}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "To move this Entry, press Space, then the up and down arrows, then Space to drop it, or Escape to cancel."
        },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${label(String(active.id))}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${label(String(active.id))} is at position ${position(over.id)} of ${ids.length}.`
              : "",
          onDragEnd: ({ active, over }) =>
            over
              ? `${label(String(active.id))} moved to position ${position(over.id)} of ${ids.length}.`
              : `${label(String(active.id))} dropped.`,
          onDragCancel: ({ active }) => `Moving ${label(String(active.id))} was cancelled.`
        }
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

/** A row that can be dragged by the handle it gives its children. */
export function SortableRow({
  id,
  children
}: {
  readonly id: string
  readonly children: (sortable: {
    readonly ref: (node: HTMLElement | null) => void
    readonly style: React.CSSProperties
    readonly dragging: boolean
    readonly handle: React.HTMLAttributes<HTMLElement>
  }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  })
  const keyboardHandle = useContext(KeyboardReorderContext)?.(id)
  const dragging = isDragging || keyboardHandle?.["aria-pressed"] === true
  return children({
    ref: setNodeRef,
    style: {
      transform: CSS.Translate.toString(transform),
      transition,
      ...(isDragging ? { zIndex: 20, position: "relative" } : {})
    },
    dragging,
    handle: { ...attributes, ...listeners, ...keyboardHandle, "aria-pressed": dragging }
  })
}
