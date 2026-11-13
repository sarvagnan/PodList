import { XMLParser } from "fast-xml-parser"

// Parses podcast RSS (with the iTunes and Podcasting 2.0 namespaces) into the fields
// PodList stores. Items without an audio enclosure are not Episodes and are skipped.

export interface ParsedEpisode {
  /** The feed's identity for the item: its guid, else the audio URL. */
  readonly guid: string
  readonly title: string
  readonly description: string
  /** Milliseconds since the epoch; 0 when the feed gives no usable date. */
  readonly published: number
  readonly duration: number | null
  readonly audioUrl: string
  readonly artworkUrl: string | null
  /** A Podcasting 2.0 JSON chapters file, fetched separately (pod-rxi.4). */
  readonly chaptersUrl: string | null
}

export interface ParsedFeed {
  readonly title: string
  readonly author: string | null
  readonly description: string | null
  readonly artworkUrl: string | null
  readonly episodes: ReadonlyArray<ParsedEpisode>
}

export class FeedParseError extends Error {
  override readonly name = "FeedParseError"
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  htmlEntities: true,
  trimValues: true,
  isArray: (name) => name === "item"
})

type Node = Record<string, unknown>
const asNode = (value: unknown): Node | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Node) : undefined

/** The text of an element, whether it parsed as a string or as { "#text": ... }. */
const text = (value: unknown): string | null => {
  if (Array.isArray(value)) return text(value[0])
  if (typeof value === "string") return value.length > 0 ? value : null
  if (typeof value === "number") return String(value)
  const node = asNode(value)
  return node === undefined ? null : text(node["#text"])
}

const attribute = (value: unknown, name: string): string | null => {
  const node = asNode(Array.isArray(value) ? value[0] : value)
  return node === undefined ? null : text(node[`@_${name}`])
}

/** itunes:duration as seconds: "3600", "60:00", "1:00:00" or "1:00:00.5". */
export const parseDuration = (raw: string | null): number | null => {
  if (raw === null) return null
  const parts = raw.split(":").map((p) => Number(p))
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) {
    return null
  }
  return parts.reduce((total, part) => total * 60 + part, 0)
}

const parseDate = (raw: string | null): number => {
  const millis = raw === null ? Number.NaN : Date.parse(raw)
  return Number.isFinite(millis) ? millis : 0
}

/** Ignore declarations rather than registering DTD entities. Never fetch resources.
 * Quoted literals, comments and internal subsets can contain '>' or fake markup.
 * Keep CDATA and comments opaque so their contents cannot become declarations.
 */
const withoutDeclarations = (xml: string): string => {
  const chunks: Array<string> = []
  let retained = 0
  let position = 0
  const after = (marker: string, start: number): number => {
    const end = xml.indexOf(marker, start)
    if (end < 0) throw new Error("Unclosed XML token")
    return end + marker.length
  }
  while (position < xml.length) {
    const start = xml.indexOf("<", position)
    if (start < 0) break
    if (xml.startsWith("<!--", start)) position = after("-->", start + 4)
    else if (xml.startsWith("<![CDATA[", start)) position = after("]]>", start + 9)
    else if (xml.startsWith("<?", start)) position = after("?>", start + 2)
    else {
      const declaration = xml.startsWith("<!", start)
      let brackets = 0
      let quote: string | undefined
      position = start + 1
      for (; position < xml.length; position++) {
        const c = xml[position]
        if (quote !== undefined) {
          if (c === quote) quote = undefined
        } else if (declaration && xml.startsWith("<!--", position)) {
          position = after("-->", position + 4) - 1
        } else if (c === '"' || c === "'") quote = c
        else if (declaration && c === "[") brackets++
        else if (declaration && c === "]" && brackets > 0) brackets--
        else if (c === ">" && brackets === 0) break
      }
      if (position === xml.length) throw new Error("Unclosed XML token")
      position++
      if (declaration) {
        chunks.push(xml.slice(retained, start))
        retained = position
      }
    }
  }
  if (retained === 0) return xml
  chunks.push(xml.slice(retained))
  return chunks.join("")
}

export const parseFeed = (xml: string): ParsedFeed => {
  let document: Node
  try {
    if (Buffer.byteLength(xml, "utf8") > 32 * 1024 * 1024) throw new Error("XML is too large")
    document = parser.parse(withoutDeclarations(xml)) as Node
  } catch (cause) {
    throw new FeedParseError(`Not valid XML: ${String(cause)}`)
  }
  const channel = asNode(asNode(document.rss)?.channel)
  if (channel === undefined) throw new FeedParseError("Not an RSS feed: no <rss><channel>")
  const title = text(channel.title)
  if (title === null) throw new FeedParseError("The feed has no title")

  const items = Array.isArray(channel.item) ? (channel.item as Array<unknown>) : []
  const episodes = items.flatMap((raw): Array<ParsedEpisode> => {
    const item = asNode(raw)
    const audioUrl = attribute(item?.enclosure, "url")
    if (item === undefined || audioUrl === null) return []
    const guid = text(item.guid) ?? audioUrl
    return [
      {
        guid,
        title: text(item.title) ?? text(item["itunes:title"]) ?? "Untitled episode",
        description:
          text(item["content:encoded"]) ??
          text(item.description) ??
          text(item["itunes:summary"]) ??
          "",
        published: parseDate(text(item.pubDate)),
        duration: parseDuration(text(item["itunes:duration"])),
        audioUrl,
        artworkUrl: attribute(item["itunes:image"], "href"),
        chaptersUrl: attribute(item["podcast:chapters"], "url")
      }
    ]
  })

  return {
    title,
    author: text(channel["itunes:author"]) ?? text(channel["itunes:owner"]),
    description: text(channel.description) ?? text(channel["itunes:summary"]),
    artworkUrl: attribute(channel["itunes:image"], "href") ?? text(asNode(channel.image)?.url),
    episodes
  }
}
