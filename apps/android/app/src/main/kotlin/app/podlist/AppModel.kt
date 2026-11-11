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
    val undo: (() -> Unit)? = null,
    val feedbackSheet: String? = null
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
    // Captured at a sheet action's dispatch, never when its asynchronous result arrives.
    internal var feedbackSheet: String? = null
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
    internal val restorePlaylistDraft = MutableStateFlow<OneShotEvent<List<String>>?>(null)
    internal val reveal = MutableStateFlow<OneShotEvent<Reveal>?>(null)
    internal val settingReveal = MutableStateFlow<SettingReveal?>(null)
    internal val entryReveal = MutableStateFlow<Reveal?>(null)
    internal fun requestReveal(target: Reveal) { reveal.value = OneShotEvent(target) }
    internal var flushFormDrafts: (() -> Unit)? = null
    internal val undoRevision = MutableStateFlow(0L)
    internal val undoDescription = MutableStateFlow<AppMessage?>(null)
    internal val redoDescription = MutableStateFlow<AppMessage?>(null)
    internal val latestUndo = MutableStateFlow<(() -> Unit)?>(null)
    internal val undoViewId = MutableStateFlow<String?>(null)
    internal val latestRedo = MutableStateFlow<(() -> Unit)?>(null)
    internal data class SubscriptionTransition(val target: Boolean, val pending: Boolean = true)
    internal val subscriptionFailures = MutableStateFlow<Map<String, AppMessage>>(emptyMap())
    internal val subscriptionTransitions = MutableStateFlow<Map<String, SubscriptionTransition>>(emptyMap())
    internal val history = EditHistory<ReversibleEdit>()
    internal var typingJob: Job? = null
    internal var typingMessage: AppMessage? = null
    internal var activeTypingGroup: String? = null
    internal val editLock = Mutex()
    fun edit(change: Change, typingGroup: String? = null, message: Int = editMessage(change), formatArgs: List<Any> = emptyList(), finished: (() -> Unit)? = null) {
        val current = session.value ?: return
        val sheet = feedbackSheet
        viewModelScope.launch { editLock.withLock {
            if (session.value !== current) return@withLock
            val inverse = withContext(Dispatchers.IO) { current.db.reversibleEdit(listOf(change), System.currentTimeMillis()) }
            val namedArgs = if (formatArgs.isNotEmpty()) formatArgs else withContext(Dispatchers.IO) { when (change) {
                is Change.SaveView -> listOf(change.view.name)
                is Change.SetStar -> listOf(current.db.query("SELECT title FROM episode WHERE id = ?", listOf(change.episodeId)).firstOrNull()?.get("title") ?: getApplication<Application>().getString(R.string.episode))
                is Change.MarkPlayed -> listOf(current.db.query("SELECT title FROM episode WHERE id = ?", listOf(change.episodeId)).firstOrNull()?.get("title") ?: getApplication<Application>().getString(R.string.episode))
                is Change.MarkUnplayed -> listOf(current.db.query("SELECT title FROM episode WHERE id = ?", listOf(change.episodeId)).firstOrNull()?.get("title") ?: getApplication<Application>().getString(R.string.episode))
                else -> emptyList()
            } }
            if (inverse.isNotEmpty()) recordHistory(current, AppMessage(message, formatArgs = namedArgs, feedbackSheet = sheet),
                ReversibleEdit((change as? Change.SaveView)?.view?.id) { changesStep(current, inverse).apply() }, typingGroup,
                notify = change !is Change.SetPlaybackSettings && change !is Change.SetSubscriptionOverrides && change !is Change.SetTrashDays && change !is Change.SetDownloadRule && change !is Change.SetClearOnPlayed)
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
                val names = withContext(Dispatchers.IO) { listOf(
                    current.db.query("SELECT title FROM episode WHERE id = ?", listOf(episode)).firstOrNull()?.get("title") ?: getApplication<Application>().getString(R.string.episode),
                    current.db.loadState().playlists.find { it.id == playlistId }?.name.orEmpty()) }
                recordHistory(current, AppMessage(R.string.entry_moved, formatArgs = names), changesStep(current, inverse))
                requestReveal(Reveal("playlist:$playlistId", episode))
            }
        } }
    }

    private val preferences = application.getSharedPreferences("connection", 0)
    private val deviceSettings = DeviceSettingsStore(File(application.filesDir, "device-settings.properties"))
    private val serverDraftWriter = app.podlist.data.DraftWriteBuffer { batch ->
        batch["address"]?.let { deviceSettings.serverAddressDraft = it }
        batch["selection"]?.let { deviceSettings.serverAddressSelection = it }
    }
    fun flushDrafts() { serverDraftWriter.flush(); flushFormDrafts?.invoke() }
    private val _serverAddressDraft = MutableStateFlow(deviceSettings.serverAddressDraft)
    val serverAddressDraft = _serverAddressDraft.asStateFlow()
    internal val serverAddressSelection = MutableStateFlow(deviceSettings.serverAddressSelection)
    fun setServerAddressSelection(value: String) { serverAddressSelection.value = value; serverDraftWriter.put("selection", value) }
    private fun replaceServerDraft(next: app.podlist.data.ServerDraft): app.podlist.data.ServerDraft {
        serverDraftWriter.flush()
        val before = deviceSettings.replaceServerDraft(next)
        serverAddressSelection.value = next.selection
        _serverAddressDraft.value = next.address
        connectionError.value = null
        return before
    }
    private fun serverDraftStep(snapshot: app.podlist.data.ServerDraft): ReversibleEdit = ReversibleEdit {
        val before = replaceServerDraft(snapshot)
        requestReveal(Reveal("server"))
        serverDraftStep(before)
    }
    /** Before first connection there is no Library history; the form owns that snackbar's Undo. */
    fun discardServerDraft(): (() -> Unit)? {
        val before = replaceServerDraft(app.podlist.data.ServerDraft(null, null))
        val current = session.value
        if (current == null) return { replaceServerDraft(before) }
        recordHistory(current, AppMessage(R.string.draft_discarded), serverDraftStep(before))
        return null
    }
    private val _appearance = MutableStateFlow(deviceSettings.appearance)
    val appearance = _appearance.asStateFlow()

    fun setServerAddressDraft(value: String?) {
        if (value == null) {
            serverDraftWriter.flush()
            deviceSettings.serverAddressDraft = null
            deviceSettings.serverAddressSelection = null
            serverAddressSelection.value = null
        }
        else serverDraftWriter.put("address", value)
        _serverAddressDraft.value = value
    }

    private fun applyAppearance(value: Appearance) {
        deviceSettings.appearance = value
        _appearance.value = value
        getApplication<Application>().applyLaunchAppearance(value)
    }
    private fun appearanceStep(value: Appearance): ReversibleEdit = ReversibleEdit {
        val before = _appearance.value
        applyAppearance(value)
        settingReveal.value = SettingReveal(SettingKey.Appearance)
        appearanceStep(before).also {
            val context = getApplication<Application>()
            it.feedback = AppMessage(R.string.setting_back_to, formatArgs = listOf(context.getString(R.string.appearance), context.getString(appearanceLabel(value))))
        }
    }
    fun setAppearance(value: Appearance) {
        val before = _appearance.value
        if (before == value) return
        applyAppearance(value)
        val current = session.value ?: return
        viewModelScope.launch { editLock.withLock {
            recordHistory(current, AppMessage(R.string.appearance_changed), appearanceStep(before), notify = false)
        } }
    }
    private val _session = MutableStateFlow<Session?>(null)
    val session = _session.asStateFlow()
    val starting = MutableStateFlow(true)
    val status = MutableStateFlow(SyncStatus.Loading)
    internal val syncFailureResource = MutableStateFlow(R.string.sync_server_error)
    private fun syncFailed(error: Exception) {
        syncFailureResource.value = when {
            error is HttpFailure && error.status in listOf(401, 403) -> R.string.sync_signed_out
            error is HttpFailure -> R.string.sync_server_error
            error is SSLException -> R.string.sync_tls_error
            error is IOException -> R.string.offline
            else -> R.string.sync_response_error
        }
        status.value = if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
    }
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

    private fun subscriptionName(current: Session, feed: String): String = current.db.query("SELECT title FROM subscription WHERE feed_url = ?", listOf(feed)).firstOrNull()?.get("title") as? String ?: feed

    fun offerUnsubscribe(current: Session, feed: String) {
        offerSubscriptionHistory(current, listOf(feed), subscribe = false, AppMessage(R.string.subscribed_message, formatArgs = listOf(subscriptionName(current, feed))))
    }
    fun offerResubscribe(current: Session, feed: String) {
        offerSubscriptionHistory(current, listOf(feed), subscribe = true, AppMessage(R.string.unsubscribed_message, formatArgs = listOf(subscriptionName(current, feed))))
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
            withContext(Dispatchers.IO) { checkHealth(flowRunTransport(address)) }
            val fromStandalone = _session.value?.source?.server == null && _session.value != null
            if (_session.value?.source?.server?.origin != address.origin) activate(address)
            withContext(Dispatchers.IO) { check(preferences.edit().putString("server", address.origin).commit()) }
            if (fromStandalone && _bringOver.value != null && _bringOver.value?.job?.complete != true) bringOverVisible.value = true
            setServerAddressDraft(null)
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
        val source = if (address == null) DeviceLibrary(db) else ServerLibrary(db, address, http = flowRunTransport(address)) { error ->
            syncFailed(error)
        }
        Session(source, db, withContext(Dispatchers.IO) { db.installation().id }).also { sessions[key] = it }
    }

    fun showBringOver() { if (_bringOver.value != null) bringOverVisible.value = true }
    fun dismissBringOver() { bringOverVisible.value = false }

    private fun audioFiles(session: Session) = AudioFiles(File(getApplication<Application>().filesDir, "audio/${digest(session.source.key)}"))

    private suspend fun transfer(next: Session): BringOver {
        val source = sessionFor(null)
        return BringOver(source.db, next.db, flowRunTransport(requireNotNull(next.source.server), subscriptionReadTimeoutMillis = 30_000), audioFiles(source), audioFiles(next)) { job ->
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
        db.onChanged = { revision.update { it + 1 } }
        db.onEdit = { if (address != null) requestSync() }
        editLock.withLock {
            typingJob?.cancel(); typingJob = null; typingMessage = null; activeTypingGroup = null
            history.clear(); updateHistoryActions()
            subscriptionTransitions.value = emptyMap(); subscriptionFailures.value = emptyMap()
            while (messages.tryReceive().isSuccess) { /* discard the previous session’s actions */ }
            _session.value = next
        }
        loadBringOver(next)
        opml(next).resumeSaved()
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
                    withContext(Dispatchers.IO) { next.db.initializeGettingStarted() }
                    status.value = SyncStatus.Ready
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    if (address == null) status.value = SyncStatus.Ready else syncFailed(error)
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
        serverDraftWriter.close()
        connectivity.unregisterNetworkCallback(callback)
        // Wait for every model/download child, including blocking IO, before closing their DBs.
        val databases = sessions.values.map { it.db }
        checkNotNull(viewModelScope.coroutineContext[Job]).invokeOnCompletion { databases.forEach { it.close() } }
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
