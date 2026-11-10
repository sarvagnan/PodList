@file:androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)

package app.podlist

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.ServiceInfo
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.core.app.NotificationCompat
import androidx.work.*
import app.podlist.data.*
import app.podlist.domain.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.io.IOException
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.DataSpec
import android.net.Uri
import java.security.MessageDigest

internal enum class DownloadPhase { Queued, Transferring, Stored, Failed }
internal data class DownloadUi(val phase: DownloadPhase, val received: Long = 0, val total: Long = 0, val storageFull: Boolean = false)

/** WorkManager persists transfer requests across process death; failures await explicit retry.
 * The same one-second rule trigger receives State, Library AND download invalidations.
 */
class AndroidDownloads(private val context: Context, private val model: AppModel, val session: Session) {
    @Volatile internal var rulesSuspended = session.source.server == null && model.session.value?.source?.server != null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val manager = WorkManager.getInstance(context)
    private val tag = "audio:${digest(session.source.key)}"
    private val statuses = MutableStateFlow<Map<String, DownloadUi>>(emptyMap())
    internal val status = statuses.asStateFlow()
    internal val files = AudioFiles(File(context.filesDir, "audio/${digest(session.source.key)}"))
    private val invalidations = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private var work = emptyList<WorkInfo>()

    init {
        scope.launch { withContext(Dispatchers.IO) {
            context.cacheDir.listFiles().orEmpty().filter { it.name.startsWith("download-undo-") && it.lastModified() < System.currentTimeMillis() - 10 * 60_000L }.forEach { it.delete() }
        } }
        scope.launch {
            withContext(Dispatchers.IO) {
                // Leftover partials are never playable; do not delete a running worker's file.
                session.db.query("SELECT episode_id FROM download").forEach {
                    val id = it["episode_id"] as String
                    if (files.stored(id) == null) session.db.execute("DELETE FROM download WHERE episode_id = ?", listOf(id))
                }
            }
            manager.getWorkInfosByTagFlow(tag).collect { work = it; refresh(); invalidations.tryEmit(Unit) }
        }
        scope.launch {
            model.revision.collect { invalidations.emit(Unit) }
        }
        scope.launch {
            @OptIn(FlowPreview::class)
            invalidations.debounce(1000).collect {
                // Keep copied files stable until State replay and all file/row commits finish.
                val transferring = withContext(Dispatchers.IO) { session.db.bringOverPending() }
                if (rulesSuspended || transferring) { refresh(); return@collect }
                val plan = withContext(Dispatchers.IO) { session.db.downloadPlan(session.deviceId, System.currentTimeMillis()) }
                plan.discard.forEach { remove(it) }
                refresh()
                plan.fetch.filter { it !in statuses.value }.forEach { download(it, manual = false) }
            }
        }
    }
    private suspend fun refresh() {
        val stored = withContext(Dispatchers.IO) { session.db.query("SELECT episode_id, bytes FROM download") }
        val next = mutableMapOf<String, DownloadUi>()
        // Latest WorkRequest for an Episode supersedes failed/cancelled attempts.
        for (info in work.sortedBy { it.tags.firstOrNull { tag -> tag.startsWith("requested:") }?.substringAfter(':')?.toLongOrNull() ?: 0 }) {
            val id = info.tags.firstOrNull { it.startsWith("episode:") }?.removePrefix("episode:") ?: continue
            val phase = when (info.state) {
                WorkInfo.State.ENQUEUED, WorkInfo.State.BLOCKED -> DownloadPhase.Queued
                WorkInfo.State.RUNNING -> DownloadPhase.Transferring
                WorkInfo.State.FAILED -> DownloadPhase.Failed
                else -> null
            }
            if (phase != null) next[id] = DownloadUi(phase, info.progress.getLong("received", 0), info.progress.getLong("total", 0), info.outputData.getBoolean("storageFull", false)) else next.remove(id)
        }
        for (row in stored) next[row["episode_id"] as String] = DownloadUi(DownloadPhase.Stored, (row["bytes"] as Number).toLong())
        statuses.value = next
    }
    fun download(episode: String, manual: Boolean = true) {
        if (statuses.value[episode]?.phase in listOf(DownloadPhase.Stored, DownloadPhase.Transferring, DownloadPhase.Queued)) return
        model.requestDownloadNotifications()
        statuses.update { it + (episode to DownloadUi(DownloadPhase.Queued)) }
        val request = OneTimeWorkRequestBuilder<AudioDownloadWorker>()
            .setInputData(workDataOf("origin" to session.source.key, "episode" to episode, "manual" to manual))
            .setConstraints(Constraints.Builder().setRequiredNetworkRequest(anyNetwork(), NetworkType.CONNECTED).build())
            .addTag(tag).addTag("episode:$episode").addTag("requested:${System.currentTimeMillis()}").build()
        manager.enqueueUniqueWork("$tag:$episode", ExistingWorkPolicy.REPLACE, request)
    }
    // NetworkType.CONNECTED also demands Android's internet validation, which a LAN-only network reaching
    // the server never passes. VPNs must qualify too, because the server may only be reachable over one.
    private fun anyNetwork() = NetworkRequest.Builder()
        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
        .build()
    fun cancel(episode: String) {
        manager.cancelUniqueWork("$tag:$episode")
        statuses.update { it - episode }
        invalidations.tryEmit(Unit)
    }
    fun removeWithUndo(episode: String) {
        cancel(episode)
        scope.launch {
            val snapshot = withContext(Dispatchers.IO) { files.withCommitLock(episode) {
                val row = session.db.query("SELECT * FROM download WHERE episode_id = ?", listOf(episode)).firstOrNull() ?: return@withCommitLock null
                val original = files.stored(episode) ?: return@withCommitLock null
                val backup = File.createTempFile("download-undo-", ".audio", context.cacheDir)
                check(original.renameTo(backup))
                session.db.execute("DELETE FROM download WHERE episode_id = ?", listOf(episode))
                Triple(original, backup, row)
            } }
            refresh()
            if (snapshot != null) {
                val (original, backup, row) = snapshot
                model.editLock.withLock {
                    model.recordHistory(session, AppMessage(R.string.download_removed), storedStep(episode, original, backup, row, restore = true))
                }
            }
        }
    }
    private fun storedStep(episode: String, original: File, backup: File, row: Row, restore: Boolean): ReversibleEdit = ReversibleEdit {
        withContext(Dispatchers.IO) { files.withCommitLock(episode) {
            if (restore) {
                check(backup.exists() && backup.renameTo(original))
                session.db.execute("INSERT OR REPLACE INTO download VALUES (?, ?, ?, ?)", listOf(episode, row["manual"], row["bytes"], row["saved_at"]))
            } else {
                check(original.exists() && original.renameTo(backup))
                session.db.execute("DELETE FROM download WHERE episode_id = ?", listOf(episode))
            }
        } }
        refresh()
        model.requestReveal(Reveal("episode:$episode"))
        storedStep(episode, original, backup, row, !restore)
    }

    internal fun requestStep(ids: List<String>, request: Boolean): ReversibleEdit = ReversibleEdit {
        ids.forEach { if (request) download(it) else removeAwait(it) }
        requestStep(ids, !request)
    }

    internal fun offerRequestUndo(ids: List<String>, request: Boolean, message: Int) {
        scope.launch { model.editLock.withLock { model.recordHistory(session, AppMessage(message), requestStep(ids, request)) } }
    }

    private suspend fun removeAwait(episode: String) {
        cancel(episode)
        withContext(Dispatchers.IO) {
            files.remove(episode)
            session.db.execute("DELETE FROM download WHERE episode_id = ?", listOf(episode))
        }
        refresh()
    }

    fun remove(episode: String) {
        cancel(episode)
        scope.launch {
            withContext(Dispatchers.IO) {
                files.remove(episode)
                session.db.execute("DELETE FROM download WHERE episode_id = ?", listOf(episode))
            }
            refresh()
            invalidations.tryEmit(Unit)
        }
    }
}

class AudioDownloadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    companion object {
        private val permits = Semaphore(2)
        private val episodeLocks = java.util.concurrent.ConcurrentHashMap<String, Mutex>()
    }
    override suspend fun doWork(): Result = episodeLocks.getOrPut("${inputData.getString("origin")}:${inputData.getString("episode")}") { Mutex() }.withLock {
        permits.withPermit { transfer() }
    }
    private suspend fun transfer(): Result = withContext(Dispatchers.IO) {
            val origin = inputData.getString("origin") ?: return@withContext Result.failure()
            val episode = inputData.getString("episode") ?: return@withContext Result.failure()
            val model = (applicationContext as PodListApplication).model
            val session = withContext(Dispatchers.Main) { model.sessionFor(if (origin == "standalone") null else ServerAddress.parse(origin, BuildConfig.DEBUG)) }
            val downloads = withContext(Dispatchers.Main) { model.downloads(session) }
            try {
                setForeground(foreground())
                val sources = PlaybackPolicy.sources(null, session.db.playbackMetadata(episode).audioUrl, session.source.audioFallback(episode))
                val transferContext = currentCoroutineContext()
                downloads.files.withCommitLock(episode) {
                    // A pending server worker may race with bring-over. Keep its complete copied file
                    // and Manual ownership instead of overwriting it (or deleting it on cancellation).
                    val existing = session.db.query("SELECT bytes FROM download WHERE episode_id = ?", listOf(episode)).firstOrNull()
                    val stored = downloads.files.stored(episode)
                    if (existing != null && stored != null && stored.length() == (existing["bytes"] as Number).toLong()) {
                        if (inputData.getBoolean("manual", true)) session.db.execute("UPDATE download SET manual = 1 WHERE episode_id = ?", listOf(episode))
                        return@withCommitLock
                    }
                    var committed = false
                    try {
                        val bytes = downloads.files.save(episode, sources) { url, output ->
                            val source = DefaultHttpDataSource.Factory().setUserAgent("PodList Android").setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(10_000).setReadTimeoutMs(20_000).createDataSource()
                            try {
                                val total = source.open(DataSpec(Uri.parse(url)))
                                setForegroundAsync(foreground(0, total)).get()
                                var received = 0L
                                var lastProgress = 0L
                                run {
                                    val buffer = ByteArray(32 * 1024)
                                    while (true) {
                                        if (isStopped || !transferContext.isActive) throw AudioTransferCancelled()
                                        val count = source.read(buffer, 0, buffer.size)
                                        if (count < 0) break
                                        output.write(buffer, 0, count)
                                        received += count
                                        val now = android.os.SystemClock.elapsedRealtime()
                                        if (now - lastProgress >= 250) {
                                            setProgressAsync(workDataOf("received" to received, "total" to total))
                                            setForegroundAsync(foreground(received, total)).get()
                                            lastProgress = now
                                        }
                                    }
                                }
                                if (total >= 0 && total != received) throw IOException("Incomplete audio")
                                setProgressAsync(workDataOf("received" to received, "total" to total))
                                setForegroundAsync(foreground(received, total)).get()
                                received
                            } finally { source.close() }
                        }
                        committed = true
                        ensureActive()
                        session.db.execute("INSERT OR REPLACE INTO download (episode_id, manual, bytes, saved_at) VALUES (?, ?, ?, ?)", listOf(episode, if (inputData.getBoolean("manual", true)) 1 else 0, bytes, System.currentTimeMillis()))
                    } catch (error: CancellationException) {
                        if (committed) downloads.files.remove(episode)
                        throw error
                    }
                }
                session.db.notifyChanged()
                Result.success()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                val storageFull = generateSequence<Throwable>(error) { it.cause }.any {
                    it is android.system.ErrnoException && it.errno == android.system.OsConstants.ENOSPC ||
                        it.message?.contains("ENOSPC", ignoreCase = true) == true ||
                        it.message?.contains("No space left on device", ignoreCase = true) == true
                }
                Result.failure(workDataOf("storageFull" to storageFull))
            }
    }
    private fun foreground(received: Long = 0, total: Long = -1): ForegroundInfo {
        val context = applicationContext
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("downloads", context.getString(R.string.downloads), NotificationManager.IMPORTANCE_LOW))
        val progress = app.podlist.domain.DownloadProgress(received, total)
        val bytes = android.text.format.Formatter.formatShortFileSize(context, progress.boundedReceived)
        val detail = if (progress.indeterminate) bytes else context.getString(R.string.download_bytes,
            bytes, android.text.format.Formatter.formatShortFileSize(context, total))
        val notification = NotificationCompat.Builder(context, "downloads")
            .setSmallIcon(R.drawable.ic_download).setContentTitle(context.getString(R.string.download_in_progress))
            .setOngoing(true).setOnlyAlertOnce(true).setContentText(detail)
            .setProgress(progress.maximum, progress.progress, progress.indeterminate)
            .addAction(0, context.getString(R.string.cancel_download), WorkManager.getInstance(context).createCancelPendingIntent(id)).build()
        return ForegroundInfo(id.hashCode(), notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    }
}

internal fun digest(value: String) = MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }
