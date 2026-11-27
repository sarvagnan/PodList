import { describe, expect, it, vi } from "vitest"
import { publisherMedia } from "./publisher-media.ts"

const request = (headers?: HeadersInit, resource = "/audio-download") => {
  const url = new URL(`app://podlist${resource}`)
  url.searchParams.set("url", "https://publisher.example/resource")
  return { url, input: new Request(url, headers ? { headers } : {}) }
}

describe("publisher media", () => {
  it.each(["file:///etc/hosts", "https://user:password@publisher.example/resource", "not a URL"])(
    "rejects an invalid publisher address before fetching (%s)",
    async (address) => {
      const { url } = request()
      url.searchParams.set("url", address)
      const fetcher = vi.fn(async () => new Response())
      const response = await publisherMedia(new Request(url), url, "audio", fetcher)
      expect(response.status).toBe(400)
      expect(response.body).toBeNull()
      expect(fetcher).not.toHaveBeenCalled()
    }
  )

  it("passes through byte ranges and omits Chromium cookies", async () => {
    const { url, input } = request({ range: "bytes=4-7", cookie: "outside=1" })
    const fetcher = vi.fn(
      async () =>
        new Response("2345", {
          status: 206,
          headers: {
            "content-type": "audio/mpeg",
            "content-range": "bytes 4-7/8",
            "content-length": "4",
            "set-cookie": "upstream=1"
          }
        })
    )
    const response = await publisherMedia(input, url, "audio", fetcher)
    expect(fetcher).toHaveBeenCalledWith(
      "https://publisher.example/resource",
      expect.objectContaining({
        credentials: "omit",
        headers: { range: "bytes=4-7", "accept-encoding": "identity", "user-agent": "PodList/1.0" }
      })
    )
    expect(response.status).toBe(206)
    expect(response.headers.get("content-range")).toBe("bytes 4-7/8")
    expect(response.headers.has("set-cookie")).toBe(false)
    expect(await response.text()).toBe("2345")
  })

  it("rejects unexpected content and strips upstream error bodies", async () => {
    const { url, input } = request(undefined, "/publisher/artwork")
    const fetcher = vi.fn(
      async () =>
        new Response("<script>bad()</script>", {
          headers: { "content-type": "text/html" }
        })
    )
    const response = await publisherMedia(input, url, "artwork", fetcher)
    expect(response.status).toBe(415)
    expect(response.body).toBeNull()
    fetcher.mockResolvedValueOnce(new Response("private error", { status: 403 }))
    const failed = await publisherMedia(input, url, "artwork", fetcher)
    expect(failed.status).toBe(403)
    expect(failed.body).toBeNull()
  })
})
