package app.podlist.data

import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder

/** Only origins are stored: no credentials, paths, fragments or query parameters. */
class ServerAddress private constructor(val origin: String) {
    companion object {
        fun parse(input: String, debug: Boolean): ServerAddress {
            val uri = try { URI(input.trim()) } catch (error: Exception) { throw IllegalArgumentException("Invalid origin", error) }
            require(uri.host != null && uri.userInfo == null && uri.rawQuery == null && uri.rawFragment == null)
            require(uri.rawPath.isNullOrEmpty() || uri.rawPath == "/")
            require(uri.port == -1 || uri.port in 1..65535)
            val scheme = uri.scheme?.lowercase()
            require(scheme == "https" || (debug && scheme == "http" && uri.host == "10.0.2.2"))
            return ServerAddress(URI(scheme, null, uri.host.lowercase(), uri.port, null, null, null).toASCIIString())
        }
    }
    fun artwork(url: String, size: Int = 128): String = "$origin/api/artwork?url=${URLEncoder.encode(url, "UTF-8")}&size=$size"
}

class HttpFailure(val status: Int) : IOException("HTTP $status")

/** JDK/Android networking: no extra HTTP stack, no application credentials, generic User-Agent. */
class HttpTransport(private val address: ServerAddress) : SyncTransport {
    override fun request(method: String, path: String, body: String?): String {
        require(path.startsWith("/api/"))
        val connection = URI(address.origin + path).toURL().openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 2_000
            // An OPML import may fetch many publisher feeds before returning its partial summary.
            connection.readTimeout = if (path == "/api/subscriptions/import") 120_000 else 2_000
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("User-Agent", "PodList Android")
            connection.setRequestProperty("Accept", "application/json")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            if (connection.responseCode !in 200..299) throw HttpFailure(connection.responseCode)
            return connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        } finally { connection.disconnect() }
    }
}
