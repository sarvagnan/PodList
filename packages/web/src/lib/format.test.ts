import { View } from "@podlist/domain"
import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { formatLength, formatPublished } from "./time.ts"
import { describeView } from "./viewSummary.ts"

const view = (filter: unknown, sort = "publishedDesc") =>
  Schema.decodeUnknownSync(View.View)({ id: "v", name: "V", filter, sort, limit: null })

describe("list formatting", () => {
  it("writes lengths in minutes and hours", () => {
    expect(formatLength(1534)).toBe("26 min")
    expect(formatLength(20)).toBe("1 min")
    expect(formatLength(3600)).toBe("1 hr")
    expect(formatLength(4324)).toBe("1 hr 12 min")
  })

  it("writes recent dates relative to today", () => {
    const now = new Date(2026, 10, 7, 15, 0).getTime()
    expect(formatPublished(new Date(2026, 10, 7, 6, 0).getTime(), now)).toBe("Today")
    expect(formatPublished(new Date(2026, 10, 6, 23, 0).getTime(), now)).toBe("Yesterday")
    expect(formatPublished(new Date(2026, 9, 31).getTime(), now)).toBe("31 Oct")
    expect(formatPublished(new Date(2025, 11, 3).getTime(), now)).toBe("3 Dec 2025")
  })

  it("sums up a View's conditions in a few words", () => {
    expect(
      describeView(view({ published: { _tag: "LastDays", days: 7 }, played: "unplayed" }))
    ).toBe("Last 7 days · Unplayed · Newest first")
    expect(describeView(view({ maxDuration: 1800 }, "durationAsc"))).toBe(
      "Under 30 min · Shortest first"
    )
    expect(describeView(view({}))).toBe("Everything · Newest first")
  })
})
