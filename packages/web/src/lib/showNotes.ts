/**
 * Show notes as plain paragraphs. Feed HTML is never rendered: it is parsed into an
 * inert document (no scripts run, nothing loads) and only its text is kept.
 */
export const showNotesText = (html: string): ReadonlyArray<string> => {
  const marked = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
  const body = new DOMParser().parseFromString(marked, "text/html").body
  for (const element of body.querySelectorAll("script, style, noscript, template")) element.remove()
  const text = body.textContent ?? ""
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter((p) => p.length > 0)
}
