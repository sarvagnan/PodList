import { describe, expect, it } from "vitest"
import { parsePodListLink, podListLink, podListLinkForPath } from "./podListLink.ts"

describe("PodList links", () => {
  it("preserves the full feed address, including escaped characters and query parameters", () => {
    const link = { kind: "podcast", value: "https://example.org/p%20o?feed=a%2Fb&ref=1" } as const
    expect(parsePodListLink(podListLink(link))).toEqual(link)
  })

  it("only shares supported Library routes", () => {
    expect(podListLinkForPath("/playlists/my-list")).toBe("podlist://playlist/my-list")
    expect(podListLinkForPath("/playlists/trash")).toBeNull()
    expect(podListLinkForPath("/settings")).toBeNull()
  })

  it.each([
    "podlist://view/%",
    "podlist://view/%2E%2E",
    "podlist://episode/a%2Fb",
    "podlist://playlist/list?library=another",
    "podlist://podcast/https%3A%2F%2Fuser%3Apw%40example.org",
    "podlist://podcast/file%3A%2F%2F%2Ftmp%2Fpodcast"
  ])("rejects invalid targets (%s)", (link) => {
    expect(parsePodListLink(link)).toBeNull()
  })
})
