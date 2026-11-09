package app.podlist.data

import app.podlist.domain.ProtocolJson
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import java.net.URLEncoder

@Serializable data class DirectoryResult(val title: String, val author: String?, val feedUrl: String, val artworkUrl: String?, val source: String)
fun isFeedAddress(query: String) = Regex("^https?://\\S+$", RegexOption.IGNORE_CASE).matches(query.trim())
class PodcastDirectory(private val http: PublisherTransport = PublisherHttp()) {
    fun search(query: String): List<DirectoryResult> {
        val clean = query.trim()
        if (isFeedAddress(clean)) {
            val response = http.get(clean, mapOf("Accept" to "application/rss+xml, application/xml, text/xml"))
            require(response.status in 200..299)
            val feed = parseFeed(response.body)
            return listOf(DirectoryResult(feed.title, feed.author, clean, feed.artworkUrl, "feed"))
        }
        val response = http.get("https://itunes.apple.com/search?media=podcast&entity=podcast&limit=30&term=${URLEncoder.encode(clean, "UTF-8")}", emptyMap())
        require(response.status in 200..299)
        return ProtocolJson.parseToJsonElement(response.body).jsonObject.getValue("results").jsonArray.mapNotNull { value ->
            val row = value.jsonObject
            fun text(key: String) = row[key]?.jsonPrimitive?.contentOrNull
            val feed = text("feedUrl") ?: return@mapNotNull null
            DirectoryResult(text("collectionName") ?: feed, text("artistName")?.takeIf { it.isNotEmpty() }, feed,
                text("artworkUrl600")?.takeIf { it.isNotEmpty() } ?: text("artworkUrl100")?.takeIf { it.isNotEmpty() }, "itunes")
        }
    }
}

@Serializable data class ImportFailure(val feedUrl: String, val message: String)
@Serializable data class ImportSummary(val added: Int, val alreadySubscribed: Int, val failed: List<ImportFailure>)
object Opml {
    fun parse(xml: String): List<String> {
        val root = safeXml(xml)
        require(root.tagName == "opml") { "Not OPML" }
        val urls = linkedSetOf<String>()
        fun walk(element: org.w3c.dom.Element) {
            element.getAttribute("xmlUrl").takeIf { it.isNotEmpty() }?.let(urls::add)
            element.children("outline").forEach(::walk)
        }
        root.children("body").forEach(::walk)
        return urls.toList()
    }
    private fun escape(value: String) = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;")
    fun generate(subscriptions: List<app.podlist.domain.Subscription>): String = listOf(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<opml version=\"2.0\">", "  <head><title>PodList subscriptions</title></head>", "  <body>",
        *subscriptions.filter { it.unsubscribedAt == null }.map { "    <outline type=\"rss\" text=\"${escape(it.title)}\" title=\"${escape(it.title)}\" xmlUrl=\"${escape(it.feedUrl)}\"/>" }.toTypedArray(),
        "  </body>", "</opml>", "").joinToString("\n")
}
