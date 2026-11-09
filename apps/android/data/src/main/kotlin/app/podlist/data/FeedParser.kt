package app.podlist.data

import kotlinx.serialization.Serializable
import org.w3c.dom.Element
import java.io.StringReader
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.Locale
import javax.xml.parsers.DocumentBuilderFactory
import org.xml.sax.InputSource

const val FeedSizeLimit = 8 * 1024 * 1024
@Serializable data class ParsedEpisode(val guid: String, val title: String, val description: String, val published: Long, val duration: Double?, val audioUrl: String, val artworkUrl: String?, val chaptersUrl: String?)
@Serializable data class ParsedFeed(val title: String, val author: String?, val description: String?, val artworkUrl: String?, val episodes: List<ParsedEpisode>)

/** Shared by RSS and OPML. No DTD, entity declarations, external resources or unbounded XML. */
internal fun safeXml(xml: String): Element {
    require(xml.toByteArray(Charsets.UTF_8).size <= FeedSizeLimit) { "XML is too large" }
    require(!Regex("<!\\s*(DOCTYPE|ENTITY)", RegexOption.IGNORE_CASE).containsMatchIn(xml)) { "DTD and entities are forbidden" }
    val factory = DocumentBuilderFactory.newInstance()
    factory.isNamespaceAware = false
    factory.isExpandEntityReferences = false
    // Android and the JVM expose different JAXP features. The declaration guard and resolver
    // remain mandatory on both; disable external loading wherever the provider supports it.
    for ((name, value) in listOf("http://apache.org/xml/features/disallow-doctype-decl" to true,
        "http://xml.org/sax/features/external-general-entities" to false,
        "http://xml.org/sax/features/external-parameter-entities" to false,
        "http://apache.org/xml/features/nonvalidating/load-external-dtd" to false)) {
        runCatching { factory.setFeature(name, value) }
    }
    val builder = factory.newDocumentBuilder()
    builder.setEntityResolver { _, _ -> throw IllegalArgumentException("External entities are forbidden") }
    builder.setErrorHandler(object : org.xml.sax.helpers.DefaultHandler() {
        override fun error(e: org.xml.sax.SAXParseException) { throw e }
        override fun fatalError(e: org.xml.sax.SAXParseException) { throw e }
    })
    return builder.parse(InputSource(StringReader(xml))).documentElement
}
internal fun Element.children(name: String): List<Element> = (0 until childNodes.length).mapNotNull { childNodes.item(it) as? Element }.filter { it.tagName == name }
private fun Element.first(name: String) = children(name).firstOrNull()
private fun Element.text(name: String): String? = first(name)?.let { element ->
    // The reference parser uses the element's own text, not text nested inside markup.
    (0 until element.childNodes.length).map { element.childNodes.item(it) }
        .filter { it.nodeType == org.w3c.dom.Node.TEXT_NODE || it.nodeType == org.w3c.dom.Node.CDATA_SECTION_NODE }
        .joinToString("") { it.nodeValue.trim() }.takeIf { it.isNotEmpty() }
}
private fun Element.attr(name: String, attribute: String) = first(name)?.getAttribute(attribute)?.trim()?.takeIf { it.isNotEmpty() }

fun parseDuration(raw: String?): Double? {
    if (raw == null) return null
    val parts = raw.split(':')
    if (parts.size > 3) return null
    val values = parts.map { if (it.isBlank()) 0.0 else it.trim().toDoubleOrNull() ?: return null }
    if (values.any { !it.isFinite() || it < 0 }) return null
    return values.fold(0.0) { total, part -> total * 60 + part }.takeIf { it.isFinite() }
}
private fun parseDate(raw: String?): Long {
    if (raw == null) return 0
    runCatching { return Instant.parse(raw).toEpochMilli() }
    runCatching { return OffsetDateTime.parse(raw).toInstant().toEpochMilli() }
    val withoutWeekday = raw.replace(Regex("^[A-Za-z]{3},\\s*"), "")
    for (pattern in listOf("d MMM yyyy HH:mm:ss Z", "d MMM yyyy HH:mm Z", "d MMM yyyy HH:mm:ss z", "d MMM yyyy HH:mm:ss XXX")) {
        runCatching { return ZonedDateTime.parse(withoutWeekday, DateTimeFormatter.ofPattern(pattern, Locale.US)).toInstant().toEpochMilli() }
    }
    val shortYear = java.time.format.DateTimeFormatterBuilder().appendPattern("d MMM ")
        .appendValueReduced(java.time.temporal.ChronoField.YEAR, 2, 2, 1950).appendPattern(" HH:mm:ss Z").toFormatter(Locale.US)
    runCatching { return ZonedDateTime.parse(withoutWeekday, shortYear).toInstant().toEpochMilli() }
    runCatching { return LocalDate.parse(raw).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli() }
    return 0
}
fun parseFeed(xml: String): ParsedFeed {
    val rss = safeXml(xml)
    require(rss.tagName == "rss") { "Not an RSS feed" }
    val channel = requireNotNull(rss.first("channel")) { "No channel" }
    val title = requireNotNull(channel.text("title")) { "The feed has no title" }
    return ParsedFeed(title, channel.text("itunes:author") ?: channel.text("itunes:owner"),
        channel.text("description") ?: channel.text("itunes:summary"),
        channel.attr("itunes:image", "href") ?: channel.first("image")?.text("url"),
        channel.children("item").mapNotNull { item ->
            val audio = item.attr("enclosure", "url") ?: return@mapNotNull null
            ParsedEpisode(item.text("guid") ?: audio, item.text("title") ?: item.text("itunes:title") ?: "Untitled episode",
                item.text("content:encoded") ?: item.text("description") ?: item.text("itunes:summary") ?: "",
                parseDate(item.text("pubDate")), parseDuration(item.text("itunes:duration")), audio,
                item.attr("itunes:image", "href"), item.attr("podcast:chapters", "url"))
        })
}
