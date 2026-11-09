@file:androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)

package app.podlist

import android.app.PendingIntent
import android.content.Intent
import android.media.audiofx.LoudnessEnhancer
import android.net.Uri
import android.os.SystemClock
import androidx.media3.common.*
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.*
import app.podlist.data.*
import app.podlist.domain.*
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.first
import java.util.TimeZone

internal data class PlaybackUi(
    val playlistId: String, val playlistName: String, val metadata: PlaybackMetadata,
    val position: Double, val duration: Double?, val playing: Boolean, val speed: Float,
    val nextCount: Int, val sleep: SleepTimer?, val error: Boolean = false, val buffering: Boolean = false,
    val activePlaylistName: String = playlistName, val activeNextCount: Int = nextCount
) {
    val chapterIndex get() = PlaybackPolicy.chapterIndex(metadata.chapters, position)
    val artwork get() = PlaybackPolicy.artwork(metadata.chapters, position, metadata.episodeArtwork, metadata.podcastArtwork)
}
internal interface PlaybackHost {
    fun playNow(episode: String)
    fun playEntry(playlist: String, episode: String)
    fun switchPlaylist(playlist: String)
    fun toggle()
    fun seek(seconds: Double)
    fun speed(value: Float)
    fun sleep(timer: SleepTimer?)
    fun restore()
    fun flush()
    fun close()
}

/** The platform adapter owns audio and serializes events. ListeningSession and PlaybackPolicy
 * own the protocol decisions, exercised on the JVM against shared contract vectors.
 */
class PlaybackService : MediaLibraryService(), PlaybackHost {
    private val model get() = (application as PodListApplication).model
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val events = Channel<suspend () -> Unit>(Channel.UNLIMITED)
    private lateinit var audio: ExoPlayer
    private lateinit var library: MediaLibrarySession
    private var loadedSession: Session? = null
    private var accounting: ListeningSession? = null
    private var info: PlaybackMetadata? = null
    private var playlistId: String? = null
    private var settings = PlaybackSettings(1.0, 0.0, 0.0, false)
    private var timer: SleepTimer? = null
    private var ended = false
    private var observedPlayed: Played? = null
    private var candidates = emptyList<String>()
    private var candidate = 0
    private var loadingAt = 0L
    private var reportAt = 0L
    private var error = false
    private var generation = 0L
    private var internalChange = false
    private var enhancer: LoudnessEnhancer? = null

    override fun onCreate() {
        super.onCreate()
        val http = DefaultHttpDataSource.Factory().setUserAgent("PodList Android").setConnectTimeoutMs(10_000).setReadTimeoutMs(10_000).setAllowCrossProtocolRedirects(true)
        audio = ExoPlayer.Builder(this)
            .setMediaSourceFactory(DefaultMediaSourceFactory(DefaultDataSource.Factory(this, http)))
            .setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(), true)
            .setHandleAudioBecomingNoisy(true).setWakeMode(C.WAKE_MODE_LOCAL)
            .setSeekBackIncrementMs(15_000).setSeekForwardIncrementMs(30_000).build()
        val player = object : ForwardingPlayer(audio) {
            override fun play() { enqueue { start() } }
            override fun pause() { enqueue { pauseAudio() } }
            override fun setPlayWhenReady(playWhenReady: Boolean) { if (playWhenReady) play() else pause() }
            override fun stop() { pause() }
            override fun seekTo(positionMs: Long) { seek(positionMs / 1000.0) }
            override fun seekTo(mediaItemIndex: Int, positionMs: Long) { seek(positionMs / 1000.0) }
            override fun seekBack() { seek(position() - 15) }
            override fun seekForward() { seek(position() + 30) }
            override fun seekToPrevious() = seekBack()
            override fun seekToNext() = seekForward()
            override fun setPlaybackSpeed(speed: Float) { speed(speed) }
            override fun setPlaybackParameters(playbackParameters: PlaybackParameters) { speed(playbackParameters.speed) }
            override fun getAvailableCommands(): Player.Commands = super.getAvailableCommands().buildUpon()
                .remove(Player.COMMAND_SEEK_TO_NEXT).remove(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
                .remove(Player.COMMAND_SEEK_TO_PREVIOUS).remove(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
                .add(Player.COMMAND_SEEK_BACK).add(Player.COMMAND_SEEK_FORWARD).build()
        }
        val activity = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        library = MediaLibrarySession.Builder(this, player, Browser())
            .setSessionActivity(activity)
            .setMediaButtonPreferences(listOf(
                CommandButton.Builder(CommandButton.ICON_SKIP_BACK_15).setPlayerCommand(Player.COMMAND_SEEK_BACK).setDisplayName(getString(R.string.back_15)).build(),
                CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD_30).setPlayerCommand(Player.COMMAND_SEEK_FORWARD).setDisplayName(getString(R.string.forward_30)).build()
            )).build()
        audio.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                if (internalChange) return
                val stoppedPosition = position()
                enqueueAudio {
                    if (!isPlaying) {
                        event(ListeningSession.Event.Position(stoppedPosition, knownDuration()))
                        event(ListeningSession.Event.Flush)
                    }
                    event(if (isPlaying) ListeningSession.Event.Play else if (audio.playWhenReady) ListeningSession.Event.Discontinuity else ListeningSession.Event.Pause)
                    publish()
                }
            }
            override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
                if (!internalChange && !playWhenReady) enqueueAudio { event(ListeningSession.Event.Pause); publish(); follow() }
            }
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (internalChange) return
                enqueueAudio {
                    when (playbackState) {
                        Player.STATE_ENDED -> boundary(true)
                        Player.STATE_BUFFERING -> { event(ListeningSession.Event.Discontinuity); loadingAt = SystemClock.elapsedRealtime() }
                        Player.STATE_READY -> loadingAt = 0
                    }
                    publish()
                }
            }
            override fun onPositionDiscontinuity(oldPosition: Player.PositionInfo, newPosition: Player.PositionInfo, reason: Int) {
                if (internalChange) return
                enqueueAudio {
                    if (reason == Player.DISCONTINUITY_REASON_SEEK) {
                        event(ListeningSession.Event.Position(oldPosition.positionMs / 1000.0, knownDuration()))
                        event(ListeningSession.Event.Seek(newPosition.positionMs / 1000.0))
                    }
                    event(ListeningSession.Event.Discontinuity)
                    publish()
                }
            }
            override fun onPlaybackParametersChanged(playbackParameters: PlaybackParameters) {
                if (!internalChange) enqueueAudio { event(ListeningSession.Event.Speed(playbackParameters.speed.toDouble())); publish() }
            }
            override fun onAudioSessionIdChanged(audioSessionId: Int) { boost() }
            override fun onPlayerError(error: PlaybackException) { enqueueAudio { fallback() } }
        })
        model.playbackHost = this
        scope.launch {
            for (action in events) try { action() } catch (failure: Exception) {
                if (failure is CancellationException) throw failure
                error = true
                audio.pause()
                publish()
            }
        }
        scope.launch { model.revision.collect { enqueue { refreshMetadata(); follow(); publish(); notifyBrowser() } } }
        scope.launch {
            while (isActive) {
                delay(500)
                enqueue {
                    if (audio.isPlaying) event(ListeningSession.Event.Position(position(), knownDuration()))
                    if (info != null) boundary(false)
                    if (audio.playWhenReady && loadingAt > 0 && SystemClock.elapsedRealtime() - loadingAt >= 10_000) fallback()
                    publish()
                }
            }
        }
    }
    private fun enqueue(action: suspend () -> Unit) { events.trySend(action) }
    private fun enqueueAudio(action: suspend () -> Unit) {
        val token = generation
        enqueue { if (generation == token) action() }
    }
    private fun position() = audio.currentPosition.coerceAtLeast(0) / 1000.0
    private fun knownDuration(): Double? = audio.duration.takeIf { it != C.TIME_UNSET && it > 0 }?.div(1000.0) ?: info?.duration
    private suspend fun edit(change: Change) {
        edits(listOf(change))
    }
    private suspend fun edits(changes: List<Change>) {
        val session = loadedSession ?: model.session.value ?: return
        withContext(Dispatchers.IO) { session.db.recordAll(changes, System.currentTimeMillis()) }
    }
    private suspend fun event(event: ListeningSession.Event) {
        val at = System.currentTimeMillis()
        val offset = -TimeZone.getDefault().getOffset(at) / 60_000
        val changes = accounting?.accept(event, at, offset).orEmpty()
        changes.filterIsInstance<Change.ReportPosition>().lastOrNull()?.let { reportAt = it.listenedAt }
        val session = loadedSession ?: return
        if (changes.isNotEmpty()) withContext(Dispatchers.IO) { session.db.recordAll(changes, at) }
    }
    private suspend fun follow(force: Boolean = false, play: Boolean = false) {
        if (!force && PlaybackPolicy.holdLoaded(audio.playWhenReady, accounting?.finished == true, ended)) return
        val session = model.session.value ?: return
        val state = withContext(Dispatchers.IO) { session.db.loadState() }
        val target = PlaybackPolicy.target(state)
        if (target == null) {
            if (info != null) event(ListeningSession.Event.Flush)
            internalChange = true
            audio.stop(); audio.clearMediaItems()
            internalChange = false
            info = null; accounting = null; model.playback.value = null
            return
        }
        val playlist = target.playlist
        val entry = target.entry
        if (!force && info?.episodeId == entry.episodeId && playlistId == playlist.id && accounting?.finished == false) {
            if (!audio.playWhenReady && entry.positionAt > reportAt && kotlin.math.abs(position() - entry.position) >= 1) {
                event(ListeningSession.Event.Discontinuity)
                internalChange = true; audio.seekTo((entry.position * 1000).toLong()); internalChange = false
                event(ListeningSession.Event.RemotePosition(entry.position, entry.positionAt))
                reportAt = entry.positionAt
            }
            return
        }
        event(ListeningSession.Event.Flush)
        loadedSession = session
        playlistId = playlist.id
        info = withContext(Dispatchers.IO) { session.db.playbackMetadata(entry.episodeId) }
        settings = PlaybackPolicy.settings(state.playbackSettings, info!!.override)
        val start = PlaybackPolicy.startPosition(entry.position, info!!.duration, settings.skipIntro)
        accounting = ListeningSession(playlist.id, entry.episodeId, info!!.subscriptionId, entry.position, settings.speed, info!!.duration, info!!.playedThreshold, initialAt = System.currentTimeMillis())
        reportAt = System.currentTimeMillis()
        ended = false; error = false
        observedPlayed = state.episodeStates[entry.episodeId]?.played
        timer = timer.takeIf { it is SleepTimer.Until }
        val files = model.downloads(session).files
        val stored = withContext(Dispatchers.IO) { files.stored(entry.episodeId)?.toURI()?.toString() }
        candidates = PlaybackPolicy.sources(stored, info!!.audioUrl, session.source.audioFallback(entry.episodeId))
        candidate = 0
        loadSource(start, settings.speed.toFloat(), play)
        if (start != entry.position) event(ListeningSession.Event.Seek(start))
        resolveChapters(session, entry.episodeId)
        publish()
    }
    private fun item(): MediaItem {
        val metadata = info!!
        val artwork = PlaybackPolicy.artwork(metadata.chapters, position(), metadata.episodeArtwork, metadata.podcastArtwork)
        return MediaItem.Builder().setMediaId("entry:${Uri.encode(playlistId)}:${Uri.encode(metadata.episodeId)}")
            .setUri(candidates.getOrElse(candidate) { candidates.last() }).setMediaMetadata(MediaMetadata.Builder()
                .setTitle(metadata.title ?: getString(R.string.metadata_pending)).setArtist(metadata.podcast ?: getString(R.string.app_name))
                .setAlbumTitle(metadata.podcast).setArtworkUri(artwork?.let { Uri.parse(loadedSession!!.source.artwork(it, 512)) })
                .setIsBrowsable(false).setIsPlayable(true).setMediaType(MediaMetadata.MEDIA_TYPE_PODCAST_EPISODE).build()).build()
    }
    private fun loadSource(position: Double, speed: Float, play: Boolean) {
        generation++
        internalChange = true
        audio.setMediaItem(item(), (position.coerceAtLeast(0.0) * 1000).toLong())
        audio.setPlaybackSpeed(speed)
        // Paused loads fetch nothing until Play, so restoring the bar at launch stays quiet offline.
        if (play) audio.prepare()
        audio.playWhenReady = play
        internalChange = false
        loadingAt = if (play) SystemClock.elapsedRealtime() else 0
        boost()
    }
    private suspend fun fallback() {
        if (info == null) return
        val at = position(); val rate = audio.playbackParameters.speed; val wanted = audio.playWhenReady
        event(ListeningSession.Event.Failure)
        candidate++
        if (candidate < candidates.size) {
            event(ListeningSession.Event.Discontinuity)
            loadSource(at, rate, wanted)
        } else {
            error = true; loadingAt = 0
            audio.pause()
        }
        publish()
    }
    private suspend fun boundary(audioEnded: Boolean) {
        if (info == null || ended || (!audio.playWhenReady && !audioEnded && timer !is SleepTimer.Until)) return
        val decision = PlaybackPolicy.boundary(position(), knownDuration(), settings.skipOutro, audioEnded, timer, SystemClock.elapsedRealtime())
        if (decision == PlaybackBoundary.Continue) return
        val episodeEnd = audioEnded || (settings.skipOutro > 0 && knownDuration()?.let { position() >= it - settings.skipOutro } == true)
        if (episodeEnd) { event(ListeningSession.Event.Ended); ended = true }
        if (decision == PlaybackBoundary.Sleep) {
            timer = null
            pauseAudio()
            if (episodeEnd) follow(force = true, play = false)
        } else {
            pauseAudio()
            follow(force = true, play = true)
        }
    }
    private suspend fun start() {
        if (error) { follow(force = true, play = true); return }
        if (info == null || ended) {
            val session = model.session.value ?: return
            val state = withContext(Dispatchers.IO) { session.db.loadState() }
            val playlist = state.playlists.find { it.id == state.activePlaylistId } ?: return
            if (playlist.cursor == null && playlist.entries.isNotEmpty()) {
                loadedSession = session
                edit(Change.SetCursor(playlist.id, playlist.entries.first().episodeId))
            }
            follow(force = true)
        } else follow()
        if (info != null) {
            resume()
            publish()
        }
    }
    private fun resume() {
        if (audio.playbackState == Player.STATE_IDLE) audio.prepare()
        audio.play()
        // STATE_READY only clears the timer on a change, so a resume of ready audio must not arm it.
        if (audio.playbackState != Player.STATE_READY) loadingAt = SystemClock.elapsedRealtime()
    }
    private suspend fun pauseAudio() {
        if (audio.isPlaying) event(ListeningSession.Event.Position(position(), knownDuration()))
        event(ListeningSession.Event.Pause)
        audio.pause()
        loadingAt = 0
        publish()
    }
    override fun playNow(episode: String) = enqueue {
        event(ListeningSession.Event.Flush)
        loadedSession = model.session.value
        val state = withContext(Dispatchers.IO) { loadedSession!!.db.loadState() }
        edit(Change.AddEntry(state.activePlaylistId, episode, Placement.Now))
        if (info?.episodeId == episode && playlistId == state.activePlaylistId && !ended && !error) { resume(); publish() }
        else follow(force = true, play = true)
    }
    override fun playEntry(playlist: String, episode: String) = enqueue {
        event(ListeningSession.Event.Flush)
        loadedSession = model.session.value
        edits(listOf(Change.SetActivePlaylist(playlist), Change.SetCursor(playlist, episode)))
        follow(force = true, play = true)
    }
    override fun switchPlaylist(playlist: String) = enqueue {
        event(ListeningSession.Event.Flush)
        loadedSession = model.session.value
        edit(Change.SetActivePlaylist(playlist))
        val p = withContext(Dispatchers.IO) { loadedSession!!.db.loadState().playlists.find { it.id == playlist } }
        if (p?.cursor == null && !p?.entries.isNullOrEmpty()) edit(Change.SetCursor(playlist, p.entries.first().episodeId))
        follow(force = true, play = true)
    }
    override fun toggle() = enqueue { if (audio.playWhenReady) pauseAudio() else start() }
    override fun seek(seconds: Double) = enqueue {
        if (info == null) return@enqueue
        if (audio.isPlaying) event(ListeningSession.Event.Position(position(), knownDuration()))
        val target = seconds.coerceIn(0.0, knownDuration() ?: Double.MAX_VALUE)
        event(ListeningSession.Event.Seek(target))
        internalChange = true; audio.seekTo((target * 1000).toLong()); internalChange = false
        event(ListeningSession.Event.Discontinuity)
        publish()
    }
    override fun speed(value: Float) = enqueue {
        if (!value.isFinite() || value !in 0.25f..4f) return@enqueue
        if (audio.isPlaying) event(ListeningSession.Event.Position(position(), knownDuration()))
        event(ListeningSession.Event.Speed(value.toDouble()))
        internalChange = true; audio.setPlaybackSpeed(value); internalChange = false
        publish()
    }
    override fun sleep(timer: SleepTimer?) = enqueue { this.timer = timer; publish() }
    override fun restore() = enqueue { if (info == null) follow() }
    override fun flush() = enqueue {
        if (audio.isPlaying) event(ListeningSession.Event.Position(position(), knownDuration()))
        event(ListeningSession.Event.Flush)
    }
    override fun close() = enqueue {
        pauseAudio(); event(ListeningSession.Event.Flush)
        internalChange = true; audio.stop(); audio.clearMediaItems(); internalChange = false
        info = null; accounting = null; timer = null; loadedSession = null
        model.playback.value = null
    }
    private fun boost() {
        enhancer?.release(); enhancer = null
        if (settings.volumeBoost && audio.audioSessionId != C.AUDIO_SESSION_ID_UNSET) {
            enhancer = runCatching { LoudnessEnhancer(audio.audioSessionId).apply { setTargetGain(600); enabled = true } }.getOrNull()
        }
    }
    private suspend fun refreshMetadata() {
        val metadata = info ?: return
        val session = loadedSession ?: return
        val played = withContext(Dispatchers.IO) { session.db.loadState().episodeStates[metadata.episodeId]?.played }
        if (played != null && played != observedPlayed && accounting?.finished != true) event(ListeningSession.Event.ExternalPlayed)
        observedPlayed = played
        val fresh = withContext(Dispatchers.IO) { session.db.playbackMetadata(metadata.episodeId) }
        if (fresh.subscriptionId == null) return
        if (metadata.subscriptionId != fresh.subscriptionId || metadata.playedThreshold != fresh.playedThreshold) event(ListeningSession.Event.Metadata(fresh.subscriptionId, fresh.playedThreshold))
        info = fresh
        if (fresh.audioUrl != metadata.audioUrl && fresh.audioUrl != null) {
            if (audio.isPlaying) event(ListeningSession.Event.Position(position(), knownDuration()))
            event(ListeningSession.Event.Flush)
            event(ListeningSession.Event.Discontinuity)
            val files = model.downloads(session).files
            val local = withContext(Dispatchers.IO) { files.stored(fresh.episodeId)?.toURI()?.toString() }
            candidates = PlaybackPolicy.sources(local, fresh.audioUrl, session.source.audioFallback(fresh.episodeId))
            candidate = 0
            loadSource(position(), audio.playbackParameters.speed, audio.playWhenReady)
        }
    }
    private fun resolveChapters(session: Session, episode: String) {
        scope.launch { withContext(Dispatchers.IO) { runCatching { session.source.chapters(episode) } } }
    }
    private suspend fun publish() {
        val metadata = info ?: return
        val state = withContext(Dispatchers.IO) { loadedSession!!.db.loadState() }
        val playlist = state.playlists.find { it.id == playlistId }
        val index = playlist?.entries?.indexOfFirst { it.episodeId == metadata.episodeId } ?: -1
        val count = if (index >= 0) playlist!!.entries.size - index - 1 else playlist?.cursor?.let { cursor -> playlist.entries.indexOfFirst { it.episodeId == cursor }.takeIf { it >= 0 }?.let { playlist.entries.size - it } } ?: 0
        val systemMetadata = item().mediaMetadata
        if (audio.mediaItemCount > 0 && audio.currentMediaItem?.mediaMetadata != systemMetadata) {
            internalChange = true
            audio.replaceMediaItem(0, audio.getMediaItemAt(0).buildUpon().setMediaMetadata(systemMetadata).build())
            internalChange = false
        }
        val active = state.playlists.find { it.id == state.activePlaylistId }
        val activeIndex = active?.entries?.indexOfFirst { it.episodeId == active.cursor } ?: -1
        val activeNext = if (activeIndex >= 0) active!!.entries.size - activeIndex - 1 else 0
        model.playback.value = PlaybackUi(playlistId!!, playlist?.name ?: getString(R.string.unavailable), metadata, position(), knownDuration(), audio.isPlaying, audio.playbackParameters.speed, count, timer, error, audio.playbackState == Player.STATE_BUFFERING, active?.name ?: getString(R.string.unavailable), activeNext)
    }

    private suspend fun notifyBrowser() {
        val session = model.session.value ?: return
        val state = withContext(Dispatchers.IO) { session.db.loadState() }
        library.notifyChildrenChanged("root", state.playlists.size, null)
        state.playlists.forEach { library.notifyChildrenChanged("playlist:${Uri.encode(it.id)}", it.entries.size, null) }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession = library
    override fun onTaskRemoved(rootIntent: Intent?) { if (!audio.playWhenReady) stopSelf() }
    override fun onDestroy() {
        // Last accepted Position is already durable; flush any pending sub-interval on teardown.
        val at = System.currentTimeMillis()
        accounting?.accept(ListeningSession.Event.Flush, at, -TimeZone.getDefault().getOffset(at) / 60_000)?.forEach { change -> loadedSession?.db?.record(change, at) }
        model.playbackHost = null
        model.playback.value = null
        enhancer?.release(); library.release(); audio.release(); scope.cancel()
        super.onDestroy()
    }

    /** Android Auto: root -> Playlists -> Entries. Episode names are system metadata only. */
    private inner class Browser : MediaLibrarySession.Callback {
        private fun <T> result(serialized: Boolean = false, block: suspend () -> T): ListenableFuture<T> {
            val future = SettableFuture.create<T>()
            val run: suspend () -> Unit = {
                try { future.set(block()) } catch (e: Exception) { future.setException(e) }
            }
            if (serialized) enqueue(run) else scope.launch { run() }
            return future
        }
        override fun onMediaButtonEvent(session: MediaSession, controller: MediaSession.ControllerInfo, intent: Intent): Boolean {
            val key = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, android.view.KeyEvent::class.java) ?: return false
            if (key.action != android.view.KeyEvent.ACTION_DOWN || key.repeatCount != 0) return false
            return when (key.keyCode) {
                android.view.KeyEvent.KEYCODE_MEDIA_NEXT -> { seek(position() + 30); true }
                android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS -> { seek(position() - 15); true }
                else -> false
            }
        }
        override fun onSubscribe(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, parentId: String, params: LibraryParams?): ListenableFuture<LibraryResult<Void>> {
            enqueue { notifyBrowser() }
            return Futures.immediateFuture(LibraryResult.ofVoid(params))
        }
        override fun onGetLibraryRoot(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, params: LibraryParams?): ListenableFuture<LibraryResult<MediaItem>> =
            Futures.immediateFuture(LibraryResult.ofItem(browseItem("root", getString(R.string.playlists), true), params))
        override fun onGetChildren(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, parentId: String, page: Int, pageSize: Int, params: LibraryParams?): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> = result {
            model.starting.first { !it }
            if (page < 0 || pageSize <= 0) return@result LibraryResult.ofError(SessionError.ERROR_BAD_VALUE)
            val local = model.session.value ?: return@result LibraryResult.ofItemList(emptyList(), params)
            val children = withContext(Dispatchers.IO) {
                val state = local.db.loadState()
                if (parentId == "root") state.playlists.map { browseItem("playlist:${Uri.encode(it.id)}", it.name, true) }
                else state.playlists.find { "playlist:${Uri.encode(it.id)}" == parentId }?.let { playlist ->
                    playlist.entries.map { entry ->
                        val metadata = local.db.playbackMetadata(entry.episodeId)
                        browseItem("entry:${Uri.encode(playlist.id)}:${Uri.encode(entry.episodeId)}", metadata.title ?: getString(R.string.metadata_pending), false, metadata.podcast)
                    }
                }.orEmpty()
            }
            LibraryResult.ofItemList(children.drop((page.toLong() * pageSize).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()).take(pageSize), params)
        }
        override fun onGetItem(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, mediaId: String): ListenableFuture<LibraryResult<MediaItem>> = result {
            val local = model.session.value ?: return@result LibraryResult.ofError(SessionError.ERROR_SESSION_DISCONNECTED)
            val parts = mediaId.split(':', limit = 3).map(Uri::decode)
            val item = withContext(Dispatchers.IO) {
                if (mediaId == "root") browseItem("root", getString(R.string.playlists), true)
                else if (parts.first() == "playlist") local.db.loadState().playlists.find { it.id == parts.getOrNull(1) }?.let { browseItem(mediaId, it.name, true) }
                else parts.getOrNull(2)?.let { local.db.playbackMetadata(it) }?.let { browseItem(mediaId, it.title ?: getString(R.string.metadata_pending), false, it.podcast) }
            }
            item?.let { LibraryResult.ofItem(it, null) } ?: LibraryResult.ofError(SessionError.ERROR_BAD_VALUE)
        }
        override fun onPlaybackResumption(session: MediaSession, controller: MediaSession.ControllerInfo, isForPlayback: Boolean): ListenableFuture<MediaSession.MediaItemsWithStartPosition> = result(serialized = true) {
            model.starting.first { !it }
            follow(force = true)
            MediaSession.MediaItemsWithStartPosition(if (info == null) emptyList() else listOf(item()), 0, (position() * 1000).toLong())
        }
        override fun onSetMediaItems(session: MediaSession, controller: MediaSession.ControllerInfo, mediaItems: MutableList<MediaItem>, startIndex: Int, startPositionMs: Long): ListenableFuture<MediaSession.MediaItemsWithStartPosition> = result(serialized = true) {
            val parts = mediaItems.getOrNull(startIndex.coerceAtLeast(0))?.mediaId?.split(':', limit = 3)?.map(Uri::decode)
            if (parts?.size == 3 && parts[0] == "entry") {
                // Perform the Operations before letting Media3 start the resolved source.
                event(ListeningSession.Event.Flush)
                loadedSession = model.session.value
                val state = withContext(Dispatchers.IO) { loadedSession?.db?.loadState() }
                require(state?.playlists?.any { p -> p.id == parts[1] && p.entries.any { it.episodeId == parts[2] } } == true)
                edits(listOf(Change.SetActivePlaylist(parts[1]), Change.SetCursor(parts[1], parts[2])))
                follow(force = true)
            }
            MediaSession.MediaItemsWithStartPosition(if (info == null) emptyList() else listOf(item()), 0, (position() * 1000).toLong())
        }
    }
    private fun browseItem(id: String, title: String, folder: Boolean, podcast: String? = null) = MediaItem.Builder().setMediaId(id).setMediaMetadata(MediaMetadata.Builder().setTitle(title).setArtist(podcast).setIsBrowsable(folder).setIsPlayable(!folder).setMediaType(if (folder) MediaMetadata.MEDIA_TYPE_FOLDER_PLAYLISTS else MediaMetadata.MEDIA_TYPE_PODCAST_EPISODE).build()).build()
}
