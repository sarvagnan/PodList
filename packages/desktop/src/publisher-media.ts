import { type PublisherFetch, publisherUrl, requestPublisher } from "@podlist/feeds/publisher"

const audioType =
  /^(?:audio\/|video\/|(?:application|binary)\/octet-stream\b|application\/(?:mp4|ogg)\b)/i
const imageType = /^image\//i
const imageLimit = 16 * 1024 * 1024

/** Deliver publisher bytes to the app without exposing publisher HTTP headers or error bodies. */
export const publisherMedia = async (
  request: Request,
  url: URL,
  kind: "audio" | "artwork",
  fetcher: PublisherFetch = fetch
) => {
  if (request.method !== "GET") return new Response(null, { status: 405 })
  const value = url.searchParams.get("url")
  if (!value || value.length > 8192) return new Response(null, { status: 400 })
  let address: URL
  try {
    address = publisherUrl(value)
  } catch {
    return new Response(null, { status: 400 })
  }

  const requestHeaders: Record<string, string> = { "accept-encoding": "identity" }
  const range = request.headers.get("range")
  if (kind === "audio" && range) {
    if (!/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return new Response(null, { status: 416 })
    requestHeaders.range = range
  }
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 30_000)
  try {
    const upstream = await requestPublisher(
      fetcher,
      address.href,
      requestHeaders,
      AbortSignal.any([request.signal, timeout.signal]),
      kind === "artwork" ? 30_000 : null
    )
    const type = upstream.headers.get("content-type") ?? ""
    const allowed = kind === "audio" ? type === "" || audioType.test(type) : imageType.test(type)
    if (!upstream.ok || !allowed) {
      await upstream.body?.cancel()
      return new Response(null, { status: upstream.ok ? 415 : upstream.status })
    }
    const headers = new Headers({
      "content-type": type || "application/octet-stream",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff"
    })
    for (const key of ["cache-control", "accept-ranges", "content-range"]) {
      const value = upstream.headers.get(key)
      if (value) headers.set(key, value)
    }
    const length = upstream.headers.get("content-length")
    if (kind === "artwork" && length && Number(length) > imageLimit) {
      await upstream.body?.cancel()
      return new Response(null, { status: 413 })
    }
    if (length && !upstream.headers.has("content-encoding")) headers.set("content-length", length)
    let body = upstream.body
    if (kind === "artwork" && body) {
      let bytes = 0
      body = body.pipeThrough(
        new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>({
          transform(chunk, controller) {
            bytes += chunk.byteLength
            if (bytes > imageLimit) controller.error(new Error("Artwork is too large."))
            else controller.enqueue(chunk)
          }
        })
      )
    }
    return new Response(body, { headers, status: upstream.status })
  } catch {
    return Response.error()
  } finally {
    clearTimeout(timer)
  }
}
