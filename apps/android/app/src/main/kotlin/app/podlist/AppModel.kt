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
import java.io.File
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

data class AppMessage(
    val resource: Int,
    val actionResource: Int = R.string.undo,
    val formatArgs: List<Any> = emptyList(),
    val quantity: Int? = null,
    val undo: (() -> Unit)? = null
)

enum class ConnectionError { Address, Offline, Tls, Server, Response }
enum class SyncStatus { Loading, Ready, Offline, Error }
data class Session(val source: LibrarySource, val db: LocalDatabase, val deviceId: String)
data class BringOverUi(val origin: String, val counts: BringOverCounts, val job: BringOverJob? = null, val running: Boolean = false, val error: Boolean = false)

/** Process-local lifecycle adapter; all protocol decisions and durable data live in :data. */
class AppModel(application: Application) : AndroidViewModel(application) {
    internal val playback = MutableStateFlow<PlaybackUi?>(null)
    internal var playbackHost: PlaybackHost? = null
    private var mediaController: com.google.common.util.concurrent.ListenableFuture<MediaController>? = null
    val gettingStartedRequest = MutableStateFlow<OneShotEvent<Unit>?>(null)
    internal val incomingFeed = MutableStateFlow<String?>(null)
    internal val incoming = MutableStateFlow<OneShotEvent<IncomingContent>?>(null)
    internal val downloadNotificationRequest = MutableStateFlow<OneShotEvent<Unit>?>(null)
    internal fun requestDownloadNotifications() {
        val app = getApplication<Application>()
        if (preferences.getBoolean("downloadNotificationsAsked", false)) return
        if (ContextCompat.checkSelfPermission(app, android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) return
        preferences.edit().putBoolean("downloadNotificationsAsked", true).apply()
        downloadNotificationRequest.value = OneShotEvent(Unit)
    }
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
            runCatching { future.get(); playbackHost?.let(action) }.onFailure { messages.trySend(AppMessage(R.string.playback_error, R.string.retry_playback, undo = { withPlayback(action) })) }
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
    internal val reveal = MutableStateFlow<OneShotEvent<Reveal>?>(null)
    internal val entryReveal = MutableStateFlow<Reveal?>(null)
    internal fun requestReveal(target: Reveal) { reveal.value = OneShotEvent(target) }
    internal val undoRevision = MutableStateFlow(0L)
    internal val undoDescription = MutableStateFlow<AppMessage?>(null)
    internal val redoDescription = MutableStateFlow<AppMessage?>(null)
    internal val latestUndo = MutableStateFlow<(() -> Unit)?>(null)
    internal val undoViewId = MutableStateFlow<String?>(null)
    internal val latestRedo = MutableStateFlow<(() -> Unit)?>(null)
    internal val history = EditHistory<ReversibleEdit>()
    internal var typingJob: Job? = null
    internal var typingMessage: AppMessage? = null
    internal var activeTypingGroup: String? = null
    internal val editLock = Mutex()
    fun edit(change: Change, typingGroup: String? = null, message: Int = editMessage(change), formatArgs: List<Any> = emptyList(), finished: (() -> Unit)? = null) {
        val current = session.value ?: return
        viewModelScope.launch { editLock.withLock {
            if (session.value !== current) return@withLock
            val inverse = withContext(Dispatchers.IO) { current.db.reversibleEdit(listOf(change), System.currentTimeMillis()) }
            if (inverse.isNotEmpty()) recordHistory(current, AppMessage(message, formatArgs = formatArgs),
                ReversibleEdit((change as? Change.SaveView)?.view?.id) { changesStep(current, inverse).apply() }, typingGroup)
            finished?.invoke()
        } }
    }
    fun moveEntry(playlistId: String, episode: String, destination: Int) {
        val current = session.value ?: return
        viewModelScope.launch { editLock.withLock {
            if (session.value !== current) return@withLock
            val inverse = withContext(Dispatchers.IO) { current.db.transaction {
                val playlist = loadState().playlists.find { it.id == playlistId } ?: return@transaction emptyList<Change>()
                val index = playlist.entries.indexOfFirst { it.episodeId == episode }
                if (index < 0) return@transaction emptyList<Change>()
                val without = playlist.entries.filterNot { it.episodeId == episode }
                val after = without.getOrNull(destination.coerceIn(0, without.size) - 1)?.episodeId
                record(Change.MoveEntry(playlistId, episode, after), System.currentTimeMillis())
                listOf<Change>(Change.MoveEntry(playlistId, episode, playlist.entries.getOrNull(index - 1)?.episodeId))
            } }
            if (inverse.isNotEmpty()) {
                recordHistory(current, AppMessage(R.string.entry_moved), changesStep(current, inverse))
                requestReveal(Reveal("playlist:$playlistId", episode))
            }
        } }
    }

    private val preferences = application.getSharedPreferences("connection", 0)
    private val _session = MutableStateFlow<Session?>(null)
    val session = _session.asStateFlow()
    val starting = MutableStateFlow(true)
    val status = MutableStateFlow(SyncStatus.Loading)
    val revision = MutableStateFlow(0L)
    val connecting = MutableStateFlow(false)
    val connectionError = MutableStateFlow<ConnectionError?>(null)
    private val _bringOver = MutableStateFlow<BringOverUi?>(null)
    val bringOver = _bringOver.asStateFlow()
    val bringOverVisible = MutableStateFlow(false)
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

    fun offerUnsubscribe(current: Session, feed: String) {
        offerSubscriptionHistory(current, listOf(feed), subscribe = false, AppMessage(R.string.subscribed))
    }
    fun offerResubscribe(current: Session, feed: String) {
        offerSubscriptionHistory(current, listOf(feed), subscribe = true, AppMessage(R.string.unsubscribed))
    }

    fun startOnPhone() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { check(preferences.edit().remove("server").putBoolean("standalone", true).commit()) }
            activate(null)
        }
    }

    val refreshing = MutableStateFlow<Set<String>>(emptySet())
    fun refreshSubscription(id: String) {
        val current = session.value ?: return
        val source = current.source as? DeviceLibrary ?: return requestSync()
        if (id in refreshing.value) return
        refreshing.update { it + id }
        viewModelScope.launch {
            try { withContext(Dispatchers.IO) { source.refreshOne(id) } }
            catch (error: CancellationException) { throw error }
            catch (_: Exception) { /* The feed’s recorded failure remains beside its Retry action. */ }
            finally { refreshing.update { it - id }; revision.update { it + 1 } }
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
            val fromStandalone = _session.value?.source?.server == null && _session.value != null
            if (_session.value?.source?.server?.origin != address.origin) activate(address)
            withContext(Dispatchers.IO) { check(preferences.edit().putString("server", address.origin).commit()) }
            if (fromStandalone && _bringOver.value != null && _bringOver.value?.job?.complete != true) bringOverVisible.value = true
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

    fun showBringOver() { if (_bringOver.value != null) bringOverVisible.value = true }
    fun dismissBringOver() { bringOverVisible.value = false }

    private fun audioFiles(session: Session) = AudioFiles(File(getApplication<Application>().filesDir, "audio/${digest(session.source.key)}"))

    private suspend fun transfer(next: Session): BringOver {
        val source = sessionFor(null)
        return BringOver(source.db, next.db, HttpTransport(requireNotNull(next.source.server), subscriptionReadTimeoutMillis = 30_000), audioFiles(source), audioFiles(next)) { job ->
            _bringOver.update { current -> if (current?.origin == next.source.key) current.copy(job = job, counts = job.snapshot.counts, error = false) else current }
        }
    }

    fun beginBringOver() {
        val current = _session.value ?: return
        val offer = _bringOver.value ?: return
        if (offer.running || current.source.key != offer.origin) return
        _bringOver.value = offer.copy(running = true, error = false)
        viewModelScope.launch {
            try {
                val transfer = transfer(current)
                withContext(Dispatchers.IO) { transfer.begin() }
                requestSync()
            } catch (error: CancellationException) { throw error }
            catch (_: Exception) { _bringOver.update { it?.copy(running = false, error = true) } }
        }
    }

    fun retryBringOver() { requestSync() }

    private suspend fun loadBringOver(next: Session) {
        bringOverVisible.value = false
        if (next.source.server == null || !preferences.getBoolean("standalone", false)) { _bringOver.value = null; return }
        val source = sessionFor(null)
        _bringOver.value = withContext(Dispatchers.IO) {
            val job = next.db.bringOverJob()
            val counts = job?.snapshot?.counts ?: source.db.bringOverSnapshot().counts
            if (counts.worthMoving) BringOverUi(next.source.key, counts, job, error = next.db.getMeta("bringOverError") == "true") else null
        }
        // An accepted transfer resumes automatically; declining an offer does not start one.
        if (_bringOver.value?.job?.let { !it.complete } == true) bringOverVisible.value = true
    }

    private suspend fun activate(address: ServerAddress?) {
        val previous = _session.value
        val next = sessionFor(address)
        val db = next.db
        playbackHost?.close()
        worker?.cancelAndJoin()
        previous?.db?.onChanged = null
        previous?.db?.onEdit = null
        if (previous?.source?.server == null && address != null) downloads["standalone"]?.rulesSuspended = true
        db.onChanged = { db.updateGettingStartedProgress(); revision.update { it + 1 } }
        db.onEdit = { if (address != null) requestSync() }
        editLock.withLock {
            typingJob?.cancel(); typingJob = null; typingMessage = null; activeTypingGroup = null
            history.clear(); updateHistoryActions()
            while (messages.tryReceive().isSuccess) { /* discard the previous session’s actions */ }
            _session.value = next
        }
        loadBringOver(next)
        status.value = if (address == null) SyncStatus.Ready else SyncStatus.Loading
        downloads(next)
        if (address == null) scheduleFeedRefresh(getApplication())
        worker = viewModelScope.launch {
            // Startup is immediate. Thereafter timeout starts after each completed pass.
            while (isActive) {
                if (address != null && revision.value == 0L) status.value = SyncStatus.Loading
                try {
                    val pendingBringOver = address != null && withContext(Dispatchers.IO) { next.db.bringOverPending() }
                    if (pendingBringOver) {
                        _bringOver.update { it?.copy(running = true, error = false) }
                        val transfer = transfer(next)
                        withContext(Dispatchers.IO) { transfer.resume(); next.db.setMeta("bringOverError", "false") }
                    } else withContext(Dispatchers.IO) { next.source.refresh() }
                    withContext(Dispatchers.IO) { next.db.initializeGettingStarted(); next.db.updateGettingStartedProgress() }
                    status.value = SyncStatus.Ready
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    status.value = if (address == null) SyncStatus.Ready else if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
                    if (_bringOver.value?.job?.let { !it.complete } == true) {
                        withContext(Dispatchers.IO) { next.db.setMeta("bringOverError", "true") }
                        _bringOver.update { it?.copy(error = true) }
                    }
                } finally {
                    _bringOver.update { it?.copy(running = false) }
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
