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
    var tab by rememberSaveable(playlist.id) { mutableIntStateOf(0) }
    val reveal by model.reveal.collectAsState()
    LaunchedEffect(reveal?.token) { if (reveal?.route == "playlist:${playlist.id}") tab = 0 }
    Column {
        Hint(listOfNotNull(if (playlist.id == data.state.activePlaylistId) stringResource(R.string.active) else null,
            pluralStringResource(R.plurals.entry_count, playlist.entries.size, playlist.entries.size), stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played else R.string.keeps_entries)).joinToString(" · "))
        if (playlist.id != data.state.activePlaylistId) TextButton(onClick = { model.switchPlaylist(playlist.id); started() }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.switch_playlist)) }
        PrimaryTabRow(selectedTabIndex = tab) { listOf(R.string.entries, R.string.history, R.string.timeline).forEachIndexed { index, label -> Tab(unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant, selected = tab == index, onClick = { tab = index }, text = { Text(stringResource(label)) }) } }
        if (tab == 2) TimelineScreen(playlist, data, session, open) { tab = 0 }
        else if (tab == 0) EntryList(playlist, data, session, { id -> open("episode:$id") })
        else LazyColumn {
            if (playlist.history.isEmpty()) item { EmptyMessage(R.string.no_history); TextButton(onClick = { tab = 0 }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.entries)) } }
            items(playlist.history) { history -> ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.clickable { open("episode:${history.episodeId}") }, headlineContent = { Text(data.episodes.find { it["id"] == history.episodeId }?.get("title") as? String ?: stringResource(R.string.metadata_pending), maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(stringResource(R.string.finished_at, dateTime(history.finishedAt))) }) }
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

@Composable
internal fun DownloadAction(episode: String, session: Session) {
    val model = LocalAppModel.current
    val downloads = model.downloads(session)
    val statuses by downloads.status.collectAsState()
    val status = statuses[episode]
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Text(stringResource(when (status?.phase) { DownloadPhase.Stored -> R.string.download_stored; DownloadPhase.Failed -> R.string.download_failed; DownloadPhase.Queued -> R.string.download_queued; DownloadPhase.Transferring -> R.string.download_in_progress; null -> R.string.download_none }), style = MaterialTheme.typography.bodySmall)
        if (status?.phase == DownloadPhase.Transferring && status.total > 0) LinearProgressIndicator(progress = { (status.received.toFloat() / status.total).coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().then(ProgressModifier(R.string.download_in_progress)))
        DetailAction(R.drawable.ic_download, stringResource(when (status?.phase) { DownloadPhase.Stored -> R.string.remove_download; DownloadPhase.Queued, DownloadPhase.Transferring -> R.string.cancel_download; DownloadPhase.Failed -> R.string.retry_download; null -> R.string.download })) {
            when (status?.phase) {
                DownloadPhase.Stored -> downloads.removeWithUndo(episode)
                DownloadPhase.Queued, DownloadPhase.Transferring -> {
                    downloads.cancel(episode)
                    downloads.offerRequestUndo(listOf(episode), true, R.string.download_stopped)
                }
                else -> {
                    downloads.download(episode)
                    downloads.offerRequestUndo(listOf(episode), false, R.string.m4_downloads_requested)
                }
            }
        }
    }
}

@Composable
internal fun PlaybackSettingsEditor(settings: PlaybackSettings) {
    val model = LocalAppModel.current
    var sheet by rememberSaveable { mutableStateOf<Int?>(null) }
    val save = { next: PlaybackSettings -> model.edit(Change.SetPlaybackSettings(next)); sheet = null }
    Column(Modifier.fillMaxWidth()) {
        Hint(stringResource(R.string.settings_inheritance))
        ValueRow(stringResource(R.string.speed), speedSetting(settings.speed)) { sheet = 0 }
        ValueRow(stringResource(R.string.m4_skip_intro), secondsSetting(settings.skipIntro)) { sheet = 1 }
        ValueRow(stringResource(R.string.m4_skip_outro), secondsSetting(settings.skipOutro)) { sheet = 2 }
        SwitchRow(stringResource(R.string.volume_boost), settings.volumeBoost) { model.edit(Change.SetPlaybackSettings(settings.copy(volumeBoost = it))) }
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
