import type { KeyboardEvent } from "react"

const tabbableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab inside a modal surface: past the last control it wraps to the first, and
 * Shift+Tab from the first to the last (WKEY-03). Base UI's own guard after the
 * drawer's last control lets focus fall to the page.
 */
export const wrapTab = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== "Tab" || event.defaultPrevented) return
  const tabbable = [...event.currentTarget.querySelectorAll<HTMLElement>(tabbableSelector)].filter(
    (el) => el.tabIndex >= 0 && el.getClientRects().length > 0
  )
  const first = tabbable[0]
  const last = tabbable.at(-1)
  if (first === undefined || last === undefined) return
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  }
}
