import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import type { ViewData } from "../lib/viewEdit.ts"
import { Route } from "./search.tsx"

const rice = { id: "rice", title: "Who sets the price of rice?" }
const market = { id: "market", title: "The long life of a shipping container" }
const matches: Record<string, ReadonlyArray<typeof rice>> = {
  ric: [rice],
  rice: [rice],
  market: [rice, market]
}

vi.mock("../app/hooks.ts", () => ({ useCanEdit: () => true }))
vi.mock("../app/data.ts", () => ({ filterEpisodesAtom: (query: string) => query }))
vi.mock("@effect/atom-react", () => ({
  useAtomValue: (query: string) => {
    const { filter } = JSON.parse(query) as Pick<ViewData, "filter">
    return AsyncResult.success(matches[filter.text ?? ""] ?? [])
  }
}))
vi.mock("../components/shell/DesktopPanes.tsx", () => ({ desktopBuild: true }))
vi.mock("../components/episodes/BulkBar.tsx", () => ({ BulkBar: () => null }))
vi.mock("../components/episodes/EpisodeDetail.tsx", () => ({ EpisodeDetail: () => null }))
vi.mock("../components/episodes/DesktopEpisodeInspector.tsx", () => ({
  DesktopEpisodeInspector: ({ selected }: { selected?: string }) =>
    selected ? createElement("aside", null, selected) : null
}))
vi.mock("../components/episodes/EpisodeList.tsx", () => ({
  EpisodeList: ({ episodes }: { episodes: ReadonlyArray<typeof rice> }) =>
    createElement(
      "ul",
      null,
      episodes.map(({ id, title }) => createElement("li", { key: id }, title))
    )
}))
vi.mock("../components/views/ViewForm.tsx", () => ({ ViewFormFields: () => null }))
vi.mock("../components/views/SaveSearchDialog.tsx", () => ({
  SaveSearchDialog: ({ view }: { view: ViewData }) =>
    createElement("output", null, JSON.stringify(view.filter))
}))

let host: HTMLDivElement
let root: Root

const render = async (...initialEntries: string[]) => {
  const history = createMemoryHistory({ initialEntries })
  const rootRoute = createRootRoute()
  const options = {
    ...Route.options,
    id: "/search",
    path: "/search",
    getParentRoute: () => rootRoute
  }
  const searchRoute = Route.update(options)
  const router = createRouter({ routeTree: rootRoute.addChildren([searchRoute]), history })
  await act(async () => root.render(createElement(RouterProvider, { router })))
  return history
}

const field = () => {
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')
  if (!input) throw new Error("Search field is missing")
  return input
}
const saveButton = () => {
  const button = [...host.querySelectorAll("button")].find(
    (button) => button.textContent === "Save as View"
  )
  if (!button) throw new Error("Save as View button is missing")
  return button
}
const titles = () => [...host.querySelectorAll("li")].map((row) => row.textContent)
const type = (value: string) =>
  act(async () => {
    const input = field()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

it("filters and prepares a View from typed words while delaying the address", async () => {
  const history = await render("/search?played=unplayed")
  await type("ric")
  expect(titles()).toEqual([rice.title])
  await advance(200)
  await type("  market ")
  expect(titles()).toEqual([rice.title, market.title])
  expect(host.querySelector('[aria-live="polite"]')?.textContent).toBe("2 Episodes · ")
  expect(saveButton().disabled).toBe(false)
  await act(async () => saveButton().click())
  expect(host.querySelector("output")?.textContent).toBe('{"played":"unplayed","text":"market"}')
  await advance(299)
  expect(history.location.search).toBe("?played=unplayed")
  await advance(1)
  expect(new URLSearchParams(history.location.search).get("q")).toBe("market")
  expect(field().value).toBe("  market ")
  expect(history.length).toBe(1)
})

it("restores the address on Back and clears the results before removing q", async () => {
  const history = await render("/search?q=rice", "/search?q=market")
  expect(field().value).toBe("market")
  expect(titles()).toEqual([rice.title, market.title])
  await type("missing")
  expect(host.textContent).toContain("Nothing matches")
  await act(async () => history.back())
  expect(field().value).toBe("rice")
  expect(titles()).toEqual([rice.title])
  await advance(300)
  expect(history.location.search).toBe("?q=rice")
  await type(" ")
  expect(host.textContent).toContain("Search your Library")
  expect(saveButton().disabled).toBe(true)
  expect(history.location.search).toBe("?q=rice")
  await advance(300)
  expect(history.location.search).toBe("")
})

it("clears a desktop selection when the new results exclude it", async () => {
  const history = await render("/search?q=market&episode=market")
  expect(host.querySelector("aside")?.textContent).toBe(market.id)
  await type("rice")
  expect(titles()).toEqual([rice.title])
  expect(host.querySelector("aside")).toBeNull()
  expect(history.location.search).toBe("?q=market")
})
