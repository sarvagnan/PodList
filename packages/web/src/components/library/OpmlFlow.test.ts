import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const command = vi.hoisted(() => vi.fn())
vi.mock("@effect/atom-react", () => ({ useAtomSet: () => command }))
vi.mock("../../app/library.ts", () => ({ opmlCommandAtom: {} }))
vi.mock("../../app/hooks.ts", () => ({ useCanEdit: () => true }))

import { opmlImport } from "../../library/OpmlImport.ts"
import { OpmlFlow } from "./OpmlFlow.tsx"

let root: Root
let host: HTMLDivElement
const file = new File(
  [
    '<opml><body><outline text="Known" xmlUrl="known"/><outline text="New" xmlUrl="new"/></body></opml>'
  ],
  "Podcasts.opml"
)
const render = () => act(async () => root.render(createElement(OpmlFlow)))
const click = (text: string) =>
  act(async () => [...host.querySelectorAll("button")].find((b) => b.textContent === text)?.click())
beforeEach(() => {
  command.mockClear()
  opmlImport.cancel()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  opmlImport.cancel()
})

it("reviews the selected file in Settings before an explicit Import, with Cancel", async () => {
  await render()
  expect(host.textContent).toContain("Leaving Settings does not stop an import")
  await act(async () => opmlImport.select(file, async () => new Set(["known"])))
  expect(host.textContent).toContain("Podcasts.opml: 2 podcasts; 1 already in the Library.")
  expect(command).not.toHaveBeenCalled()
  await click("Cancel")
  expect(host.textContent).not.toContain("Podcasts.opml:")
  await act(async () => opmlImport.select(file, async () => new Set(["known"])))
  await click("Import")
  expect(command).toHaveBeenCalledWith("import")
})

it("shows retained per-podcast results after leaving Settings, with Retry", async () => {
  await render()
  await act(async () => opmlImport.select(file, async () => new Set(["known"])))
  await act(async () => root.render(null))
  await opmlImport.run(
    async () => new Set(["known"]),
    async () => {
      throw new Error("Host unavailable")
    }
  )
  await render()
  expect(host.textContent).toContain("Imported 2 of 2")
  expect(host.textContent).toContain("Known · Already in the Library")
  expect(host.textContent).toContain("New · Failed: Host unavailable")
  await click("Retry failed imports")
  expect(command).toHaveBeenCalledWith("retry")
})
