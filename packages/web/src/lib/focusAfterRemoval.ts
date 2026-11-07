// One rule for focus when the control that has it is about to go (WKEY-03): the same
// control in the next row, else in the previous row, else the screen's heading, so focus
// never falls to the page. Call it before the row is removed.

const heading = () => document.querySelector<HTMLElement>("[data-sheet] h2, main h1")

export const focusAfterRemoval = (control: HTMLElement, sameControl?: string) => {
  const peers = sameControl ? [...document.querySelectorAll<HTMLElement>(sameControl)] : []
  const index = peers.indexOf(control)
  const next = index >= 0 ? (peers[index + 1] ?? peers[index - 1]) : undefined
  // After the removal has rendered: the next row may now sit where this one was.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (document.activeElement !== null && document.activeElement !== document.body) {
        if (document.activeElement.isConnected && document.activeElement !== control) return
      }
      const target =
        next?.isConnected === true
          ? next
          : sameControl
            ? (document.querySelector<HTMLElement>(sameControl) ?? heading())
            : heading()
      target?.focus({ preventScroll: true })
    })
  )
}
