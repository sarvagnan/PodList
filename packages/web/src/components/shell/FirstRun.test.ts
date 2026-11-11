import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const library = vi.hoisted(() => ({
  ready: false,
  stateReady: true,
  path: "/views/v",
  wide: true,
  subscriptions: null as unknown,
  waiting: false
}))
vi.mock("@effect/atom-react", () => ({
  useAtomValue: () =>
    library.waiting
      ? AsyncResult.waiting(AsyncResult.success(library.subscriptions))
      : AsyncResult.success(library.subscriptions),
  useAtomSet: () => () => {}
}))
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => library.path }))
vi.mock("../../app/data.ts", () => ({ subscriptionsAtom: {} }))
vi.mock("../../app/hooks.ts", () => ({
  useLibraryReady: () => library.ready,
  useAppState: () =>
    library.stateReady
      ? { views: [{ id: "v" }], playlists: [{ entries: [{ episodeId: "e" }] }] }
      : null
}))
vi.mock("../../lib/useWide.ts", () => ({ useMinWidth: () => library.wide }))
vi.mock("../../app/runtime.ts", () => ({ recordAtom: {} }))
vi.mock("../library/AddPodcastSheet.tsx", () => ({
  AddPodcastSheet: ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) =>
    createElement(
      "div",
      { role: "dialog" },
      createElement("input", { defaultValue: "unfinished feed" }),
      createElement("button", { type: "button", onClick: () => onOpenChange(false) }, "Close")
    )
}))

import { AsyncResult } from "effect/reactivity"
import { firstRunDone } from "../../lib/remembered.ts"
import { FirstRun } from "./FirstRun.tsx"

let root: Root
let host: HTMLDivElement
const card = () => host.querySelector("section")
const render = () => act(async () => root.render(createElement(FirstRun)))
const click = async (label: string) => {
  const button = [...host.querySelectorAll("button")].find((b) => b.textContent === label)
  expect(button).toBeDefined()
  await act(async () => button?.click())
}
beforeEach(() => {
  firstRunDone.clear()
  library.ready = true
  library.stateReady = true
  library.path = "/views/v"
  library.wide = true
  library.waiting = false
  library.subscriptions = []
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  firstRunDone.clear()
})

it("hides after the first Subscription and has only numbered introductory points", async () => {
  await render()
  expect(card()).not.toBeNull()
  expect([...host.querySelectorAll("li > span:first-child")].map((n) => n.textContent)).toEqual([
    "1",
    "2",
    "3"
  ])
  expect(card()?.textContent).not.toContain("(done)")
  expect(host.querySelector("svg")).toBeNull()
  library.subscriptions = [{ id: "s" }]
  await render()
  expect(card()).toBeNull()
})

it("keeps Add and its input until it closes, then hides the introduction", async () => {
  await render()
  await click("Add podcasts")
  const input = host.querySelector("input")
  if (input === null) throw new Error("Add input is missing")
  input.value = "another unfinished address"
  library.subscriptions = [{ id: "s" }]
  await render()
  expect(card()).not.toBeNull()
  expect(host.querySelector("input")).toBe(input)
  expect(input.value).toBe("another unfinished address")
  await click("Close")
  expect(card()).toBeNull()
})

it("keeps a reopened introduction with Subscriptions until dismissed", async () => {
  library.subscriptions = [{ id: "s" }]
  firstRunDone.set()
  await render()
  expect(card()).toBeNull()
  await act(async () => document.dispatchEvent(new Event("podlist:getting-started")))
  expect(card()).not.toBeNull()
  library.waiting = true
  await render()
  expect(card()).not.toBeNull()
  await click("Done")
  expect(card()).toBeNull()
  expect(firstRunDone.get()).toBe(true)
})

it("does not flash during initial load or a Library re-read", async () => {
  library.ready = false
  await render()
  expect(card()).toBeNull()
  library.ready = true
  library.stateReady = false
  await render()
  expect(card()).toBeNull()
  library.stateReady = true
  library.waiting = true
  await render()
  expect(card()).toBeNull()
  library.waiting = false
  await render()
  expect(card()).not.toBeNull()
  library.waiting = true
  await render()
  expect(card()).not.toBeNull()
  library.subscriptions = [{ id: "s" }]
  library.waiting = false
  await render()
  expect(card()).toBeNull()
  library.subscriptions = []
  library.waiting = true
  await render()
  expect(card()).toBeNull()
})

it("shows the introduction only on the landing screen, never a second View", async () => {
  await render()
  expect(card()).not.toBeNull()
  library.path = "/views/second"
  await render()
  expect(card()).toBeNull()
  await act(async () => document.dispatchEvent(new Event("podlist:getting-started")))
  expect(card()).toBeNull()
  library.path = "/views/v"
  await render()
  expect(card()).not.toBeNull()
  library.wide = false
  await render()
  expect(card()).toBeNull()
  library.path = "/views"
  await render()
  expect(card()).not.toBeNull()
  library.path = "/views/second"
  await render()
  expect(card()).toBeNull()
})
