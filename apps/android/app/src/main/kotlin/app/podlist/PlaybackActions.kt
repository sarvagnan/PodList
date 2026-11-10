package app.podlist

import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import app.podlist.domain.State
import kotlin.math.roundToInt

@Composable
internal fun PlaylistPage(playlist: Playlist, data: ScreenData, session: Session, open: (String) -> Unit) {
    val model = LocalAppModel.current
    val started = LocalPlaybackStarted.current
    var tab by rememberPlaylistTab(playlist.id)
    var revealEpisode by rememberSaveable(playlist.id) { mutableStateOf<String?>(null) }
    var revealToken by rememberSaveable(playlist.id) { mutableLongStateOf(0L) }
    val reveal by model.entryReveal.collectAsState()
    LaunchedEffect(reveal?.token) {
        reveal?.takeIf { it.route == "playlist:${playlist.id}" }?.let { target ->
            revealEpisode = target.episode
            revealToken = target.token
            tab = 0
            model.entryReveal.compareAndSet(target, null)
        }
    }
    Column {
        Hint(listOfNotNull(if (playlist.id == data.state.activePlaylistId) stringResource(R.string.active) else null,
            pluralStringResource(R.plurals.entry_count, playlist.entries.size, playlist.entries.size), stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played else R.string.keeps_entries)).joinToString(" · "))
        if (PlaylistRules.hasNoCurrentEntry(playlist)) Hint(stringResource(R.string.no_cursor))
        if (playlist.id != data.state.activePlaylistId) ContentTextButton(onClick = { model.switchPlaylist(playlist.id); started() }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.switch_playlist)) }
        PrimaryTabRow(selectedTabIndex = tab) { listOf(R.string.entries, R.string.history, R.string.timeline).forEachIndexed { index, label -> Tab(unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant, selected = tab == index, onClick = { tab = index }, text = { Text(stringResource(label)) }) } }
        if (tab == 2) TimelineScreen(playlist, data, session, open) { tab = 0 }
        else if (tab == 0) EntryList(playlist, data, session, { id -> open("episode:$id") }, reveal = revealEpisode?.let { Reveal("playlist:${playlist.id}", it, revealToken) }, revealConsumed = { revealEpisode = null })
        else LazyColumn(state = rememberBrowsingListState("history")) {
            if (playlist.history.isEmpty()) item { EmptyMessage(R.string.no_history); FilledTonalButton(onClick = { tab = 0 }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.show_entries)) } }
            items(playlist.history) { history -> ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.clickable { open("episode:${history.episodeId}") }, headlineContent = { Text(data.episodes.find { it["id"] == history.episodeId }?.get("title") as? String ?: stringResource(R.string.metadata_pending), style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(stringResource(R.string.finished_at, dateTime(history.finishedAt))) }) }
        }
    }
}

@Composable
internal fun EntryMenu(playlist: Playlist, episode: String) {
    val model = LocalAppModel.current
    val index = playlist.entries.indexOfFirst { it.episodeId == episode }
    var menu by remember { mutableStateOf(false) }
    Row {
        Box {
        ActionIcon(R.drawable.ic_entry_actions, stringResource(R.string.entry_actions)) { menu = true }
        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
            val add = LocalAddEpisode.current
            DropdownMenuItem(text = { Text(stringResource(R.string.add_to_playlist)) }, onClick = { add(episode); menu = false })
            DropdownMenuItem(text = { Text(stringResource(R.string.remove_from_playlist)) }, onClick = { model.removeEntry(playlist.id, episode); menu = false })
            DropdownMenuItem(text = { Text(stringResource(R.string.move_up)) }, enabled = index > 0, onClick = { model.moveEntry(playlist.id, episode, index - 1); menu = false })
            DropdownMenuItem(text = { Text(stringResource(R.string.move_down)) }, enabled = index in 0 until playlist.entries.lastIndex, onClick = { model.moveEntry(playlist.id, episode, index + 1); menu = false })
        }
        }
    }
}

private fun downloadActionLabel(phase: DownloadPhase?): Int = when (phase) {
    DownloadPhase.Stored -> R.string.remove_download
    DownloadPhase.Queued, DownloadPhase.Transferring -> R.string.cancel_download
    DownloadPhase.Failed -> R.string.retry_download
    null -> R.string.download
}

private fun performDownloadAction(downloads: AndroidDownloads, episode: String, phase: DownloadPhase?) {
    when (phase) {
        DownloadPhase.Stored -> downloads.removeWithUndo(episode)
        DownloadPhase.Queued, DownloadPhase.Transferring -> { downloads.cancel(episode); downloads.offerRequestUndo(listOf(episode), true, R.string.download_stopped) }
        else -> { downloads.download(episode); downloads.offerRequestUndo(listOf(episode), false, R.string.m4_downloads_requested) }
    }
}

@Composable
internal fun DownloadMenuItem(episode: String, session: Session, close: () -> Unit) {
    val downloads = LocalAppModel.current.downloads(session)
    val statuses by downloads.status.collectAsState()
    val phase = statuses[episode]?.phase
    DropdownMenuItem(text = { Text(stringResource(downloadActionLabel(phase))) }, onClick = {
        close()
        performDownloadAction(downloads, episode, phase)
    })
}

@Composable
internal fun RowScope.DownloadAction(episode: String, session: Session) {
    val downloads = LocalAppModel.current.downloads(session)
    val statuses by downloads.status.collectAsState()
    val phase = statuses[episode]?.phase
    LabelledAction(if (phase in listOf(DownloadPhase.Queued, DownloadPhase.Transferring)) R.drawable.ic_close else R.drawable.ic_download,
        stringResource(downloadActionLabel(phase))) { performDownloadAction(downloads, episode, phase) }
}

@Composable
internal fun DownloadStatus(episode: String, session: Session, modifier: Modifier = Modifier) {
    val downloads = LocalAppModel.current.downloads(session)
    val statuses by downloads.status.collectAsState()
    val status = statuses[episode] ?: return
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        val message = stringResource(when (status.phase) {
            DownloadPhase.Stored -> R.string.download_stored
            DownloadPhase.Failed -> if (status.storageFull) R.string.download_storage_full else R.string.download_failed
            DownloadPhase.Queued -> R.string.download_queued
            DownloadPhase.Transferring -> R.string.download_in_progress
        })
        if (status.phase == DownloadPhase.Failed) InlineError(message)
        else Text(message, style = MaterialTheme.typography.bodyMedium)
        if (status.phase == DownloadPhase.Failed) {
            ContentTextButton(onClick = { performDownloadAction(downloads, episode, status.phase) }) { Text(stringResource(R.string.retry_download)) }
        }
        if (status.phase == DownloadPhase.Transferring) {
            val progressModifier = Modifier.fillMaxWidth().then(ProgressModifier(R.string.download_in_progress))
            if (status.total > 0) LinearProgressIndicator(progress = { (status.received.toFloat() / status.total).coerceIn(0f, 1f) }, modifier = progressModifier)
            else LinearProgressIndicator(modifier = progressModifier)
        }
    }
}

@Composable
internal fun PlaybackSettingsEditor(settings: PlaybackSettings, field: SettingKey? = null) {
    val model = LocalAppModel.current
    var sheet by rememberSaveable { mutableStateOf<Int?>(null) }
    val save = { next: PlaybackSettings -> model.edit(Change.SetPlaybackSettings(next)) }
    Column(Modifier.fillMaxWidth()) {
        if (field == null) Hint(stringResource(R.string.settings_inheritance))
        if (field == null || field == SettingKey.Speed) ValueRow(stringResource(R.string.speed), speedSetting(settings.speed)) { sheet = 0 }
        if (field == null || field == SettingKey.SkipIntro) ValueRow(stringResource(R.string.m4_skip_intro), secondsSetting(settings.skipIntro)) { sheet = 1 }
        if (field == null || field == SettingKey.SkipOutro) ValueRow(stringResource(R.string.m4_skip_outro), secondsSetting(settings.skipOutro)) { sheet = 2 }
        if (field == null || field == SettingKey.VolumeBoost) SwitchRow(stringResource(R.string.volume_boost), settings.volumeBoost) { model.edit(Change.SetPlaybackSettings(settings.copy(volumeBoost = it))) }
    }
    val seconds = listOf(0.0, 15.0, 30.0, 45.0, 60.0, 90.0, 120.0)
    sheet?.let { which -> EditorSheet(stringResource(listOf(R.string.speed, R.string.m4_skip_intro, R.string.m4_skip_outro)[which]), { sheet = null }) {
        when (which) {
            0 -> ChoiceRows(PlaybackSpeeds.map { it to speedSetting(it) }, settings.speed) { save(settings.copy(speed = it)) }
            1 -> ChoiceRows(seconds.map { it to secondsSetting(it) }, settings.skipIntro) { save(settings.copy(skipIntro = it)) }
            else -> ChoiceRows(seconds.map { it to secondsSetting(it) }, settings.skipOutro) { save(settings.copy(skipOutro = it)) }
        }
    } }
}


internal fun dateTime(at: Long): String {
    val time = java.time.format.DateTimeFormatter.ofLocalizedTime(java.time.format.FormatStyle.SHORT).withZone(java.time.ZoneId.systemDefault()).format(java.time.Instant.ofEpochMilli(at))
    return "${shortDate(at)} · ${time.replace(' ', '\u00a0')}"
}
