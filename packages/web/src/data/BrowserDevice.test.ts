import { describe, expect, it } from "vitest"
import { BrowserDevice } from "./BrowserDevice.ts"

describe("browser profile identity and sequences", () => {
  it("serializes simultaneous allocations from independent tab connections and survives reopen", async () => {
    const name = `profile-${crypto.randomUUID()}`
    const tabs = await Promise.all(Array.from({ length: 8 }, () => BrowserDevice.open(name)))
    try {
      const identities = await Promise.all(tabs.map((tab) => tab.allocate(false)))
      expect(new Set(identities.map((profile) => profile.id)).size).toBe(1)
      const allocated = await Promise.all(
        Array.from({ length: 160 }, (_, i) => tabs[i % tabs.length]?.allocate(true))
      )
      expect(
        allocated.map((profile) => profile?.nextSequence).sort((a, b) => (a ?? 0) - (b ?? 0))
      ).toEqual(Array.from({ length: 160 }, (_, i) => i))
      tabs.forEach((tab) => {
        tab.close()
      })
      const reopened = await BrowserDevice.open(name)
      expect(await reopened.allocate(true)).toMatchObject({
        id: identities[0]?.id,
        nextSequence: 160
      })
      reopened.close()
    } finally {
      tabs.forEach((tab) => {
        tab.close()
      })
      indexedDB.deleteDatabase(name)
    }
  })
})
