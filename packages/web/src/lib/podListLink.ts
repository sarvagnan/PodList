export interface PodListLink {
  readonly kind: "episode" | "playlist" | "view" | "podcast"
  readonly value: string
}

/** A feed address is staged exactly as entered, so the Library can match its identity. */
export function feedAddress(input: string): string | null {
  const value = input.trim()
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return null
  try {
    const url = new URL(value)
    return url.hostname && !url.username && !url.password ? value : null
  } catch {
    return null
  }
}

const validId = (value: string) =>
  value !== "" &&
  value !== "." &&
  value !== ".." &&
  !value.includes("/") &&
  !value.includes("\\") &&
  !Array.from(value).some((char) => char.charCodeAt(0) < 32)

export function parsePodListLink(input: string): PodListLink | null {
  if (input.length > 16384) return null
  const match = /^podlist:\/\/(episode|playlist|view|podcast)\/([^/?#]+)$/i.exec(input)
  if (!match?.[1] || !match[2]) return null
  try {
    const kind = match[1].toLowerCase()
    const value = decodeURIComponent(match[2])
    if (kind === "podcast") return feedAddress(value) === value ? { kind, value } : null
    if ((kind === "episode" || kind === "playlist" || kind === "view") && validId(value))
      return { kind, value }
  } catch {
    // A malformed percent escape has no Library destination.
  }
  return null
}

export const podListLink = (link: PodListLink) =>
  `podlist://${link.kind}/${encodeURIComponent(link.value)}`

export function podListLinkForPath(path: string) {
  const match = /^\/(episodes|playlists|views)\/([^/?#]+)$/.exec(path)
  if (!match?.[1] || !match[2]) return null
  if (match[1] === "playlists" && match[2] === "trash") return null
  const candidate = `podlist://${match[1].slice(0, -1)}/${match[2]}`
  const parsed = parsePodListLink(candidate)
  return parsed && podListLink(parsed)
}

/** A browser link drag can carry a URI list with comments, or only plain text. */
export function droppedFeedAddress(data: Pick<DataTransfer, "getData">): string | null {
  const links = data.getData("text/uri-list").split(/\r?\n/)
  const first = links.find((line) => line.trim() && !line.trimStart().startsWith("#"))
  return feedAddress(first ?? data.getData("text/plain"))
}
