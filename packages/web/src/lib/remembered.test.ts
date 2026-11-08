import { afterEach, expect, it, vi } from "vitest"
import { searchRefineOpen, statsAboutOpen, statsTableOpen } from "./remembered.ts"

const keys = ["search-refine", "stats-about", "stats-table"]
afterEach(() => {
  vi.restoreAllMocks()
  for (const key of keys) localStorage.removeItem(`podlist:${key}`)
})
it("remembers both disclosure choices independently on this Device (DATA-06, LIST-05)", () => {
  for (const setting of [searchRefineOpen, statsAboutOpen, statsTableOpen]) {
    expect(setting.get()).toBeNull()
    setting.set(true)
    expect(setting.get()).toBe(true)
    setting.set(false)
    expect(setting.get()).toBe(false)
  }
  searchRefineOpen.set(true)
  expect(statsAboutOpen.get()).toBe(false)
  expect(statsTableOpen.get()).toBe(false)
})
it("falls back safely when storage refuses convenience settings", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Denied")
  })
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Denied")
  })
  expect(() => searchRefineOpen.set(true)).not.toThrow()
  expect(searchRefineOpen.get()).toBeNull()
})
