export interface NotePart {
  readonly text: string
  readonly href: string | null
}

/** Only absolute web and email links survive. No feed attributes or HTML are rendered. */
const safeLink = (href: string | null): string | null => {
  if (!href) return null
  try {
    const url = new URL(href)
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

/** Parse inert feed HTML into paragraphs of text and safe links for React to render. */
export const showNotes = (html: string): ReadonlyArray<ReadonlyArray<NotePart>> => {
  const marked = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
  const body = new DOMParser().parseFromString(marked, "text/html").body
  for (const element of body.querySelectorAll(
    "script, style, noscript, template, iframe, object, svg, math"
  ))
    element.remove()
  const paragraphs: Array<Array<NotePart>> = [[]]
  const visit = (node: Node, href: string | null) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const pieces = (node.textContent ?? "").split(/\n\s*\n/)
      pieces.forEach((text, i) => {
        if (i > 0) paragraphs.push([])
        if (text)
          paragraphs[paragraphs.length - 1]?.push({ text: text.replace(/[ \t]+/g, " "), href })
      })
      return
    }
    const link = node instanceof HTMLAnchorElement ? safeLink(node.getAttribute("href")) : href
    for (const child of node.childNodes) visit(child, link)
  }
  visit(body, null)
  return paragraphs
    .map((parts) => {
      // Trim the paragraph, retaining spaces between linked and unlinked words.
      while (parts.length && !parts[0]?.text.trimStart()) parts.shift()
      while (parts.length && !parts[parts.length - 1]?.text.trimEnd()) parts.pop()
      return parts.map((part, i) => ({
        ...part,
        text:
          i === 0 && i === parts.length - 1
            ? part.text.trim()
            : i === 0
              ? part.text.trimStart()
              : i === parts.length - 1
                ? part.text.trimEnd()
                : part.text
      }))
    })
    .filter((parts) => parts.length > 0)
}

export const showNotesText = (html: string): ReadonlyArray<string> =>
  showNotes(html).map((parts) => parts.map((part) => part.text).join(""))
