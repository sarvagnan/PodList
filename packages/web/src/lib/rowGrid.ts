import { type FocusEvent, type KeyboardEvent, type RefObject, useEffect, useRef } from "react"

// Keyboarding for a long list of rows with several controls each (LIST-07, APG grid):
// one Tab stop for the whole list; arrows move between rows and between a row's
// controls; Home/End, PageUp/PageDown; Space ticks the row; Shift+arrows extend the
// ticks; Cmd/Ctrl-A ticks all; typing jumps to a title. Rows may be virtualised, so a row
// is found by its index and scrolled into view before it is focused.
//
// Markup: each row has `data-row={index}`; each control in it `data-cell`; the title
// `data-cell="title"`; a row's tick box is its `input[type=checkbox]`.

const visibleCells = (row: Element | null | undefined) =>
  row
    ? [...row.querySelectorAll<HTMLElement>("[data-cell]")].filter(
        (el) => el.getClientRects().length > 0
      )
    : []

const titleCell = (row: Element | null | undefined) =>
  Math.max(
    0,
    visibleCells(row).findIndex((el) => el.dataset.cell === "title")
  )

export interface RowGrid {
  readonly count: number
  readonly scrollToIndex: (index: number) => void
  /** For type-ahead. */
  readonly titleAt: (index: number) => string
  readonly onSelectAll?: () => void
}

export function useRowGrid(container: RefObject<HTMLElement | null>, grid: RowGrid) {
  const active = useRef<{ row: number; cell: number | null }>({ row: 0, cell: null })
  const typed = useRef({ text: "", at: 0 })

  const rowAt = (index: number) =>
    container.current?.querySelector<HTMLElement>(`[data-row="${index}"]`) ?? null

  /** Exactly one control in the list is in the Tab order: the last one used. */
  const sync = () => {
    const root = container.current
    if (!root) return
    for (const el of root.querySelectorAll<HTMLElement>("[data-cell]")) el.tabIndex = -1
    const row = rowAt(active.current.row) ?? root.querySelector<HTMLElement>("[data-row]")
    const cells = visibleCells(row)
    const index = Math.min(active.current.cell ?? titleCell(row), cells.length - 1)
    const target = cells[index]
    if (target) target.tabIndex = 0
  }
  useEffect(sync)

  const focusCell = (row: number, cell: number | null, then?: () => void) => {
    const index = Math.max(0, Math.min(grid.count - 1, row))
    active.current = { row: index, cell }
    const land = () => {
      const cells = visibleCells(rowAt(index))
      const target = cells[Math.min(cell ?? titleCell(rowAt(index)), cells.length - 1)]
      sync()
      target?.focus()
      then?.()
    }
    if (rowAt(index)) land()
    else {
      grid.scrollToIndex(index)
      requestAnimationFrame(() => requestAnimationFrame(land))
    }
  }

  const tick = (index: number) => {
    const box = rowAt(index)?.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (box && !box.checked) box.click()
  }

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]")
    const row = cell?.closest<HTMLElement>("[data-row]")
    if (!cell || !row || !container.current?.contains(row)) return
    active.current = { row: Number(row.dataset.row), cell: visibleCells(row).indexOf(cell) }
    sync()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    // Menus and dialogs opened from a row render elsewhere; their keys are their own.
    if (!container.current?.contains(target)) return
    const cell = target.closest<HTMLElement>("[data-cell]")
    const row = target.closest<HTMLElement>("[data-row]")
    if (!cell || !row) return
    const r = Number(row.dataset.row)
    const cells = visibleCells(row)
    const c = cells.indexOf(cell)
    const mod = event.metaKey || event.ctrlKey
    const vertical = (to: number) => {
      if (event.shiftKey) {
        tick(r)
        focusCell(to, c, () => tick(Math.max(0, Math.min(grid.count - 1, to))))
      } else focusCell(to, c)
    }
    switch (event.key) {
      case "ArrowDown":
        vertical(r + 1)
        break
      case "ArrowUp":
        vertical(r - 1)
        break
      case "PageDown":
        vertical(r + 10)
        break
      case "PageUp":
        vertical(r - 10)
        break
      case "ArrowRight":
        focusCell(r, Math.min(c + 1, cells.length - 1))
        break
      case "ArrowLeft":
        focusCell(r, Math.max(c - 1, 0))
        break
      case "Home":
        if (mod) focusCell(0, c)
        else focusCell(r, 0)
        break
      case "End":
        if (mod) focusCell(grid.count - 1, c)
        else focusCell(r, cells.length - 1)
        break
      case " ":
        // Buttons and the tick box handle Space themselves; on the title it ticks the row.
        if (cell.dataset.cell !== "title") return
        row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click()
        break
      default: {
        if (mod && event.key.toLowerCase() === "a" && grid.onSelectAll) {
          grid.onSelectAll()
          break
        }
        if (mod || event.altKey || event.key.length !== 1) return
        // Type-ahead: jump to the next title starting with what was typed.
        const now = Date.now()
        const text = (now - typed.current.at < 700 ? typed.current.text : "") + event.key
        typed.current = { text: text.toLowerCase(), at: now }
        const start = text.length > 1 ? r : r + 1
        for (let step = 0; step < grid.count; step++) {
          const i = (start + step) % grid.count
          if (grid.titleAt(i).toLowerCase().startsWith(typed.current.text)) {
            focusCell(i, c)
            break
          }
        }
      }
    }
    event.preventDefault()
  }

  return { onKeyDown, onFocus }
}
