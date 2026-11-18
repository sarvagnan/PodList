package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*

/** The entire HTTP boundary; fake transports exercise the real wire decoder and SQLite commits. */
fun interface SyncTransport {
    fun request(method: String, path: String, body: String?): String
}

@Serializable data class Health(val status: String, val protocolVersion: Int, val release: String? = null)
@Serializable data class PullPage(val cursor: Long, val snapshot: State?, val operations: List<Operation>)
@Serializable data class LibraryPage(val cursor: Long, val subscriptions: List<Subscription>, val episodes: List<Episode>, val more: Boolean)
@Serializable private data class PushBody(val operations: List<Operation>)
@Serializable private data class PushResult(val cursor: Long, val accepted: Long)

/** Blocking, platform-independent protocol owner. Calls are serialized; edits can commit during HTTP. */
@Serializable
class SyncCompatibilityFailure(val _tag: String, val minimumProtocolVersion: Int? = null, val serverProtocolVersion: Int? = null) : Exception(
    if (_tag == "UpdateRequired") "Update PodList to keep syncing" else "Update the PodList server to keep syncing"
)

class SyncClient(private val db: LocalDatabase, private val transport: SyncTransport, private val onFailure: (Exception) -> Unit = {}) {
    private var blocked: SyncCompatibilityFailure? = null
    fun health(): Health {
        db.setMeta("serverProtocolVersion", SyncProtocol.LegacyVersion.toString())
        return checkHealth(transport).also { db.setMeta("serverProtocolVersion", it.protocolVersion.toString()) }
    }
    @Synchronized fun retry() { blocked = null }

    @Synchronized
    fun sync(refreshHealth: Boolean = false) {
        blocked?.let { throw it }
        if (refreshHealth) runCatching { health() }
        if (db.getMeta("registered") != "true") {
            val device = db.installation()
            val registered = ProtocolJson.decodeFromString<Device>(transport.request("POST", "/api/devices", ProtocolJson.encodeToString(device)))
            require(registered.id == device.id) { "Registration returned a different Device" }
            db.setMeta("registered", "true")
        }
        var stateFailure: Exception? = null
        try { syncState() } catch (error: Exception) { if (error is SyncCompatibilityFailure) blocked = error; stateFailure = error; onFailure(error) }
        try { syncLibrary() } catch (error: Exception) {
            if (stateFailure is SyncCompatibilityFailure) throw stateFailure
            stateFailure?.let { error.addSuppressed(it) }
            throw error
        }
        stateFailure?.let { throw it }
    }

    private fun syncState() {
        val sent = db.outbox()
        val minimum = sent.maxOfOrNull { SyncProtocol.minimumVersion(it.change) } ?: SyncProtocol.LegacyVersion
        if (minimum > SyncProtocol.LegacyVersion) {
            val version = health().protocolVersion
            if (version < minimum) throw SyncCompatibilityFailure("UnsupportedOperation", serverProtocolVersion = version)
        }
        if (sent.isNotEmpty()) {
            // accepted=0 is normal on retries; the push cursor must never become the pull cursor.
            ProtocolJson.decodeFromString<PushResult>(transport.request("POST", "/api/sync/push", ProtocolJson.encodeToString(PushBody(sent))))
        }
        val since = db.getMeta("userCursor")?.toLong() ?: 0
        val text = transport.request("GET", "/api/sync/pull?since=$since", null)
        val operations = ProtocolJson.parseToJsonElement(text).jsonObject["operations"] as? JsonArray
        if (operations.orEmpty().any { operation ->
            val tag = (operation as? JsonObject)?.get("change")?.let { it as? JsonObject }?.get("_tag")?.jsonPrimitive?.content
            tag != null && tag !in SyncProtocol.minimumVersions
        }) throw SyncCompatibilityFailure("UpdateRequired", minimumProtocolVersion = SyncProtocol.Version + 1)
        val pull = ProtocolJson.decodeFromString<PullPage>(text)
        require(pull.cursor >= since) { "State cursor moved backwards" }
        db.commitPull(pull, sent)
    }

    private fun syncLibrary() {
        // Rows already mirrored as an older reader may now carry publisher links.
        var cursor = if (db.getMeta("catalogueReaderV6") == "true") {
            db.getMeta("catalogueCursor")?.toLong() ?: 0
        } else 0
        // A Subscription changed after its Episodes, by Unsubscribe for one, arrives on a later page.
        // Those Episodes wait for it, and the saved cursor stays put so a restart fetches them again.
        var waiting = emptyList<Episode>()
        while (true) {
            val page = ProtocolJson.decodeFromString<LibraryPage>(transport.request("GET", "/api/library/changes?since=$cursor", null))
            require(page.cursor >= cursor && (!page.more || page.cursor > cursor)) { "Library cursor did not advance" }
            val known = db.query("SELECT id FROM subscription").map { it["id"] as String }.toSet() + page.subscriptions.map { it.id }
            val (ready, unknown) = (waiting + page.episodes).partition { it.subscriptionId in known }
            waiting = unknown
            db.upsertLibrary(page.subscriptions, ready, page.cursor.takeIf { waiting.isEmpty() })
            db.notifyChanged()
            cursor = page.cursor
            if (!page.more) break
        }
        if (waiting.isNotEmpty()) throw SyncResponseFailure()
    }
}

class SyncResponseFailure : Exception("Invalid PodList response")

fun checkHealth(transport: SyncTransport): Health = ProtocolJson.decodeFromString<Health>(transport.request("GET", "/api/health", null)).also {
    if (it.status != "ok") throw SyncResponseFailure()
    // Older servers are usable for the operation versions they implement.
}
