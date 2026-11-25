import { describe, expect, it, vi } from "@effect/vitest"
import { publisherFeeds } from "@podlist/feeds/publisher"

const feed =
  '<rss><channel><title>Test Feed</title><item><title>Episode</title><guid>one</guid><enclosure url="https://example.com/one.mp3" /></item></channel></rss>'

describe("publisher feeds", () => {
  it("reads RSS without credentials and returns validators for the next check", async () => {
    const fetch = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(feed, {
          headers: { etag: '"version1"', "last-modified": "Mon, 23 Nov 2026 00:00:00 GMT" }
        })
    )
    const publisher = publisherFeeds(fetch)
    expect(await publisher.read("https://example.com/feed")).toMatchObject({
      kind: "updated",
      feed: { title: "Test Feed", episodes: [{ guid: "one" }] },
      validators: { etag: '"version1"', lastModified: "Mon, 23 Nov 2026 00:00:00 GMT" }
    })
    fetch.mockResolvedValueOnce(new Response(null, { status: 304 }))
    expect(
      await publisher.read("https://example.com/feed", { etag: '"version1"', lastModified: null })
    ).toEqual({
      kind: "notModified"
    })
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      credentials: "omit",
      headers: { "if-none-match": '"version1"' }
    })
  })

  it("validates redirects before issuing the next request", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: "https://user@example.com/feed" } })
    )
    await expect(publisherFeeds(fetch).read("https://example.com/feed")).rejects.toThrow(
      "feed address"
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("uses Apple's public directory for names and reads addresses directly", async () => {
    const fetch = vi.fn(async (_url: string) =>
      Response.json({
        results: [
          { collectionName: "Test Feed", feedUrl: "https://example.com/feed" },
          { collectionName: "Duplicate", feedUrl: "https://example.com/feed" },
          { collectionName: "No feed" }
        ]
      })
    )
    const publisher = publisherFeeds(fetch)
    expect(await publisher.search(" test & more ")).toMatchObject([
      { title: "Test Feed", feedUrl: "https://example.com/feed", source: "itunes" }
    ])
    const url = new URL(fetch.mock.calls[0]?.[0] ?? "")
    expect(url.origin).toBe("https://itunes.apple.com")
    expect(url.searchParams.get("term")).toBe("test & more")
    fetch.mockResolvedValueOnce(new Response(feed))
    expect(await publisher.search("https://example.com/feed")).toMatchObject([
      { title: "Test Feed", feedUrl: "https://example.com/feed", source: "feed" }
    ])
    expect(fetch.mock.calls[1]?.[0]).toBe("https://example.com/feed")
  })
})
