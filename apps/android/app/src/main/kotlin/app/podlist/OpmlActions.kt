package app.podlist

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import app.podlist.data.ImportSelection
import androidx.lifecycle.viewModelScope
import app.podlist.data.ImportSummary
import app.podlist.data.Opml
import app.podlist.data.ImportProgress
import app.podlist.data.importSubscriptions
import java.util.concurrent.atomic.AtomicBoolean
import app.podlist.domain.PlaybackSettingsOverride
import app.podlist.domain.Subscription
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal data class OpmlUi(val busy: Boolean = false, val error: Int? = null, val summary: ImportSummary? = null, val progress: ImportProgress? = null, val stopping: Boolean = false, val selection: ImportSelection? = null, val name: String = "")

/** Activity rotation must not abandon an import or lose its partial result and retry. */
internal class OpmlActions(private val model: AppModel, private val session: Session, private val resolver: ContentResolver) {
    private sealed interface Request {
        data class Read(val uri: Uri) : Request
        data class Import(val xml: String, val preserve: Boolean = false) : Request
        data class Export(val uri: Uri) : Request
    }
    private val mutable = MutableStateFlow(OpmlUi())
    val state = mutable.asStateFlow()
    private var last: Request? = null
    private val stopped = AtomicBoolean(false)
    fun stop() { stopped.set(true); mutable.update { it.copy(stopping = true) } }
    fun resume() {
        val pending = mutable.value.progress?.remaining.orEmpty()
        if (pending.isNotEmpty()) submit(Request.Import(document(pending), preserve = true))
    }
    private fun document(urls: List<String>) = Opml.generate(urls.map { Subscription(it, it, it, null, null, null, 0, null, null, PlaybackSettingsOverride()) })
    private fun import(xml: String, previous: ImportProgress?): ImportSummary {
        val targets = Opml.parse(xml).toSet()
        val retained = previous?.results.orEmpty().filter { it.feedUrl !in targets }
        val known = session.db.query("SELECT feed_url FROM subscription WHERE unsubscribed_at IS NULL").map { it["feed_url"] as String }.toSet()
        val added = mutableListOf<String>()
        val result = importSubscriptions(xml, known, { session.source.subscribe(it); added += it }, stopped::get) { progress ->
            val results = retained + progress.results
            val failures = results.mapNotNull { result -> result.error?.let { app.podlist.data.ImportFailure(result.feedUrl, error = it) } }
            val summary = ImportSummary(results.count { it.added }, results.count { !it.added && it.error == null }, failures)
            val combined = progress.copy(processed = results.size, total = retained.size + progress.total, summary = summary, results = results)
            mutable.update { it.copy(progress = combined, summary = summary) }
        }
        if (added.isNotEmpty()) {
            val feeds = added.toList()
            model.offerSubscriptionHistory(session, feeds, subscribe = false, AppMessage(R.plurals.import_added, formatArgs = listOf(feeds.size), quantity = feeds.size))
        }
        return mutable.value.summary ?: result.summary
    }
    fun confirm() { mutable.value.selection?.let { submit(Request.Import(it.xml)) } }
    fun cancelSelection() { if (!mutable.value.busy) mutable.update { it.copy(selection = null, error = null, name = "") } }
    fun resumeSaved() {
        if (mutable.value.busy) return
        model.viewModelScope.launch {
            val xml = withContext(Dispatchers.IO) { session.db.getMeta("opmlPending") }
            if (!xml.isNullOrEmpty()) {
                val name = withContext(Dispatchers.IO) { session.db.getMeta("opmlName") }.orEmpty()
                mutable.update { it.copy(name = name) }
                submit(Request.Import(xml))
            }
        }
    }
    fun read(uri: Uri) = submit(Request.Read(uri))
    fun export(uri: Uri) = submit(Request.Export(uri))
    fun retry() { last?.let(::submit) }
    fun retryFailed() {
        val failed = mutable.value.summary?.failed.orEmpty()
        if (failed.isEmpty()) return
        submit(Request.Import(Opml.generate(failed.map { Subscription(it.feedUrl, it.feedUrl, it.feedUrl, null, null, null, 0, null, null, PlaybackSettingsOverride()) }), preserve = true))
    }
    private fun submit(request: Request) {
        if (mutable.value.busy) return
        val previous = if (request is Request.Import && request.preserve) mutable.value.progress else null
        last = request
        stopped.set(false)
        mutable.update { it.copy(busy = true, error = null, stopping = false, progress = null, summary = null, selection = if (request is Request.Read) null else it.selection) }
        model.viewModelScope.launch {
            var failureResource = when (request) {
                is Request.Read -> R.string.opml_read_error
                is Request.Import -> R.string.opml_invalid_error
                is Request.Export -> R.string.opml_export_error
            }
            var exportedCount = 0
            try {
                val summary = withContext(Dispatchers.IO) {
                    when (request) {
                        is Request.Read -> {
                            val xml = resolver.openInputStream(request.uri)!!.use { input ->
                                val bytes = input.readNBytes(8 * 1024 * 1024 + 1)
                                if (bytes.size > 8 * 1024 * 1024) {
                                    failureResource = R.string.opml_size_error
                                    error("OPML too large")
                                }
                                bytes.toString(Charsets.UTF_8)
                            }
                            val name = resolver.query(request.uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                                if (cursor.moveToFirst()) cursor.getString(0) else null
                            } ?: request.uri.lastPathSegment ?: "OPML file"
                            failureResource = R.string.opml_invalid_error
                            val known = session.db.query("SELECT feed_url FROM subscription WHERE unsubscribed_at IS NULL").map { it["feed_url"] as String }.toSet()
                            val selection = ImportSelection.read(name, xml, known)
                            mutable.update { it.copy(selection = selection, name = name) }
                            null
                        }
                        is Request.Import -> {
                            session.db.setMeta("opmlPending", request.xml)
                            session.db.setMeta("opmlName", mutable.value.name)
                            mutable.update { it.copy(selection = null) }
                            val summary = import(request.xml, previous)
                            session.db.setMeta("opmlPending", "")
                            summary
                        }
                        is Request.Export -> {
                            val xml = session.source.exportOpml()
                            exportedCount = Opml.parse(xml).size
                            failureResource = R.string.opml_write_error
                            resolver.openOutputStream(request.uri, "wt")!!.bufferedWriter(Charsets.UTF_8).use { it.write(xml) }
                            null
                        }
                    }
                }
                if (summary != null) { mutable.update { it.copy(summary = summary) }; model.requestSync() }
                else if (request is Request.Export) model.messages.send(AppMessage(R.plurals.podcasts_exported, formatArgs = listOf(exportedCount), quantity = exportedCount))
            } catch (error: CancellationException) { throw error }
            catch (_: Exception) { mutable.update { it.copy(error = failureResource) } }
            finally { mutable.update { it.copy(busy = false) } }
        }
    }
}
