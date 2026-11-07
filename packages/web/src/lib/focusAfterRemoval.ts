// One rule for focus when the control that has it is about to go (WKEY-03): the same
// control in the next row, else in the previous row, else the screen's heading, so focus
// never falls to the page. Call it before the row is removed.

const heading = () => document.querySelector<HTMLElement>("[data-sheet] h2, main h1")

export const focusAfterRemoval = (
  control: HTMLElement,
  sameControl?: string,
  /** Where focus goes when no peer is left, before the heading (a restored Playlist). */
  fallback?: () => HTMLElement | null
) => {
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
          : ((sameControl ? document.querySelector<HTMLElement>(sameControl) : null) ??
            fallback?.() ??
            heading())
      target?.focus({ preventScroll: true })
    })
  )
}

/**
 * A bulk action may take its rows out of the list, and the bar that ran it with them: focus
 * goes to the row now where the first of them was, else the last row, else the heading.
 * Call it before the action; it acts only if focus has been lost.
 */
export const focusAfterRowsGo = (episodeIds: ReadonlyArray<string>) => {
  const titles = () => [...document.querySelectorAll<HTMLElement>("main [data-episode-title]")]
  const gone = new Set(episodeIds)
  const before = titles()
  const first = before.findIndex((t) => gone.has(t.dataset.episodeTitle ?? ""))
  // Rows before the first one taken stay; the one after it takes its place.
  const kept = before.filter((t) => !gone.has(t.dataset.episodeTitle ?? ""))
  const after =
    first < 0 ? [] : before.slice(first).filter((t) => !gone.has(t.dataset.episodeTitle ?? ""))
  const wanted = after[0]?.dataset.episodeTitle ?? kept.at(-1)?.dataset.episodeTitle
  const control = document.activeElement
  // The rows leave when the list next reads the Library, a few frames on: watch for a
  // second, and step in only if focus falls to the page.
  return () => {
    let frames = 60
    const watch = () => {
      const active = document.activeElement
      const lost = active === null || active === document.body || !active.isConnected
      if (!lost) {
        // Still on the control that acted (it may yet go), else the person moved on.
        if (active === control && --frames > 0) requestAnimationFrame(watch)
        return
      }
      const target =
        (wanted === undefined
          ? undefined
          : titles().find((t) => t.dataset.episodeTitle === wanted)) ??
        titles()[Math.max(0, first)] ??
        heading()
      target?.focus({ preventScroll: true })
    }
    requestAnimationFrame(watch)
  }
}
