package app.podlist.data

import kotlinx.serialization.Serializable
import org.w3c.dom.Element
import java.io.StringReader
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.Locale
import javax.xml.parsers.DocumentBuilderFactory
import org.xml.sax.Attributes
import org.xml.sax.InputSource
import org.xml.sax.helpers.DefaultHandler
import javax.xml.parsers.SAXParserFactory

const val FeedSizeLimit = 32 * 1024 * 1024
private const val DocumentSizeLimit = 8 * 1024 * 1024
private val forbiddenDeclaration = Regex("<!\\s*(DOCTYPE|ENTITY)", RegexOption.IGNORE_CASE)
@Serializable data class ParsedEpisode(val guid: String, val title: String, val description: String, val published: Long, val duration: Double?, val audioUrl: String, val artworkUrl: String?, val chaptersUrl: String?)
@Serializable data class ParsedFeed(val title: String, val author: String?, val description: String?, val artworkUrl: String?, val episodes: List<ParsedEpisode>)

/** For small documents such as OPML. No DTD, entity declarations, external resources or unbounded XML. */
internal fun safeXml(xml: String): Element {
    require(xml.toByteArray(Charsets.UTF_8).size <= DocumentSizeLimit) { "XML is too large" }
    require(!forbiddenDeclaration.containsMatchIn(xml)) { "DTD and entities are forbidden" }
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
/** Reads as a stream: real feeds reach 20 MB, which a DOM would turn into several times that in memory. */
fun parseFeed(xml: String): ParsedFeed {
    require(utf8Size(xml) <= FeedSizeLimit) { "XML is too large" }
    require(!forbiddenDeclaration.containsMatchIn(xml)) { "DTD and entities are forbidden" }
    val factory = SAXParserFactory.newInstance()
    factory.isNamespaceAware = false
    // Android and the JVM expose different features; the declaration guard above is mandatory on both.
    for (name in listOf("http://xml.org/sax/features/external-general-entities", "http://xml.org/sax/features/external-parameter-entities"))
        runCatching { factory.setFeature(name, false) }
    val handler = FeedHandler()
    factory.newSAXParser().parse(InputSource(StringReader(xml)), handler)
    return handler.feed()
}
private fun utf8Size(text: String): Long = text.fold(0L) { size, c -> size + when { c.code < 0x80 -> 1; c.code < 0x800 || c.isSurrogate() -> 2; else -> 3 } }

/** One element's fields: only the first of each name counts, and only its own text, not nested markup. */
private class Fields(private val wanted: Set<String>, private val attributes: Map<String, String>) {
    private val seen = HashSet<String>()
    private val values = HashMap<String, String>()
    fun open(name: String, read: (String) -> String?): Boolean {
        if ((name !in wanted && name !in attributes) || !seen.add(name)) return false
        attributes[name]?.let { attribute -> read(attribute)?.trim()?.takeIf { it.isNotEmpty() }?.let { values[name] = it } }
        return name in wanted
    }
    fun set(name: String, value: String) { if (value.isNotEmpty()) values[name] = value }
    operator fun get(name: String): String? = values[name]
}
private val channelText = setOf("title", "itunes:author", "itunes:owner", "description", "itunes:summary")
private val itemText = setOf("guid", "title", "itunes:title", "content:encoded", "description", "itunes:summary", "pubDate", "itunes:duration")
private class FeedHandler : DefaultHandler() {
    private var root: String? = null
    private var depth = 0
    private var channelSeen = false
    private var inChannel = false
    private val channel = Fields(channelText, mapOf("itunes:image" to "href"))
    private var imageSeen = false
    private var inImage = false
    private val image = Fields(setOf("url"), emptyMap())
    private var item: Fields? = null
    private val episodes = ArrayList<ParsedEpisode>()
    private var target: Fields? = null
    private var field: String? = null
    private var fieldDepth = 0
    private val value = StringBuilder()
    private val run = StringBuilder()

    private fun flushRun() { if (run.isNotEmpty()) { value.append(run.toString().trim()); run.setLength(0) } }
    override fun startElement(uri: String?, local: String?, qName: String, attributes: Attributes) {
        if (field != null) flushRun()
        depth++
        if (field != null) return
        val fields = when {
            depth == 1 -> { root = qName; null }
            depth == 2 -> { if (qName == "channel" && !channelSeen) { channelSeen = true; inChannel = true }; null }
            inChannel && depth == 3 -> when {
                qName == "item" -> { item = Fields(itemText, mapOf("enclosure" to "url", "itunes:image" to "href", "podcast:chapters" to "url")); null }
                qName == "image" && !imageSeen -> { imageSeen = true; inImage = true; null }
                else -> channel
            }
            depth == 4 -> item ?: image.takeIf { inImage }
            else -> null
        } ?: return
        if (fields.open(qName) { attributes.getValue(it) }) { target = fields; field = qName; fieldDepth = depth; value.setLength(0) }
    }
    override fun characters(ch: CharArray, start: Int, length: Int) { if (field != null && depth == fieldDepth) run.append(ch, start, length) }
    override fun endElement(uri: String?, local: String?, qName: String) {
        if (field != null) flushRun()
        if (field != null && depth == fieldDepth) { target!!.set(field!!, value.toString()); field = null; target = null }
        if (inChannel && depth == 3 && qName == "item") { item?.let(::finishItem); item = null }
        if (inChannel && depth == 3 && qName == "image") inImage = false
        if (inChannel && depth == 2) inChannel = false
        depth--
    }
    private fun finishItem(item: Fields) {
        val audio = item["enclosure"] ?: return
        episodes += ParsedEpisode(item["guid"] ?: audio, item["title"] ?: item["itunes:title"] ?: "Untitled episode",
            item["content:encoded"] ?: item["description"] ?: item["itunes:summary"] ?: "",
            parseDate(item["pubDate"]), parseDuration(item["itunes:duration"]), audio, item["itunes:image"], item["podcast:chapters"])
    }
    override fun resolveEntity(publicId: String?, systemId: String?): InputSource = throw IllegalArgumentException("External entities are forbidden")
    fun feed(): ParsedFeed {
        require(root == "rss") { "Not an RSS feed" }
        require(channelSeen) { "No channel" }
        val title = requireNotNull(channel["title"]) { "The feed has no title" }
        return ParsedFeed(title, channel["itunes:author"] ?: channel["itunes:owner"], channel["description"] ?: channel["itunes:summary"],
            channel["itunes:image"] ?: image["url"], episodes)
    }
}
