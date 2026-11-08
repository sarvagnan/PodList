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
  /** Cmd/Ctrl-C on a row with no text selected: copy that row's link. */
  readonly onCopy?: (index: number) => void
  /** The keyboard moved to another row (an open Episode follows it, as in Mail). */
  readonly onRowMove?: (index: number) => void
}

export function useRowGrid(container: RefObject<HTMLElement | null>, grid: RowGrid) {
  const active = useRef<{ row: number; cell: number | null }>({ row: 0, cell: null })
  const typed = useRef({ text: "", at: 0 })
  // The control focused in the list. If its row leaves (removed, or no longer matching
  // the View), focus goes to the row that takes its place (FLOW-02).
  const focused = useRef<HTMLElement | null>(null)

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
  useEffect(() => {
    sync()
    const lost = document.activeElement === null || document.activeElement === document.body
    if (focused.current === null || focused.current.isConnected || !lost || grid.count === 0) return
    focused.current = null
    const index = Math.min(active.current.row, grid.count - 1)
    const row = rowAt(index)
    if (row === null) return
    active.current = { row: index, cell: active.current.cell }
    const cells = visibleCells(row)
    cells[Math.min(active.current.cell ?? titleCell(row), cells.length - 1)]?.focus({
      preventScroll: true
    })
  })

  const focusCell = (row: number, cell: number | null, then?: () => void) => {
    const index = Math.max(0, Math.min(grid.count - 1, row))
    const moved = index !== active.current.row
    active.current = { row: index, cell }
    if (moved) grid.onRowMove?.(index)
    let frames = 10
    const land = () => {
      const cells = visibleCells(rowAt(index))
      // Concurrent rendering can need another frame to mount a distant virtual row.
      if (cells.length === 0 && --frames > 0) return requestAnimationFrame(land)
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

  const tick = (index: number, on = true) => {
    const box = rowAt(index)?.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (box && box.checked !== on) box.click()
  }
  // Where a Shift+arrow run started: moving away from it ticks, moving back unticks.
  const anchor = useRef<number | null>(null)

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]")
    const row = cell?.closest<HTMLElement>("[data-row]")
    if (!cell || !row || !container.current?.contains(row)) return
    active.current = { row: Number(row.dataset.row), cell: visibleCells(row).indexOf(cell) }
    focused.current = cell
    sync()
  }

  // The list went away with focus in it (its last row removed): the heading takes focus.
  useEffect(
    () => () => {
      const was = focused.current
      requestAnimationFrame(() => {
        const lost = document.activeElement === null || document.activeElement === document.body
        if (was !== null && !was.isConnected && lost) {
          document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true })
        }
      })
    },
    []
  )

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    // Focus moved elsewhere on purpose (a removed control gives no next element).
    const next = event.relatedTarget as Node | null
    if (next !== null && !container.current?.contains(next)) focused.current = null
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    // Menus and dialogs opened from a row render elsewhere; their keys are their own.
    if (!container.current?.contains(target)) return
    // A row being moved with the keyboard (components/lists/SortableRow.tsx) takes the arrows.
    if (container.current.querySelector('[aria-roledescription="sortable"][aria-pressed="true"]'))
      return
    const cell = target.closest<HTMLElement>("[data-cell]")
    const row = target.closest<HTMLElement>("[data-row]")
    if (!cell || !row) return
    const r = Number(row.dataset.row)
    const cells = visibleCells(row)
    const c = cells.indexOf(cell)
    const mod = event.metaKey || event.ctrlKey
    const vertical = (to: number) => {
      if (event.shiftKey) {
        const from = anchor.current ?? r
        anchor.current = from
        const next = Math.max(0, Math.min(grid.count - 1, to))
        // Back towards the start: the row left goes out of the run.
        if (Math.abs(next - from) < Math.abs(r - from)) tick(r, false)
        else tick(r)
        focusCell(to, c, () => tick(next))
      } else {
        anchor.current = null
        focusCell(to, c)
      }
    }
    // Type-ahead: jump to the next title starting with what was typed.
    const typeAhead = (key: string) => {
      const now = Date.now()
      const text = (now - typed.current.at < 700 ? typed.current.text : "") + key
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
    if (event.key !== "Shift" && !event.shiftKey) anchor.current = null
    switch (event.key) {
      case "Enter":
        // Enter opens the Episode from any cell that has no Enter of its own (the tick box).
        if (!(target instanceof HTMLInputElement)) return
        row.querySelector<HTMLElement>('[data-cell="title"]')?.click()
        break
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
        // Mid type-ahead ("the w"), a space is part of what's typed: fall through to it.
        if (Date.now() - typed.current.at < 700 && typed.current.text !== "") {
          typeAhead(" ")
          break
        }
        // Buttons and the tick box handle Space themselves; on the title it ticks the row.
        if (cell.dataset.cell !== "title") return
        row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click()
        break
      default: {
        if (mod && event.key.toLowerCase() === "a" && grid.onSelectAll) {
          grid.onSelectAll()
          break
        }
        if (mod && event.key.toLowerCase() === "c" && grid.onCopy) {
          // Selected text copies as usual.
          if (window.getSelection()?.isCollapsed === false) return
          grid.onCopy(r)
          break
        }
        if (mod || event.altKey || event.key.length !== 1) return
        typeAhead(event.key)
      }
    }
    event.preventDefault()
  }

  return { onKeyDown, onFocus, onBlur }
}
