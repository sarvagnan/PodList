package app.podlist.data

/** Unicode 17: NFD, full default non-Turkic case fold, NFD, remove accent marks, replace
 * undecomposable accented letters (mentions-fold.py lists both). Vowel signs and kana voicing stay.
 * Generated scalar mappings keep Android/JVM Unicode versions out of the contract.
 */
object Mentions {
    private val mappings = mentionsFoldData.flatMap { it.split(';') }.associate { row ->
        val parts = row.split(':', limit = 2)
        parts[0].toInt(16) to if (parts[1].isEmpty()) "" else buildString {
            for (cp in parts[1].split(',')) appendCodePoint(cp.toInt(16))
        }
    }
    fun fold(text: String): String = buildString {
        val points = text.codePoints().iterator()
        while (points.hasNext()) {
            val cp = points.nextInt()
            if (cp in 0xac00..0xd7a3) {
                val syllable = cp - 0xac00
                appendCodePoint(0x1100 + syllable / 588)
                appendCodePoint(0x1161 + (syllable % 588) / 28)
                if (syllable % 28 != 0) appendCodePoint(0x11a7 + syllable % 28)
            } else append(mappings[cp] ?: String(Character.toChars(cp)))
        }
    }
}
