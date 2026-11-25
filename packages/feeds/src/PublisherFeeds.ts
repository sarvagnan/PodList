import { feedSizeLimit, type ParsedFeed, parseFeed } from "./FeedParser.ts"

import { conditionalFeedHeaders, type FeedValidators } from "./FeedPolling.ts"

export type { FeedValidators } from "./FeedPolling.ts"

export type FeedRead =
  | { readonly kind: "notModified" }
  | {
      readonly kind: "updated"
      readonly feed: ParsedFeed
      readonly validators: FeedValidators
    }

export interface DirectoryPodcast {
  readonly title: string
  readonly author: string | null
  readonly feedUrl: string
  readonly artworkUrl: string | null
  readonly source: "itunes" | "feed"
}

/** A fetch implementation supplied by the desktop host. */
export type PublisherFetch = (url: string, init: RequestInit) => Promise<Response>

const directoryUrl = "https://itunes.apple.com/search"
const directorySizeLimit = 2 * 1024 * 1024
const maxRedirects = 5
const redirectStatuses = new Set([301, 302, 303, 307, 308])

const publisherUrl = (address: string) => {
  const url = new URL(address)
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Enter an HTTP or HTTPS feed address.")
  url.hash = ""
  return url
}

const boundedText = async (response: Response, limit: number) => {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("The publisher sent an empty response.")
  const decoder = new TextDecoder("utf-8", { fatal: true })
  const chunks: Array<string> = []
  let size = 0
  let complete = false
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) throw new Error("Publisher response is too large.")
      chunks.push(decoder.decode(value, { stream: true }))
    }
    chunks.push(decoder.decode())
    complete = true
    return chunks.join("")
  } finally {
    if (!complete) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

const nonEmpty = (value: unknown) => (typeof value === "string" && value.trim() ? value : null)

const directoryResults = (body: unknown): ReadonlyArray<DirectoryPodcast> => {
  if (!body || typeof body !== "object" || !("results" in body) || !Array.isArray(body.results))
    throw new Error("The podcast directory returned an invalid response.")
  const results = new Map<string, DirectoryPodcast>()
  for (const row of body.results as ReadonlyArray<unknown>) {
    if (!row || typeof row !== "object") continue
    const item = row as Record<string, unknown>
    const feedUrl = nonEmpty(item.feedUrl)
    if (!feedUrl) continue
    try {
      publisherUrl(feedUrl)
    } catch {
      continue
    }
    if (!results.has(feedUrl)) {
      results.set(feedUrl, {
        feedUrl,
        title: nonEmpty(item.collectionName) ?? feedUrl,
        author: nonEmpty(item.artistName),
        artworkUrl: nonEmpty(item.artworkUrl600) ?? nonEmpty(item.artworkUrl100),
        source: "itunes"
      })
    }
  }
  return [...results.values()]
}

export const requestPublisher = async (
  fetch: PublisherFetch,
  address: string,
  headers: Record<string, string>,
  cancel?: AbortSignal,
  timeoutMillis: number | null = 30_000
) => {
  const timeout = timeoutMillis === null ? undefined : AbortSignal.timeout(timeoutMillis)
  const signal = cancel && timeout ? AbortSignal.any([cancel, timeout]) : (cancel ?? timeout)
  let url = publisherUrl(address)
  for (let redirects = 0; ; redirects++) {
    const response = await fetch(url.href, {
      cache: "no-store",
      credentials: "omit",
      headers: { ...headers, "user-agent": "PodList/1.0" },
      redirect: "manual",
      ...(signal ? { signal } : {})
    })
    if (!redirectStatuses.has(response.status)) return response
    const location = response.headers.get("location")
    await response.body?.cancel()
    if (!location || redirects >= maxRedirects)
      throw new Error("The publisher redirected too many times.")
    const next = publisherUrl(new URL(location, url).href)
    // Feed validators describe the previous resource. Keep them on same-origin redirects.
    if (next.origin !== url.origin) headers = {}
    url = next
  }
}

export const publisherFeeds = (fetch: PublisherFetch) => {
  const read = async (
    feedUrl: string,
    validators?: FeedValidators,
    signal?: AbortSignal
  ): Promise<FeedRead> => {
    const headers = conditionalFeedHeaders(validators)
    const response = await requestPublisher(fetch, feedUrl, headers, signal)
    if (response.status === 304 && Object.keys(headers).length > 0) return { kind: "notModified" }
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error("Could not read the feed. Try again.")
    }
    return {
      kind: "updated",
      feed: parseFeed(await boundedText(response, feedSizeLimit)),
      validators: {
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified")
      }
    }
  }

  const search = async (
    query: string,
    signal?: AbortSignal
  ): Promise<ReadonlyArray<DirectoryPodcast>> => {
    const text = query.trim()
    if (!text) return []
    if (/^https?:\/\//i.test(text)) {
      const result = await read(text, undefined, signal)
      if (result.kind !== "updated") return []
      const { title, author, artworkUrl } = result.feed
      return [{ title, author, artworkUrl, feedUrl: text, source: "feed" }]
    }
    const url = new URL(directoryUrl)
    url.search = new URLSearchParams({
      media: "podcast",
      entity: "podcast",
      limit: "30",
      term: text
    }).toString()
    const response = await requestPublisher(fetch, url.href, {}, signal)
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error("Could not reach the podcast directory. Try again.")
    }
    return directoryResults(JSON.parse(await boundedText(response, directorySizeLimit)))
  }

  const chapters = async (address: string, signal?: AbortSignal) => {
    const response = await requestPublisher(fetch, address, {}, signal)
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error("Could not read Chapters. Try again.")
    }
    const body: unknown = JSON.parse(await boundedText(response, directorySizeLimit))
    if (!body || typeof body !== "object" || !("chapters" in body) || !Array.isArray(body.chapters))
      throw new Error("The publisher returned invalid Chapters.")
    return (body.chapters as ReadonlyArray<unknown>)
      .flatMap((row) => {
        if (!row || typeof row !== "object") return []
        const chapter = row as Record<string, unknown>
        if (
          chapter.toc === false ||
          typeof chapter.startTime !== "number" ||
          !Number.isFinite(chapter.startTime)
        )
          return []
        const artwork = nonEmpty(chapter.img)
        return [
          {
            start: Math.max(0, chapter.startTime),
            title: nonEmpty(chapter.title) ?? "",
            artwork: artwork ? { url: artwork } : null,
            url: nonEmpty(chapter.url)
          }
        ]
      })
      .sort((left, right) => left.start - right.start)
  }

  return { read, search, chapters }
}
