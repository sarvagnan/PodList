import { describe, expect, it } from "vitest"
import { showNotesText } from "./showNotes.ts"

describe("show notes", () => {
  it("keeps the text and paragraphs of feed HTML, and nothing else", () => {
    const html =
      '<p>First <b>part</b>.</p><p>Second<br>line <a href="https://x.test">link</a></p><img src=x onerror="alert(1)"><script>alert(2)</script>'
    expect(showNotesText(html)).toEqual(["First part.", "Second\nline link"])
  })
})
