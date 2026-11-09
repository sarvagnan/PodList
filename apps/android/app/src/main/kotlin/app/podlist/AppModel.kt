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

data class AppMessage(val resource: Int, val undo: (() -> Unit)? = null)

enum class ConnectionError { Address, Offline, Tls, Server, Response }
enum class SyncStatus { Loading, Ready, Offline, Error }
data class Session(val address: ServerAddress, val db: LocalDatabase, val deviceId: String)

/** Process-local lifecycle adapter; all protocol decisions and durable data live in :data. */
class AppModel(application: Application) : AndroidViewModel(application) {
    internal val playback = MutableStateFlow<PlaybackUi?>(null)
    internal var playbackHost: PlaybackHost? = null
    private var mediaController: com.google.common.util.concurrent.ListenableFuture<MediaController>? = null
    val messages = Channel<AppMessage>(Channel.BUFFERED)
    private val downloads = mutableMapOf<String, AndroidDownloads>()

    fun downloads(session: Session): AndroidDownloads = downloads.getOrPut(session.address.origin) { AndroidDownloads(getApplication(), this, session) }
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
    fun playNow(episode: String) = withPlayback { it.playNow(episode) }
    fun playEntry(playlist: String, episode: String) = withPlayback { it.playEntry(playlist, episode) }
    fun switchPlaylist(playlist: String) = withPlayback { it.switchPlaylist(playlist) }
    fun restorePlayback() = withPlayback { it.restore() }
    fun togglePlayback() = withPlayback { it.toggle() }
    fun seek(seconds: Double) = withPlayback { it.seek(seconds) }
    fun speed(value: Float) = withPlayback { it.speed(value) }
    fun sleep(timer: SleepTimer?) = withPlayback { it.sleep(timer) }
    fun flushPlayback() { playbackHost?.flush() }
    fun edit(change: Change) {
        viewModelScope.launch { session.value?.let { withContext(Dispatchers.IO) { it.db.record(change, System.currentTimeMillis()) } } }
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
            if (connectivity.activeNetwork == null) status.value = SyncStatus.Offline
        }
    }

    init {
        connectivity.registerDefaultNetworkCallback(callback)
        viewModelScope.launch {
            try {
                preferences.getString("server", null)?.let { address ->
                    activate(ServerAddress.parse(address, BuildConfig.DEBUG))
                }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                connectionError.value = classify(error)
            } finally { starting.value = false }
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
            if (_session.value?.address?.origin != address.origin) activate(address)
            withContext(Dispatchers.IO) { check(preferences.edit().putString("server", address.origin).commit()) }
            requestSync()
            true
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            connectionError.value = classify(error)
            false
        } finally { connecting.value = false }
    }

    internal suspend fun sessionFor(address: ServerAddress): Session = sessionLock.withLock {
        sessions[address.origin]?.let { return@withLock it }
        val db = withContext(Dispatchers.IO) {
            val digest = MessageDigest.getInstance("SHA-256").digest(address.origin.toByteArray()).joinToString("") { "%02x".format(it) }
            val installationId = preferences.getString("deviceId", null) ?: UUID.randomUUID().toString()
            val registeredAt = preferences.getLong("registeredAt", System.currentTimeMillis())
            check(preferences.edit().putString("deviceId", installationId).putLong("registeredAt", registeredAt).commit())
            LocalDatabase(getApplication<Application>().getDatabasePath("library-$digest.sqlite").also { it.parentFile?.mkdirs() }.path).also {
                it.ensureState()
                it.setMeta("deviceId", installationId)
                it.setMeta("registeredAt", registeredAt.toString())
            }
        }
        Session(address, db, withContext(Dispatchers.IO) { db.installation().id }).also { sessions[address.origin] = it }
    }

    private suspend fun activate(address: ServerAddress) {
        val previous = _session.value
        val next = sessionFor(address)
        val db = next.db
        playbackHost?.close()
        worker?.cancelAndJoin()
        previous?.db?.onChanged = null
        previous?.db?.onEdit = null
        db.onChanged = { revision.update { it + 1 } }
        db.onEdit = { requestSync() }
        _session.value = next
        status.value = SyncStatus.Loading
        downloads(next)
        val client = SyncClient(db, HttpTransport(address), onFailure = { error ->
            status.value = if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
        })
        worker = viewModelScope.launch {
            // Startup is immediate. Thereafter timeout starts after each completed pass.
            while (isActive) {
                status.value = SyncStatus.Loading
                try {
                    withContext(Dispatchers.IO) { client.sync() }
                    status.value = SyncStatus.Ready
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    status.value = if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
                }
                revision.update { it + 1 }
                withTimeoutOrNull(60_000) { triggers.receive() }
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
