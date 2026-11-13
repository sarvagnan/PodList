package app.podlist.data

/** RSS-only lexer, deliberately not an XML validator. No I/O or DTD entity table exists.
 * Like the server, each closing tag pops one element regardless of its spelling, and
 * EOF retains completed text/attributes but discards the unfinished final text run.
 * Space is bounded by the feed size plus a 101-element stack; no recursive parsing.
 */
internal class FeedXml(source: String) {
    private val xml = source.replace("\r\n", "\n").replace('\r', '\n')
    private var pos = 0
    private fun after(marker: String, start: Int): Int {
        val end = xml.indexOf(marker, start)
        require(end >= 0) { "Unclosed XML token" }
        return end + marker.length
    }
    private fun declaration() {
        var brackets = 0
        var quote: Char? = null
        pos += 2
        while (pos < xml.length) {
            val c = xml[pos++]
            if (quote != null) { if (c == quote) quote = null; continue }
            if (xml.startsWith("<!--", pos - 1)) { pos = after("-->", pos + 3); continue }
            when (c) {
                '\'', '"' -> quote = c
                '[' -> brackets++
                ']' -> if (brackets > 0) brackets--
                '>' -> if (brackets == 0) return
            }
        }
        throw IllegalArgumentException("Unclosed XML declaration")
    }
    fun read(open: (String, Map<String, String>) -> Unit, close: (String) -> Unit, text: (String) -> Unit) {
        val stack = ArrayList<String>()
        val pending = StringBuilder()
        fun flush() { text(decodeFeedEntities(pending.toString().trim())); pending.setLength(0) }
        while (pos < xml.length) {
            if (xml[pos] != '<') {
                val end = xml.indexOf('<', pos).let { if (it < 0) xml.length else it }
                pending.append(xml, pos, end); pos = end; continue
            }
            when {
                xml.startsWith("<!--", pos) -> pos = after("-->", pos + 4)
                xml.startsWith("<![CDATA[", pos) -> {
                    flush()
                    val end = after("]]>", pos + 9)
                    text(xml.substring(pos + 9, end - 3)); pos = end
                }
                xml.startsWith("<!", pos) -> declaration()
                xml.startsWith("<?", pos) -> { flush(); pos = after("?>", pos + 2) }
                xml.startsWith("</", pos) -> {
                    flush(); pos = after(">", pos + 2)
                    if (stack.isNotEmpty()) close(stack.removeAt(stack.lastIndex))
                }
                else -> {
                    flush(); pos++
                    val start = pos
                    while (pos < xml.length && !xml[pos].isWhitespace() && xml[pos] != '/' && xml[pos] != '>') pos++
                    val name = xml.substring(start, pos)
                    require(name.isNotEmpty()) { "Missing tag name" }
                    val attributes = HashMap<String, String>()
                    var selfClosing = false
                    while (true) {
                        while (pos < xml.length && xml[pos].isWhitespace()) pos++
                        require(pos < xml.length) { "Unclosed opening tag" }
                        if (xml[pos] == '>') { pos++; break }
                        if (xml[pos] == '/' && pos + 1 < xml.length && xml[pos + 1] == '>') { selfClosing = true; pos += 2; break }
                        val keyStart = pos
                        while (pos < xml.length && !xml[pos].isWhitespace() && xml[pos] !in "=<>" && !xml.startsWith("/>", pos)) pos++
                        require(pos > keyStart) { "Invalid attribute" }
                        val key = xml.substring(keyStart, pos)
                        while (pos < xml.length && xml[pos].isWhitespace()) pos++
                        if (pos < xml.length && xml[pos] == '=') {
                            pos++
                            while (pos < xml.length && xml[pos].isWhitespace()) pos++
                            if (pos < xml.length && xml[pos] in "\"'") {
                                val quote = xml[pos++]
                                val valueStart = pos
                                pos = xml.indexOf(quote, pos)
                                require(pos >= 0) { "Unclosed attribute" }
                                attributes[key] = decodeFeedEntities(xml.substring(valueStart, pos).trim()); pos++
                            }
                        }
                    }
                    require(selfClosing || stack.size <= 100) { "XML nesting is too deep" }
                    open(name, attributes)
                    if (selfClosing) close(name) else stack.add(name)
                }
            }
        }
        // The reference parser never saves its final pending text at EOF.
        while (stack.isNotEmpty()) close(stack.removeAt(stack.lastIndex))
    }
}

// Keep this built-in set aligned with fast-xml-parser's htmlEntities option (XML,
// COMMON_HTML and CURRENCY). Single pass: &amp;lt; becomes &lt;, never '<'.
private val feedEntities = mapOf(
    "amp" to "&", "apos" to "'", "gt" to ">", "lt" to "<", "quot" to "\"",
    "nbsp" to "\u00a0", "copy" to "©", "reg" to "®", "trade" to "™", "mdash" to "—", "ndash" to "–",
    "hellip" to "…", "laquo" to "«", "raquo" to "»", "lsquo" to "‘", "rsquo" to "’", "ldquo" to "“", "rdquo" to "”",
    "bull" to "•", "para" to "¶", "sect" to "§", "deg" to "°", "frac12" to "½", "frac14" to "¼", "frac34" to "¾",
    "cent" to "¢", "pound" to "£", "curren" to "¤", "yen" to "¥", "euro" to "€", "dollar" to "$", "fnof" to "ƒ",
    "inr" to "₹", "af" to "؋", "birr" to "ብር", "peso" to "₱", "rub" to "₽", "won" to "₩", "yuan" to "¥", "cedil" to "¸"
)
private val feedReference = Regex("&(#x[0-9a-fA-F]+|#X[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);")
private fun decodeFeedEntities(raw: String): String = feedReference.replace(raw) { match ->
    val token = match.groupValues[1]
    if (!token.startsWith('#')) feedEntities[token] ?: match.value
    else {
        val hex = token.startsWith("#x", true)
        val cp = token.substring(if (hex) 2 else 1).toIntOrNull(if (hex) 16 else 10)
        when {
            cp == null || cp > 0x10ffff -> match.value
            cp == 0 || cp in 0xd800..0xdfff || (cp < 32 && cp !in listOf(9, 10, 13)) -> ""
            else -> String(Character.toChars(cp))
        }
    }
}
