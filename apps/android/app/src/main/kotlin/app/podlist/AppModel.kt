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
enum class SyncStatus { Loading, Ready, Offline, Error, UpdateRequired }
data class Session(val source: LibrarySource, val db: LocalDatabase, val deviceId: String) {
    internal val feedRefresh = FeedRefresh()
}
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
    private val formDraftStates = mutableMapOf<String, FormDraftState>()
    private val restoredDrafts = mutableMapOf<String, DraftCheckpoint>()

    internal fun restoreDraftCheckpoints(checkpoints: Map<String, DraftCheckpoint>) {
        restoredDrafts.putAll(checkpoints.filterKeys { it !in formDraftStates })
    }

    internal fun draftCheckpoints(): Map<String, DraftCheckpoint> =
        restoredDrafts + formDraftStates.mapNotNull { (origin, drafts) ->
            drafts.checkpoint()?.let { origin to it }
        }.toMap()
    private val formDraftLock = Mutex()
    internal suspend fun formDrafts(session: Session): FormDraftState = formDraftLock.withLock {
        val origin = session.source.key
        formDraftStates.getOrPut(origin) {
            val store = FormDraftStore(session.db)
            val recovery = restoredDrafts[origin]
            val (values, version) = withContext(Dispatchers.IO) {
                recovery?.let(store::restoreCheckpoint)
                store.load() to store.draftRevision()
            }
            restoredDrafts.remove(origin)
            FormDraftState(store, values, version)
        }
    }
    internal fun loadedFormDrafts(session: Session): FormDraftState? = formDraftStates[session.source.key]

    internal fun afterDraftsSaved(drafts: FormDraftState, failed: () -> Unit, action: () -> Unit) {
        viewModelScope.launch {
            try { drafts.flush() } catch (error: IllegalStateException) {
                android.util.Log.e("PodList", "Could not save form drafts", error)
                failed()
                return@launch
            }
            action()
        }
    }
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
    private val deviceSettings by lazy { DeviceSettingsStore(File(application.filesDir, "device-settings.properties")) }
    private var serverDraftWriter: DraftWriteBuffer? = null
    private var savedServerDraft: DraftCheckpoint? = null
    private var serverDraftVersion = 0L

    private fun serverWriter(revision: String?) = DraftWriteBuffer(onFailure = {
        android.util.Log.e("PodList", "Could not save server draft", it)
    }, baseline = revision, write = { batch, token -> deviceSettings.writeServerCheckpoint(batch, token) })

    fun flushDrafts() { serverDraftWriter?.requestFlush(); formDraftStates.values.forEach { it.requestFlush() } }
    internal fun serverDraftCheckpoint() = serverDraftWriter?.checkpoint() ?: savedServerDraft

    internal fun restoreServerDraft(checkpoint: DraftCheckpoint) {
        savedServerDraft = checkpoint
        if (serverDraftWriter != null) viewModelScope.launch { recoverServerDraft() }
    }

    private suspend fun recoverServerDraft() {
        val writer = serverDraftWriter ?: return
        val checkpoint = savedServerDraft ?: return
        savedServerDraft = null
        if (serverDraftVersion != 0L) return
        val draft = writer.afterFlush {
            deviceSettings.restoreServerCheckpoint(checkpoint)
            writer.updateRecoveryBaseline(deviceSettings.serverDraftRevision())
            deviceSettings.serverDraft()
        }
        if (serverDraftVersion == 0L) showServerDraft(draft)
    }

    private val _serverAddressDraft = MutableStateFlow<String?>(null)
    val serverAddressDraft = _serverAddressDraft.asStateFlow()
    internal val serverAddressSelection = MutableStateFlow<String?>(null)

    internal fun setServerDraft(address: String, selection: String) {
        val writer = serverDraftWriter ?: return
        serverDraftVersion++
        writer.putAll(mapOf("serverAddressDraft" to address, "serverAddressSelection" to selection))
        showServerDraft(ServerDraft(address, selection))
    }

    private fun showServerDraft(draft: ServerDraft) {
        serverAddressSelection.value = draft.selection
        _serverAddressDraft.value = draft.address
    }

    private suspend fun replaceServerDraft(next: ServerDraft): ServerDraft {
        val version = ++serverDraftVersion
        val before = checkNotNull(serverDraftWriter).afterFlush { deviceSettings.replaceServerDraft(next) }
        if (serverDraftVersion == version) showServerDraft(next)
        connectionError.value = null
        return before
    }

    private fun serverDraftStep(snapshot: ServerDraft): ReversibleEdit = ReversibleEdit {
        val before = replaceServerDraft(snapshot)
        requestReveal(Reveal("server"))
        serverDraftStep(before)
    }

    /** Before first connection there is no Library history; the form owns that snackbar's Undo. */
    internal suspend fun discardServerDraft(): (suspend () -> Unit)? = editLock.withLock {
        val before = replaceServerDraft(ServerDraft(null, null))
        val current = session.value
        if (current == null) return@withLock { replaceServerDraft(before); Unit }
        recordHistory(current, AppMessage(R.string.draft_discarded), serverDraftStep(before))
        null
    }

    private val _appearance = MutableStateFlow(Appearance.System)
    val appearance = _appearance.asStateFlow()

    private fun showAppearance(value: Appearance) {
        _appearance.value = value
        getApplication<Application>().applyLaunchAppearance(value)
    }

    private suspend fun applyAppearance(value: Appearance) {
        withContext(Dispatchers.IO) { deviceSettings.appearance = value }
        showAppearance(value)
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
        val current = session.value
        viewModelScope.launch { editLock.withLock {
            val before = _appearance.value
            if (before == value) return@withLock
            applyAppearance(value)
            if (current != null) recordHistory(current, AppMessage(R.string.appearance_changed), appearanceStep(before), notify = false)
        } }
    }
    private val _session = MutableStateFlow<Session?>(null)
    val session = _session.asStateFlow()
    val starting = MutableStateFlow(true)
    val status = MutableStateFlow(SyncStatus.Loading)
    internal val syncFailureResource = MutableStateFlow(R.string.sync_server_error)
    @Volatile private var compatibilityFailure: SyncCompatibilityFailure? = null
    private fun syncFailed(error: Exception) {
        if (error is SyncCompatibilityFailure) compatibilityFailure = error
        syncFailureResource.value = when {
            error is SyncCompatibilityFailure -> if (error._tag == "UpdateRequired") R.string.sync_update_required else R.string.sync_server_update_required
            error is HttpFailure && error.status in listOf(401, 403) -> R.string.sync_signed_out
            error is HttpFailure -> R.string.sync_server_error
            error is SSLException -> R.string.sync_tls_error
            error is IOException -> R.string.offline
            else -> R.string.sync_response_error
        }
        status.value = if (error is SyncCompatibilityFailure) SyncStatus.UpdateRequired else if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
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
            if (_session.value?.source?.server != null && connectivity.activeNetwork == null && status.value != SyncStatus.UpdateRequired) status.value = SyncStatus.Offline
        }
    }

    init {
        connectivity.registerDefaultNetworkCallback(callback)
        viewModelScope.launch {
            try {
                val (appearance, draft, revision) = withContext(Dispatchers.IO) {
                    Triple(deviceSettings.appearance, deviceSettings.serverDraft(), deviceSettings.serverDraftRevision())
                }
                serverDraftWriter = serverWriter(revision)
                showServerDraft(draft)
                recoverServerDraft()
                showAppearance(appearance)
                val (saved, standalone) = withContext(Dispatchers.IO) {
                    preferences.getString("server", null) to preferences.getBoolean("standalone", false)
                }
                if (saved != null) activate(ServerAddress.parse(saved, BuildConfig.DEBUG))
                else if (standalone) activate(null)
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                connectionError.value = classify(error)
            } finally { starting.value = false }
        }
    }

    fun offerUnsubscribe(current: Session, feed: String) = offerSubscriptionEdit(current, feed, subscribe = false)

    fun offerResubscribe(current: Session, feed: String) = offerSubscriptionEdit(current, feed, subscribe = true)

    private fun offerSubscriptionEdit(current: Session, feed: String, subscribe: Boolean) {
        viewModelScope.launch { editLock.withLock {
            if (session.value !== current) return@withLock
            val title = withContext(Dispatchers.IO) {
                current.db.query("SELECT title FROM subscription WHERE feed_url = ?", listOf(feed))
                    .firstOrNull()?.get("title") as? String ?: feed
            }
            val message = if (subscribe) R.string.unsubscribed_message else R.string.subscribed_message
            recordHistory(current, AppMessage(message, formatArgs = listOf(title)), subscriptionStep(current, listOf(feed), subscribe))
        } }
    }

    fun startOnPhone() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { check(preferences.edit().remove("server").putBoolean("standalone", true).commit()) }
            activate(null)
        }
    }

    internal fun refreshFeeds(current: Session, target: FeedRefreshTarget) {
        if (_session.value !== current) return
        viewModelScope.launch {
            val result = current.feedRefresh.run(target, refresh = {
                withContext(Dispatchers.IO) {
                    when (target) {
                        FeedRefreshTarget.All -> current.source.refreshAllFeeds()
                        is FeedRefreshTarget.Podcast -> {
                            current.source.refreshSubscription(target.id)
                            null
                        }
                    }
                }
            }, sync = {
                if (current.source.server != null && _session.value === current) {
                    withContext(Dispatchers.IO) { current.source.refresh() }
                }
            }) ?: return@launch
            if (_session.value !== current) return@launch
            revision.update { it + 1 }
            if (current.source.server != null && result.refreshError == null) {
                if (result.syncError == null) status.value = SyncStatus.Ready
                else if (result.syncError is SyncCompatibilityFailure) syncFailed(result.syncError)
            }
            if (result.succeeded) {
                messages.trySend(AppMessage(if (target == FeedRefreshTarget.All) R.string.feeds_refreshed else R.string.podcast_refreshed))
            }
        }
    }
    fun requestSync() { triggers.trySend(Unit) }
    fun retrySync() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { (_session.value?.source as? ServerLibrary)?.retrySync() }
            compatibilityFailure = null
            requestSync()
        }
    }

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
            checkNotNull(serverDraftWriter).afterFlush { deviceSettings.writeServerDraft(ServerDraft(null, null)) }
            serverDraftVersion++
            showServerDraft(ServerDraft(null, null))
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
            if (_session.value?.db === db) syncFailed(error)
        }
        Session(source, db, withContext(Dispatchers.IO) { db.installation().id }).also { sessions[key] = it }
    }

    fun showBringOver() { if (_bringOver.value != null) bringOverVisible.value = true }
    fun dismissBringOver() { bringOverVisible.value = false }

    private fun audioFiles(session: Session) = AudioFiles(File(getApplication<Application>().filesDir, "audio/${digest(session.source.key)}"))

    private suspend fun transfer(next: Session): BringOver {
        val source = sessionFor(null)
        return withContext(Dispatchers.IO) {
            BringOver(source.db, next.db, flowRunTransport(requireNotNull(next.source.server), subscriptionReadTimeoutMillis = 30_000),
                audioFiles(source), audioFiles(next)) { job ->
                _bringOver.update { current -> if (current?.origin == next.source.key) current.copy(job = job, counts = job.snapshot.counts, error = false) else current }
            }
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

    fun retryBringOver() { retrySync() }

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
        compatibilityFailure = null
        status.value = if (address == null) SyncStatus.Ready else SyncStatus.Loading
        downloads(next)
        if (address == null) scheduleFeedRefresh(getApplication())
        worker = viewModelScope.launch {
            // Startup is immediate. Thereafter timeout starts after each completed pass.
            while (isActive) {
                if (address != null && revision.value == 0L && status.value != SyncStatus.UpdateRequired) status.value = SyncStatus.Loading
                try {
                    compatibilityFailure?.let { throw it }
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
        serverDraftWriter?.close()
        connectivity.unregisterNetworkCallback(callback)
        // Wait for model/download children and queued drafts before closing their databases.
        val databases = sessions.values.associate { it.db to loadedFormDrafts(it) }
        checkNotNull(viewModelScope.coroutineContext[Job]).invokeOnCompletion {
            databases.forEach { (db, drafts) ->
                if (drafts == null) db.close() else drafts.close(db::close)
            }
        }
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
