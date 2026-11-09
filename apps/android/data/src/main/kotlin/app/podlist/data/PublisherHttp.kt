package app.podlist.data

import java.net.HttpURLConnection
import java.net.URI

data class PublisherResponse(val status: Int, val body: String, val etag: String? = null, val lastModified: String? = null, val bytes: ByteArray? = null)
fun interface PublisherTransport { fun get(url: String, headers: Map<String, String>): PublisherResponse }
/** Publisher-only boundary: bounded bodies, bounded redirects, no credentials, generic identity. */
class PublisherHttp : PublisherTransport {
    override fun get(url: String, headers: Map<String, String>): PublisherResponse {
        var target = url
        repeat(6) {
            val uri = URI(target)
            require(uri.scheme in listOf("http", "https") && uri.host != null && uri.userInfo == null)
            val connection = uri.toURL().openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = 10_000
                connection.readTimeout = 20_000
                connection.instanceFollowRedirects = false
                connection.setRequestProperty("User-Agent", "PodList Android")
                headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }
                val status = connection.responseCode
                if (status in listOf(301, 302, 303, 307, 308)) {
                    target = uri.resolve(requireNotNull(connection.getHeaderField("Location"))).toString()
                } else {
                    val ranged = headers.keys.any { it.equals("Range", ignoreCase = true) }
                    val bytes = if (status in 200..299) connection.inputStream.use { input ->
                        val limit = if (ranged) Id3ProbeBytes else FeedSizeLimit + 1
                        input.readNBytes(limit).also { require(ranged || it.size <= FeedSizeLimit) { "Response is too large" } }
                    } else byteArrayOf()
                    return PublisherResponse(status, if (ranged) "" else bytes.toString(Charsets.UTF_8), connection.getHeaderField("ETag"), connection.getHeaderField("Last-Modified"), bytes.takeIf { ranged })
                }
            } finally { connection.disconnect() }
        }
        error("Too many redirects")
    }
}
