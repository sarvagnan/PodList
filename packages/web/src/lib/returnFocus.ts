// Where focus was on each history entry when it was left, to return to on Back or Forward
// (WKEY-03, KEY-04). AppShell records and restores it; a screen that would focus something
// itself on arrival (Search's field) checks first that it isn't a return.

/** What had focus on each history entry when it was left, to return to on Back. */
export const leftFrom = new Map<string, string>()

/** A selector that finds the same control again once its screen is back. */
export const selectorFor = (element: Element | null): string | null => {
  if (!(element instanceof HTMLElement) || !document.querySelector("main")?.contains(element))
    return null
  const episode = element.closest<HTMLElement>("[data-episode-title]")?.dataset.episodeTitle
  if (episode) return `[data-episode-title="${CSS.escape(episode)}"]`
  const link = element.closest("a[href]")?.getAttribute("href")
  return link ? `main a[href="${CSS.escape(link)}"]` : null
}

/** Whether arriving at this history entry is a return, with a control to put focus back on. */
export const isReturn = (key: string) => leftFrom.has(key)
