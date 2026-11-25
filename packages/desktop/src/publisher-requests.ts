import { publisherFeeds } from "@podlist/feeds/publisher"

// Node's fetch has no Chromium session cookies and exposes redirect responses to the
// publisher reader. The reader validates each destination and bounds the response.
const publisher = publisherFeeds((url, options) => fetch(url, options))

export const publisherRequest = async (request: Request, url: URL) => {
  if (request.method !== "GET") return new Response(null, { status: 405 })
  const value = url.searchParams.get("value")
  if (!value || value.length > 8192) return new Response(null, { status: 400 })
  try {
    if (url.pathname === "/publisher/search")
      return Response.json(await publisher.search(value, request.signal))
    if (url.pathname === "/publisher/chapters")
      return Response.json(await publisher.chapters(value, request.signal))
    if (url.pathname === "/publisher/read") {
      const etag = url.searchParams.get("etag")
      const lastModified = url.searchParams.get("lastModified")
      return Response.json(await publisher.read(value, { etag, lastModified }, request.signal))
    }
    return new Response(null, { status: 404 })
  } catch {
    return Response.json(
      {
        message:
          url.pathname === "/publisher/search" && !/^https?:\/\//i.test(value)
            ? "Could not reach the podcast directory. Try again."
            : "Could not read the feed. Check the address and try again."
      },
      { status: 502 }
    )
  }
}
