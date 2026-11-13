import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { buildFeedVectors } from "../../domain/scripts/feed-vectors.ts"
import { parseDuration, parseFeed } from "../src/FeedParser.ts"

const vectors = JSON.parse(
  readFileSync(new URL("../../domain/protocol/feeds.json", import.meta.url), "utf8")
) as ReturnType<typeof buildFeedVectors>
describe("language-neutral feed parsing vectors", () => {
  it("committed fixtures match the reference parser", () =>
    expect(vectors).toEqual(buildFeedVectors()))
  for (const vector of vectors.feeds)
    it(vector.name, () => {
      if ("error" in vector) expect(() => parseFeed(vector.xml)).toThrow()
      else expect(parseFeed(vector.xml)).toEqual(vector.expected)
    })
  it.each(vectors.durations)("duration $input", ({ input, expected }) =>
    expect(parseDuration(input)).toEqual(expected)
  )
})
