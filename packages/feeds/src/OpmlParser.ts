import { SaxesParser } from "saxes"

/** The OPML outlines in document order. XML validation and entity decoding happen
 * while walking the file, without allocating a DOM or retaining unrelated elements. */
export const parseOpml = (xml: string) => {
  const parser = new SaxesParser({ xmlns: true })
  const stack: string[] = []
  const podcasts = new Map<string, { feedUrl: string; title: string }>()
  let bodyDepth = 0
  let hasBody = false
  parser.on("opentag", (tag) => {
    const parent = stack.at(-1)
    if ((parent === undefined && tag.name !== "opml") || tag.local === "parsererror")
      throw new Error("Invalid OPML element")
    if (tag.local === "body") {
      bodyDepth++
      hasBody ||= parent === "opml"
    }
    if (bodyDepth > 0 && tag.local === "outline") {
      const feedUrl = tag.attributes.xmlUrl?.value.trim()
      if (feedUrl && !podcasts.has(feedUrl)) {
        podcasts.set(feedUrl, {
          feedUrl,
          title: tag.attributes.text?.value || tag.attributes.title?.value || feedUrl
        })
      }
    }
    stack.push(tag.local)
  })
  parser.on("closetag", (tag) => {
    if (tag.local === "body") bodyDepth--
    stack.pop()
  })
  parser.write(xml).close()
  if (!hasBody) throw new Error("Missing OPML body")
  return [...podcasts.values()]
}
