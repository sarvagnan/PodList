import { describe, expect, it } from "vitest"
import { type EpisodeFacts, planDownloads, type RuleFacts } from "./plan.ts"

const ep = (id: string, patch: Partial<EpisodeFacts> = {}): EpisodeFacts => ({
  id,
  subscriptionId: "s",
  published: 100,
  played: false,
  starred: false,
  entry: false,
  ...patch
})
const rule = (patch: Partial<RuleFacts>): RuleFacts => ({
  subscriptionId: "s",
  mode: "onEntry",
  keepAtMost: null,
  since: 0,
  ...patch
})

describe("Download Rules on this Device", () => {
  it("fetches Entries, and lets a rule's download go once it is no longer an Entry", () => {
    const plan = planDownloads(
      [rule({ mode: "onEntry" })],
      [ep("a", { entry: true }), ep("b"), ep("c", { entry: true, played: true })],
      [{ episodeId: "b", manual: false }]
    )
    expect(plan).toEqual({ fetch: ["a"], discard: ["b"] })
  })

  it("fetches new Episodes since the rule, newest first, up to the cap; Entries don't count", () => {
    const plan = planDownloads(
      [rule({ mode: "allNew", keepAtMost: 2, since: 50 })],
      [
        ep("old", { published: 10 }),
        ep("n1", { published: 60 }),
        ep("n2", { published: 70 }),
        ep("n3", { published: 80 }),
        ep("listening", { published: 20, entry: true })
      ],
      []
    )
    expect([...plan.fetch].sort()).toEqual(["listening", "n2", "n3"])
  })

  it("never touches Manual Downloads or Starred Episodes, and Stream fetches nothing", () => {
    const plan = planDownloads(
      [rule({ mode: "never" })],
      [ep("m", { entry: true }), ep("s", { starred: true }), ep("x")],
      [
        { episodeId: "m", manual: true },
        { episodeId: "s", manual: false },
        { episodeId: "x", manual: false }
      ]
    )
    expect(plan).toEqual({ fetch: [], discard: ["x"] })
  })
})
