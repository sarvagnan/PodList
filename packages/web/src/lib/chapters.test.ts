import { describe, expect, it } from "vitest"
import { chapterAt, nextChapterStart, previousChapterStart } from "./chapters.ts"

const chapters = [0, 120, 600].map((start, i) => ({ start, title: `C${i}`, artworkUrl: null }))

describe("Chapter navigation", () => {
  it("finds the Chapter playing at a Position", () => {
    expect(chapterAt(chapters, 0)).toBe(0)
    expect(chapterAt(chapters, 119.9)).toBe(1)
    expect(chapterAt(chapters, 700)).toBe(2)
    expect(chapterAt([], 50)).toBe(-1)
  })

  it("goes back to this Chapter's start, or to the previous one from its first seconds", () => {
    expect(previousChapterStart(chapters, 300)).toBe(120)
    expect(previousChapterStart(chapters, 122)).toBe(0)
    expect(previousChapterStart(chapters, 1)).toBe(0)
  })

  it("goes to the next Chapter, with none after the last", () => {
    expect(nextChapterStart(chapters, 10)).toBe(120)
    expect(nextChapterStart(chapters, 650)).toBeNull()
  })
})
