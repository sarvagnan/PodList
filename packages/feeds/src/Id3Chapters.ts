export interface ChapterData {
  readonly start: number
  readonly title: string
  readonly artworkUrl: string | null
  readonly url: string | null
}

/** Bytes read from the start of an MP3 when looking for ID3 chapters. */
export const id3ProbeBytes = 512 * 1024
const syncsafe = (b: Uint8Array, at: number) =>
  (((b[at] ?? 0) & 127) << 21) |
  (((b[at + 1] ?? 0) & 127) << 14) |
  (((b[at + 2] ?? 0) & 127) << 7) |
  ((b[at + 3] ?? 0) & 127)
const uint32 = (b: Uint8Array, at: number) =>
  (((b[at] ?? 0) << 24) | ((b[at + 1] ?? 0) << 16) | ((b[at + 2] ?? 0) << 8) | (b[at + 3] ?? 0)) >>>
  0
const ascii = (b: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...b.subarray(at, at + length))

/** Decodes an ID3 text frame body: one encoding byte, then the text. */
const decodeText = (body: Uint8Array): string => {
  const encoding = body[0]
  const bytes = body.subarray(1)
  const label =
    encoding === 1 ? "utf-16" : encoding === 2 ? "utf-16be" : encoding === 3 ? "utf-8" : "latin1"
  return new TextDecoder(label).decode(bytes).split("\u0000")[0] ?? ""
}

/** Chapters from the ID3v2.3/2.4 CHAP frames in the first bytes of an MP3; [] if none. */
export const fromId3 = (bytes: Uint8Array): ReadonlyArray<ChapterData> => {
  const version = bytes[3]
  // The native parser also skips unsynchronized tags and extended headers.
  if (
    bytes.length < 10 ||
    ascii(bytes, 0, 3) !== "ID3" ||
    (version !== 3 && version !== 4) ||
    ((bytes[5] ?? 0) & 0xc0) !== 0
  )
    return []
  const end = Math.min(bytes.length, id3ProbeBytes, 10 + syncsafe(bytes, 6))
  const frameSize = (at: number) => (version === 4 ? syncsafe(bytes, at) : uint32(bytes, at))
  const chapters: Array<ChapterData> = []
  let at = 10
  while (at + 10 <= end) {
    const id = ascii(bytes, at, 4)
    const size = frameSize(at + 4)
    const bodyStart = at + 10
    const bodyEnd = bodyStart + size
    if (!/^[A-Z0-9]{4}$/.test(id) || size <= 0 || bodyEnd > end) break
    const formatFlags = bytes[at + 9]
    at = bodyEnd
    if (id !== "CHAP" || formatFlags !== 0) continue
    const body = bytes.subarray(bodyStart, bodyEnd)
    const idEnd = body.indexOf(0)
    if (idEnd < 0 || idEnd + 17 > body.length) continue
    const start = uint32(body, idEnd + 1) / 1000
    let title = ""
    for (let sub = bodyStart + idEnd + 17; sub + 10 <= bodyEnd; ) {
      const subSize = frameSize(sub + 4)
      const subEnd = sub + 10 + subSize
      if (subSize <= 0 || subEnd > bodyEnd) break
      if (ascii(bytes, sub, 4) === "TIT2" && bytes[sub + 9] === 0) {
        title = decodeText(bytes.subarray(sub + 10, subEnd))
      }
      sub = subEnd
    }
    chapters.push({ start, title, artworkUrl: null, url: null })
  }
  return chapters.sort((a, b) => a.start - b.start)
}
