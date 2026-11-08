import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readDialogDraft, storeDialogDraft, useDialogDraft } from "./dialogDraft.ts"

const initial = { kind: "playlist", name: "Saved", clearOnPlayed: false } as const
let root: Root
let host: HTMLDivElement
let current: ReturnType<typeof useDialogDraft<"playlist">>
const departureAllowed = () => window.dispatchEvent(new Event("beforeunload", { cancelable: true }))
function Dialog() {
  current = useDialogDraft(initial)
  return null
}

beforeEach(async () => {
  localStorage.removeItem("podlist:dialog-draft")
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(createElement(Dialog)))
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  localStorage.removeItem("podlist:dialog-draft")
})
const refuseWrites = () =>
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError")
  })

describe("durable dialog drafts (DATA-01, WDATA-02)", () => {
  it("retains the stored copy on write failure and protects only unsaved departures", async () => {
    expect(departureAllowed()).toBe(true)
    const writes = refuseWrites()
    await act(async () => current.update({ name: "Unsaved" }))
    expect(current.draft.name).toBe("Unsaved")
    expect(current.unsaved).toBe(true)
    expect(readDialogDraft()).toEqual(initial)
    expect(departureAllowed()).toBe(false)
    await act(async () => current.retry())
    expect(current.unsaved).toBe(true)
    writes.mockRestore()
    await act(async () => current.retry())
    expect(current.unsaved).toBe(false)
    expect(departureAllowed()).toBe(true)
    expect(readDialogDraft()).toEqual({ ...initial, name: "Unsaved" })
    await act(async () => current.clear())
    expect(readDialogDraft()).toBeNull()
  })

  it("never clears an older stored copy after a refused edit", async () => {
    refuseWrites()
    await act(async () => current.update({ name: "Newer" }))
    await act(async () => current.clear())
    expect(readDialogDraft()).toEqual(initial)
    expect(departureAllowed()).toBe(true)
  })

  it("does not warn when the latest value already has a durable copy", async () => {
    refuseWrites()
    await act(async () => current.retry())
    expect(current.unsaved).toBe(false)
    expect(departureAllowed()).toBe(true)
  })

  it("reports refused writes and clears without throwing", () => {
    refuseWrites()
    expect(storeDialogDraft({ ...initial, name: "Newer" })).toBe(false)
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError")
    })
    expect(storeDialogDraft(null)).toBe(false)
    expect(readDialogDraft()).toEqual(initial)
  })
})
