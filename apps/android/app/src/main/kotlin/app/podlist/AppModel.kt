package app.podlist

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.podlist.data.*
import app.podlist.domain.*
import android.content.ComponentName
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import androidx.core.content.ContextCompat
import java.io.IOException
import java.security.MessageDigest
import java.util.UUID
import javax.net.ssl.SSLException
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.SerializationException

data class AppMessage(val resource: Int, val actionResource: Int = R.string.undo, val undo: (() -> Unit)? = null)

enum class ConnectionError { Address, Offline, Tls, Server, Response }
enum class SyncStatus { Loading, Ready, Offline, Error }
data class Session(val source: LibrarySource, val db: LocalDatabase, val deviceId: String)

/** Process-local lifecycle adapter; all protocol decisions and durable data live in :data. */
class AppModel(application: Application) : AndroidViewModel(application) {
    internal val playback = MutableStateFlow<PlaybackUi?>(null)
    internal var playbackHost: PlaybackHost? = null
    private var mediaController: com.google.common.util.concurrent.ListenableFuture<MediaController>? = null
    val gettingStartedRequest = MutableStateFlow(0)
    val shortcut = MutableStateFlow<String?>(null)
    val messages = Channel<AppMessage>(Channel.BUFFERED)
    private val opml = mutableMapOf<String, OpmlActions>()
    internal fun opml(session: Session): OpmlActions = opml.getOrPut(session.source.key) { OpmlActions(this, session, getApplication<Application>().contentResolver) }
    private val downloads = mutableMapOf<String, AndroidDownloads>()

    fun downloads(session: Session): AndroidDownloads = downloads.getOrPut(session.source.key) { AndroidDownloads(getApplication(), this, session) }
    private fun withPlayback(action: (PlaybackHost) -> Unit) {
        playbackHost?.let { action(it); return }
        val application = getApplication<Application>()
        if (mediaController?.isDone == true) {
            MediaController.releaseFuture(mediaController!!)
            mediaController = null
        }
        val future = mediaController ?: MediaController.Builder(application, SessionToken(application, ComponentName(application, PlaybackService::class.java))).buildAsync().also { mediaController = it }
        future.addListener({
            runCatching { future.get(); playbackHost?.let(action) }.onFailure { messages.trySend(AppMessage(R.string.playback_error)) }
        }, ContextCompat.getMainExecutor(application))
    }
    internal fun playbackEdit(playlist: String? = null, action: suspend () -> Unit) = withPlayback { it.playlistAction(playlist, action) }
    fun playNow(episode: String) = withPlayback { it.playNow(episode) }
    fun playEntry(playlist: String, episode: String) = withPlayback { it.playEntry(playlist, episode) }
    fun switchPlaylist(playlist: String) = withPlayback { it.switchPlaylist(playlist) }
    fun restorePlayback() = withPlayback { it.restore() }
    fun togglePlayback() = withPlayback { it.toggle() }
    fun seek(seconds: Double) = withPlayback { it.seek(seconds) }
    fun speed(value: Float) = withPlayback { it.speed(value) }
    fun sleep(timer: SleepTimer?) = withPlayback { it.sleep(timer) }
    fun flushPlayback() { playbackHost?.flush() }
    private val editLock = Mutex()
    fun edit(change: Change) {
        val current = session.value ?: return
        viewModelScope.launch { editLock.withLock { withContext(Dispatchers.IO) { current.db.record(change, System.currentTimeMillis()) } } }
    }
    fun moveEntry(playlistId: String, episode: String, destination: Int) {
        viewModelScope.launch {
            val current = session.value ?: return@launch
            val inverse = withContext(Dispatchers.IO) {
                val playlist = current.db.loadState().playlists.find { it.id == playlistId } ?: return@withContext emptyList<Change>()
                val index = playlist.entries.indexOfFirst { it.episodeId == episode }
                if (index < 0) return@withContext emptyList<Change>()
                val without = playlist.entries.filterNot { it.episodeId == episode }
                val after = without.getOrNull(destination.coerceIn(0, without.size) - 1)?.episodeId
                current.db.record(Change.MoveEntry(playlistId, episode, after), System.currentTimeMillis())
                listOf<Change>(Change.MoveEntry(playlistId, episode, playlist.entries.getOrNull(index - 1)?.episodeId))
            }
            messages.send(AppMessage(R.string.entry_moved) { undo(current, inverse) })
        }
    }
    private fun undo(session: Session, changes: List<Change>) {
        viewModelScope.launch { withContext(Dispatchers.IO) { session.db.recordAll(changes, System.currentTimeMillis()) } }
    }
    fun add(episode: String, playlist: String?, name: String?, placement: Placement, result: (Boolean) -> Unit) {
        viewModelScope.launch {
            val current = session.value ?: return@launch
            var inverse = emptyList<Change>()
            val success = withContext(Dispatchers.IO) {
                val state = current.db.loadState()
                val clean = name?.trim()
                if (playlist != null && state.playlists.none { it.id == playlist }) return@withContext false
                if (playlist == null && (clean.isNullOrEmpty() || state.playlists.any { it.name.equals(clean, ignoreCase = true) })) return@withContext false
                val id = playlist ?: UUID.randomUUID().toString()
                val before = state.playlists.find { it.id == id }
                val oldIndex = before?.entries?.indexOfFirst { it.episodeId == episode } ?: -1
                inverse = if (before == null) listOf(Change.DeletePlaylist(id)) else listOfNotNull(
                    if (oldIndex >= 0) Change.MoveEntry(id, episode, before.entries.getOrNull(oldIndex - 1)?.episodeId) else Change.RemoveEntry(id, episode),
                    Change.SetCursor(id, before.cursor)
                )
                current.db.recordAll(listOfNotNull(if (playlist == null) Change.CreatePlaylist(id, clean!!, false) else null, Change.AddEntry(id, episode, placement)), System.currentTimeMillis())
                true
            }
            if (success) messages.trySend(AppMessage(R.string.added_to_playlist) { undo(current, inverse) })
            result(success)
        }
    }

    private val preferences = application.getSharedPreferences("connection", 0)
    private val _session = MutableStateFlow<Session?>(null)
    val session = _session.asStateFlow()
    val starting = MutableStateFlow(true)
    val status = MutableStateFlow(SyncStatus.Loading)
    val revision = MutableStateFlow(0L)
    val connecting = MutableStateFlow(false)
    val connectionError = MutableStateFlow<ConnectionError?>(null)
    private val triggers = Channel<Unit>(Channel.CONFLATED)
    private var worker: Job? = null
    private val sessions = mutableMapOf<String, Session>()
    private val sessionLock = Mutex()
    private val connectivity = application.getSystemService(ConnectivityManager::class.java)
    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) { requestSync() }
        override fun onLost(network: Network) {
            if (_session.value?.source?.server != null && connectivity.activeNetwork == null) status.value = SyncStatus.Offline
        }
    }

    init {
        connectivity.registerDefaultNetworkCallback(callback)
        viewModelScope.launch {
            try {
                val saved = preferences.getString("server", null)
                if (saved != null) activate(ServerAddress.parse(saved, BuildConfig.DEBUG))
                else if (preferences.getBoolean("standalone", false)) activate(null)
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                connectionError.value = classify(error)
            } finally { starting.value = false }
        }
    }

    fun offerResubscribe(current: Session, feed: String) {
        messages.trySend(AppMessage(R.string.unsubscribed) { changeSubscription(current, feed, subscribe = true) })
    }
    private fun changeSubscription(current: Session, feed: String, subscribe: Boolean) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    if (subscribe) current.source.subscribe(feed)
                    else {
                        val id = current.db.query("SELECT id FROM subscription WHERE feed_url = ?", listOf(feed)).single()["id"] as String
                        current.source.unsubscribe(id)
                    }
                }
                requestSync()
                messages.send(AppMessage(if (subscribe) R.string.subscribed else R.string.unsubscribed, if (subscribe) R.string.m4_redo else R.string.undo) { changeSubscription(current, feed, !subscribe) })
            } catch (error: CancellationException) { throw error }
            catch (_: Exception) {
                messages.send(AppMessage(if (subscribe) R.string.subscribe_failed else R.string.unsubscribe_failed, R.string.retry) { changeSubscription(current, feed, subscribe) })
            }
        }
    }

    fun startOnPhone() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { check(preferences.edit().remove("server").putBoolean("standalone", true).commit()) }
            activate(null)
        }
    }

    fun requestSync() { triggers.trySend(Unit) }

    fun connect(input: String, connected: () -> Unit) {
        viewModelScope.launch { if (connectChecked(input)) connected() }
    }

    private suspend fun connectChecked(input: String): Boolean {
        if (connecting.value) return false
        connecting.value = true
        connectionError.value = null
        return try {
            val address = ServerAddress.parse(input, BuildConfig.DEBUG)
            withContext(Dispatchers.IO) { checkHealth(HttpTransport(address)) }
            if (_session.value?.source?.server?.origin != address.origin) activate(address)
            withContext(Dispatchers.IO) { check(preferences.edit().putString("server", address.origin).commit()) }
            requestSync()
            true
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            connectionError.value = classify(error)
            false
        } finally { connecting.value = false }
    }

    internal suspend fun sessionFor(address: ServerAddress?): Session = sessionLock.withLock {
        val key = address?.origin ?: "standalone"
        sessions[key]?.let { return@withLock it }
        val db = withContext(Dispatchers.IO) {
            val digest = MessageDigest.getInstance("SHA-256").digest(key.toByteArray()).joinToString("") { "%02x".format(it) }
            val installationId = preferences.getString("deviceId", null) ?: UUID.randomUUID().toString()
            val registeredAt = preferences.getLong("registeredAt", System.currentTimeMillis())
            check(preferences.edit().putString("deviceId", installationId).putLong("registeredAt", registeredAt).commit())
            LocalDatabase(getApplication<Application>().getDatabasePath("library-$digest.sqlite").also { it.parentFile?.mkdirs() }.path, standalone = address == null).also {
                it.ensureState()
                if (address == null) it.initializeStandalone()
                it.setMeta("deviceId", installationId)
                it.setMeta("registeredAt", registeredAt.toString())
            }
        }
        val source = if (address == null) DeviceLibrary(db) else ServerLibrary(db, address) { error ->
            status.value = if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
        }
        Session(source, db, withContext(Dispatchers.IO) { db.installation().id }).also { sessions[key] = it }
    }

    private suspend fun activate(address: ServerAddress?) {
        val previous = _session.value
        val next = sessionFor(address)
        val db = next.db
        playbackHost?.close()
        worker?.cancelAndJoin()
        previous?.db?.onChanged = null
        previous?.db?.onEdit = null
        db.onChanged = { db.updateGettingStartedProgress(); revision.update { it + 1 } }
        db.onEdit = { if (address != null) requestSync() }
        _session.value = next
        status.value = if (address == null) SyncStatus.Ready else SyncStatus.Loading
        downloads(next)
        if (address == null) scheduleFeedRefresh(getApplication())
        worker = viewModelScope.launch {
            // Startup is immediate. Thereafter timeout starts after each completed pass.
            while (isActive) {
                if (address != null) status.value = SyncStatus.Loading
                try {
                    withContext(Dispatchers.IO) { next.source.refresh(); next.db.initializeGettingStarted(); next.db.updateGettingStartedProgress() }
                    status.value = SyncStatus.Ready
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    status.value = if (address == null) SyncStatus.Ready else if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
                }
                revision.update { it + 1 }
                withTimeoutOrNull(if (address == null) DeviceLibrary.PollMillis else 60_000) { triggers.receive() }
                delay(2_000)
                while (triggers.tryReceive().isSuccess) { /* coalesce bursts */ }
            }
        }
    }

    override fun onCleared() {
        connectivity.unregisterNetworkCallback(callback)
        // viewModelScope cancellation waits for the blocking IO call before the database closes.
        val databases = sessions.values.map { it.db }
        worker?.invokeOnCompletion { databases.forEach { it.close() } }
        if (worker == null) databases.forEach { it.close() }
        super.onCleared()
    }
}

private fun classify(error: Exception): ConnectionError = when (error) {
    is SSLException -> ConnectionError.Tls
    is HttpFailure -> ConnectionError.Server
    is SerializationException, is SyncResponseFailure -> ConnectionError.Response
    is IllegalArgumentException -> ConnectionError.Address
    is IOException -> ConnectionError.Offline
    else -> ConnectionError.Response
}
