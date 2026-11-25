import { describe, expect, it, vi } from "vitest"
import { checkServer, serverOrigin } from "./server-connection.ts"

describe("desktop server connection", () => {
  it.each([
    [" https://PODLIST.Example:443/ ", "https://podlist.example"],
    ["http://127.0.0.1:8787", "http://127.0.0.1:8787"],
    ["http://[::1]:8787", "http://[::1]:8787"]
  ])("accepts the origin %s", (address, expected) => {
    expect(serverOrigin(address)).toBe(expected)
  })

  it.each([
    "http://podlist.example",
    "https://user:password@podlist.example",
    "https://podlist.example/a",
    "https://podlist.example/ignored/..",
    "https://podlist.example/?",
    "https://podlist.example/#",
    "https://podlist.example:0"
  ])("rejects an invalid server address", (address) => {
    expect(() => serverOrigin(address)).toThrow("Enter an HTTPS server address")
  })

  it("checks the health payload without sending credentials or following redirects", async () => {
    const request = vi.fn(async () => Response.json({ status: "ok", protocolVersion: 4 }))
    expect(await checkServer("https://podlist.example", request)).toBeNull()
    expect(request).toHaveBeenCalledWith(
      "https://podlist.example/api/health",
      expect.objectContaining({ credentials: "omit", redirect: "error" })
    )
    request.mockResolvedValueOnce(new Response("<html>Not a PodList server</html>"))
    expect(await checkServer("https://podlist.example", request)).toContain("unreadable response")
    request.mockResolvedValueOnce(new Response(null, { status: 503 }))
    expect(await checkServer("https://podlist.example", request)).toContain("HTTP 503")
  })
})
