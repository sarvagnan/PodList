import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { expect, test } from "vitest"
import { opmlPath, readOpmlFile } from "./native-opml.ts"

test("accepts only absolute OPML arguments and file URLs", () => {
  const path = join(tmpdir(), "Podcast List.OPML")
  expect(opmlPath(path)).toBe(path)
  expect(opmlPath(pathToFileURL(path).href)).toBe(path)
  expect(opmlPath("subscriptions.opml")).toBeNull()
  expect(opmlPath("https://example.org/subscriptions.opml")).toBeNull()
  expect(opmlPath(join(tmpdir(), "downloads.xml"))).toBeNull()
})

test("reads native OPML as bounded UTF-8", async () => {
  const root = await mkdtemp(join(tmpdir(), "podlist-opml-"))
  try {
    const path = join(root, "subscriptions.opml")
    const contents = "<opml><body/></opml>"
    await writeFile(path, contents)
    expect(await readOpmlFile(path)).toEqual({ name: "subscriptions.opml", contents })
    expect(await readOpmlFile(path, 10)).toHaveProperty("error")
    await writeFile(path, new Uint8Array([0xff]))
    expect(await readOpmlFile(path)).toHaveProperty("error")
    expect(await readOpmlFile(root)).toHaveProperty("error")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
