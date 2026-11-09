package app.podlist.data

import app.podlist.domain.Chapter

const val Id3ProbeBytes = 512 * 1024
/** Bounded ID3v2.3/v2.4 CHAP probe, matching the server's fallback after JSON Chapters. */
fun id3Chapters(bytes: ByteArray): List<Chapter> {
    fun ascii(at: Int, count: Int) = String(bytes, at, count, Charsets.ISO_8859_1)
    fun u32(at: Int): Long = (0..3).fold(0L) { n, index -> (n shl 8) or (bytes[at + index].toLong() and 255) }
    fun syncsafe(at: Int): Long = (0..3).fold(0L) { n, index -> (n shl 7) or (bytes[at + index].toLong() and 127) }
    if (bytes.size < 10 || ascii(0, 3) != "ID3") return emptyList()
    val version = bytes[3].toInt()
    if (version !in 3..4) return emptyList()
    val end = minOf(bytes.size.toLong(), Id3ProbeBytes.toLong(), 10 + syncsafe(6)).toInt()
    fun size(at: Int) = if (version == 4) syncsafe(at) else u32(at)
    val chapters = mutableListOf<Chapter>()
    var at = 10
    while (at + 10 <= end) {
        val id = ascii(at, 4)
        val length = size(at + 4)
        if (!Regex("[A-Z0-9]{4}").matches(id) || length <= 0 || at + 10L + length > end) break
        val body = at + 10
        val bodyEnd = (body + length).toInt()
        if (id == "CHAP") {
            var idEnd = body
            while (idEnd < bodyEnd && bytes[idEnd].toInt() != 0) idEnd++
            if (idEnd + 17 <= bodyEnd) {
                val start = u32(idEnd + 1) / 1000.0
                var title = ""
                var sub = idEnd + 17
                while (sub + 10 <= bodyEnd) {
                    val subSize = size(sub + 4)
                    if (subSize <= 0 || sub + 10L + subSize > bodyEnd) break
                    if (ascii(sub, 4) == "TIT2") {
                        val encoding = bytes[sub + 10].toInt()
                        val charset = when (encoding) { 1 -> Charsets.UTF_16; 2 -> Charsets.UTF_16BE; 3 -> Charsets.UTF_8; else -> Charsets.ISO_8859_1 }
                        title = String(bytes, sub + 11, subSize.toInt() - 1, charset).substringBefore('\u0000')
                    }
                    sub = (sub + 10L + subSize).toInt()
                }
                chapters += Chapter(start, title, null, null)
            }
        }
        at = bodyEnd
    }
    return chapters.sortedBy { it.start }
}
