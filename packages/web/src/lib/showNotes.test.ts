import { describe, expect, it } from "vitest"
import { showNotes, showNotesText } from "./showNotes.ts"

describe("show notes", () => {
  it("keeps the text and paragraphs of feed HTML, and nothing else", () => {
    const html =
      '<p>First <b>part</b>.</p><p>Second<br>line <a href="https://x.test">link</a></p><img src=x onerror="alert(1)"><script>alert(2)</script>'
    expect(showNotesText(html)).toEqual(["First part.", "Second\nline link"])
  })

  it("keeps safe links and their text, without feed markup or attributes", () => {
    expect(
      showNotes(
        '<p>Read <a href="https://x.test/?a=1&amp;b=2" onclick="evil()"><b>more</b></a> now.</p><p><a href="mailto:host@x.test">Email</a></p>'
      )
    ).toEqual([
      [
        { text: "Read ", href: null },
        { text: "more", href: "https://x.test/?a=1&b=2" },
        { text: " now.", href: null }
      ],
      [{ text: "Email", href: "mailto:host@x.test" }]
    ])
  })

  it.each([
    "javascript:alert(1)",
    "jav&#x61;script:alert(1)",
    "java&#10;script:alert(1)",
    "data:text/html,evil",
    "vbscript:evil",
    "/relative",
    "//evil.test",
    "file:///tmp/evil"
  ])("drops unsafe or unresolved href %s", (href) => {
    expect(showNotes(`<a href="${href}">Readable</a>`)).toEqual([
      [{ text: "Readable", href: null }]
    ])
  })

  it("drops executable content and keeps paragraph and line boundaries", () => {
    expect(
      showNotesText(
        '<div>One <a href="https://x.test">two<br>three</a></div><div>Four</div><svg><a href="https://evil.test">hidden</a></svg><iframe>hidden</iframe>'
      )
    ).toEqual(["One two\nthree", "Four"])
  })
})
