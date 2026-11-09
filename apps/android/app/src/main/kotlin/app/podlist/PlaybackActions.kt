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
    Column {
        Hint(listOfNotNull(if (playlist.id == data.state.activePlaylistId) stringResource(R.string.active) else null,
            stringResource(R.string.entry_count, playlist.entries.size), stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played else R.string.keeps_entries)).joinToString(" · "))
        if (playlist.id != data.state.activePlaylistId) TextButton(onClick = { model.switchPlaylist(playlist.id); started() }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.switch_playlist)) }
        PrimaryTabRow(selectedTabIndex = tab) { listOf(R.string.entries, R.string.history, R.string.timeline).forEachIndexed { index, label -> Tab(selected = tab == index, onClick = { tab = index }, text = { Text(stringResource(label)) }) } }
        if (tab == 2) TimelineScreen(playlist, data, session, open) { tab = 0 }
        else LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
            val byId = data.episodes.associateBy { it["id"] }
            when (tab) {
                0 -> {
                    if (playlist.cursor == null) item { Hint(stringResource(R.string.no_cursor)) }
                    if (playlist.entries.isEmpty()) item { EmptyMessage(R.string.no_entries) }
                    items(playlist.entries, key = { it.episodeId }) { entry ->
                        if (playlist.cursor == entry.episodeId) Section(stringResource(if (playlist.id == data.state.activePlaylistId) R.string.cursor_now else if (entry.position > 0) R.string.cursor_resume else R.string.cursor_here))
                        val row = byId[entry.episodeId]
                        if (row == null) Hint(stringResource(R.string.metadata_pending))
                        else EpisodeRow(row, data, session, entry.position, playlist.id) { open("episode:${entry.episodeId}") }
                    }
                }
                1 -> {
                    if (playlist.history.isEmpty()) item { EmptyMessage(R.string.no_history) }
                    items(playlist.history) { history -> ListItem(modifier = Modifier.clickable { open("episode:${history.episodeId}") }, headlineContent = { Text(byId[history.episodeId]?.get("title") as? String ?: stringResource(R.string.metadata_pending)) }, supportingContent = { Text(stringResource(R.string.finished_at, dateTime(history.finishedAt))) }) }
                }

            }
        }
    }
}

@Composable
internal fun EntryMenu(playlist: Playlist, episode: String) {
    val model = LocalAppModel.current
    val index = playlist.entries.indexOfFirst { it.episodeId == episode }
    var menu by remember { mutableStateOf(false) }
    var drag by remember { mutableFloatStateOf(0f) }
    Box {
        IconButton(onClick = { menu = true }, modifier = Modifier.size(48.dp).pointerInput(playlist.entries, episode) {
            detectDragGesturesAfterLongPress(onDragStart = { drag = 0f }, onDrag = { change, amount -> change.consume(); drag += amount.y }, onDragEnd = {
                val moves = (drag / 72.dp.toPx()).roundToInt()
                val to = (index + moves).coerceIn(0, playlist.entries.lastIndex)
                if (to != index) model.moveEntry(playlist.id, episode, to)
                drag = 0f
            }, onDragCancel = { drag = 0f })
        }) { Icon(painterResource(R.drawable.ic_entry_actions), stringResource(R.string.entry_actions)) }
        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
            DropdownMenuItem(text = { Text(stringResource(R.string.move_up)) }, enabled = index > 0, onClick = { model.moveEntry(playlist.id, episode, index - 1); menu = false })
            DropdownMenuItem(text = { Text(stringResource(R.string.move_down)) }, enabled = index in 0 until playlist.entries.lastIndex, onClick = { model.moveEntry(playlist.id, episode, index + 1); menu = false })
        }
    }
}

@Composable
internal fun DownloadAction(episode: String, session: Session) {
    val downloads = LocalAppModel.current.downloads(session)
    val statuses by downloads.status.collectAsState()
    val status = statuses[episode]
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Text(stringResource(when (status?.phase) { DownloadPhase.Stored -> R.string.download_stored; DownloadPhase.Failed -> R.string.download_failed; DownloadPhase.Queued -> R.string.download_queued; DownloadPhase.Transferring -> R.string.download_in_progress; null -> R.string.download_none }), style = MaterialTheme.typography.bodySmall)
        if (status?.phase == DownloadPhase.Transferring && status.total > 0) LinearProgressIndicator(progress = { (status.received.toFloat() / status.total).coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth())
        TextButton(onClick = {
            when (status?.phase) {
                DownloadPhase.Stored -> downloads.remove(episode)
                DownloadPhase.Queued, DownloadPhase.Transferring -> downloads.cancel(episode)
                else -> downloads.download(episode)
            }
        }) { Text(stringResource(when (status?.phase) { DownloadPhase.Stored -> R.string.remove_download; DownloadPhase.Queued, DownloadPhase.Transferring -> R.string.cancel_download; DownloadPhase.Failed -> R.string.retry_download; null -> R.string.download })) }
    }
}

@Composable
internal fun PlaybackSettingsEditor(settings: PlaybackSettings) {
    val model = LocalAppModel.current
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(stringResource(R.string.settings_inheritance), style = MaterialTheme.typography.bodySmall)
        Text(stringResource(R.string.speed) + " · " + speedSetting(settings.speed))
        Slider(value = settings.speed.toFloat().coerceIn(.5f, 3f), onValueChange = { model.edit(Change.SetPlaybackSettings(settings.copy(speed = it.toDouble()))) }, valueRange = .5f..3f, steps = 9)
        NumberSetting(R.string.skip_intro, settings.skipIntro) { model.edit(Change.SetPlaybackSettings(settings.copy(skipIntro = it))) }
        NumberSetting(R.string.skip_outro, settings.skipOutro) { model.edit(Change.SetPlaybackSettings(settings.copy(skipOutro = it))) }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Text(stringResource(R.string.volume_boost), Modifier.weight(1f)); Switch(checked = settings.volumeBoost, onCheckedChange = { model.edit(Change.SetPlaybackSettings(settings.copy(volumeBoost = it))) }) }
    }
}

@Composable private fun NumberSetting(label: Int, value: Double, changed: (Double) -> Unit) {
    var text by rememberSaveable(label) { mutableStateOf(value.toString()) }
    OutlinedTextField(value = text, onValueChange = { text = it; it.toDoubleOrNull()?.takeIf { n -> n.isFinite() && n >= 0 }?.let(changed) }, label = { Text(stringResource(label)) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, modifier = Modifier.fillMaxWidth())
}


internal fun dateTime(at: Long): String = java.time.format.DateTimeFormatter.ofLocalizedDateTime(java.time.format.FormatStyle.SHORT).withZone(java.time.ZoneId.systemDefault()).format(java.time.Instant.ofEpochMilli(at))
