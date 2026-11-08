import { foldData } from "./MentionsFoldData.ts"

// Unicode 17.0.0: NFD → full default (non-Turkic) case fold → NFD → remove accent marks →
// replace undecomposable accented letters (mentions-fold.py lists both). Vowel signs and
// kana voicing are not accents and stay. Per-scalar mappings avoid host Unicode differences.
const mappings = new Map<number, string>()
for (const chunk of foldData) {
  for (const row of chunk.split(";")) {
    const [source, target = ""] = row.split(":")
    mappings.set(
      Number.parseInt(source ?? "", 16),
      target === ""
        ? ""
        : String.fromCodePoint(...target.split(",").map((cp) => Number.parseInt(cp, 16)))
    )
  }
}

export const fold = (text: string): string => {
  let result = ""
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0
    if (cp >= 0xac00 && cp <= 0xd7a3) {
      const syllable = cp - 0xac00
      result += String.fromCodePoint(
        0x1100 + Math.floor(syllable / 588),
        0x1161 + Math.floor((syllable % 588) / 28)
      )
      if (syllable % 28 !== 0) result += String.fromCodePoint(0x11a7 + (syllable % 28))
    } else result += mappings.get(cp) ?? char
  }
  return result
}
