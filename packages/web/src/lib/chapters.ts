/** A Chapter as the player uses it. */
export interface PlayerChapter {
  readonly start: number
  readonly title: string
  readonly artworkUrl: string | null
}

/** The index of the Chapter playing at a Position, or -1 before the first. */
export const chapterAt = (chapters: ReadonlyArray<PlayerChapter>, position: number) => {
  let index = -1
  chapters.forEach((c, i) => {
    if (c.start <= position + 0.25) index = i
  })
  return index
}

/** Previous Chapter: back to the start of this one, unless already within its first 3 s. */
export const previousChapterStart = (chapters: ReadonlyArray<PlayerChapter>, position: number) => {
  const index = chapterAt(chapters, position)
  const current = chapters[index]
  if (current === undefined) return 0
  if (position - current.start > 3) return current.start
  return chapters[index - 1]?.start ?? 0
}

/** The next Chapter's start, or null in the last one. */
export const nextChapterStart = (chapters: ReadonlyArray<PlayerChapter>, position: number) =>
  chapters[chapterAt(chapters, position) + 1]?.start ?? null
