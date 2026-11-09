package app.podlist.data

import java.io.IOException
import javax.net.ssl.SSLException
import org.xml.sax.SAXException

enum class LookupError { Feed, Offline, Tls, Server, Response }
class InvalidFeed(cause: Exception) : Exception("Invalid podcast feed", cause)
fun classifyLookup(error: Exception): LookupError = when (error) {
    is SSLException -> LookupError.Tls
    is HttpFailure -> LookupError.Server
    is InvalidFeed, is SAXException, is IllegalArgumentException -> LookupError.Feed
    is IOException -> LookupError.Offline
    else -> LookupError.Response
}

fun readPodcastFeed(xml: String): ParsedFeed = try { parseFeed(xml) } catch (error: Exception) { throw InvalidFeed(error) }

data class ImportProgress(val processed: Int, val total: Int, val summary: ImportSummary, val remaining: List<String>)

fun importSubscriptions(xml: String, known: Set<String>, subscribe: (String) -> Unit,
    stopped: () -> Boolean = { false }, progress: (ImportProgress) -> Unit = {}): ImportProgress {
    val urls = Opml.parse(xml)
    var added = 0
    var existing = 0
    val failed = mutableListOf<ImportFailure>()
    var processed = 0
    fun result() = ImportProgress(processed, urls.size, ImportSummary(added, existing, failed.toList()), urls.drop(processed))
    progress(result())
    for (url in urls) {
        if (stopped()) break
        if (url in known) existing++ else try { subscribe(url); added++ }
        catch (error: Exception) { failed += ImportFailure(url, error.message ?: "Could not read feed") }
        processed++
        progress(result())
    }
    return result()
}
