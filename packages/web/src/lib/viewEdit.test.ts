import { describe, expect, it } from "vitest"
import {
  blankView,
  publishedChoice,
  saveViewChange,
  withCondition,
  withPublished
} from "./viewEdit.ts"

describe("editing a View", () => {
  it("sets a condition, and setting it to Any removes it", () => {
    const f = withCondition({}, "played", "unplayed")
    expect(f).toEqual({ played: "unplayed" })
    expect(withCondition(f, "played", undefined)).toEqual({})
  })

  it("reads and writes the Published choice", () => {
    expect(publishedChoice({})).toBe("any")
    const week = withPublished({}, "7")
    expect(week.published).toEqual({ _tag: "LastDays", days: 7 })
    expect(publishedChoice(week)).toBe("7")
    expect(publishedChoice(withPublished({}, "between"))).toBe("between")
    expect(withPublished(week, "any")).toEqual({})
  })

  it("makes a SaveView change that decodes", () => {
    const view = { ...blankView("v1"), filter: { text: "budget" } }
    const change = saveViewChange(view)
    expect(change._tag).toBe("SaveView")
  })
})
