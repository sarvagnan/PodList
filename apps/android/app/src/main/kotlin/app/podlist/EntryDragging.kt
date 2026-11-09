package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.layout.LocalPinnableContainer
import androidx.compose.ui.layout.PinnableContainer
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.Playlist
import kotlinx.coroutines.delay

@Stable
internal class EntryDragState(val list: LazyListState) {
    var viewportTop by mutableFloatStateOf(0f)
    var source by mutableStateOf<String?>(null)
    var pointer by mutableFloatStateOf(0f)
    var boundary by mutableIntStateOf(-1)
    fun locate(playlist: Playlist) {
        val rows = list.layoutInfo.visibleItemsInfo.filter { info -> playlist.entries.any { it.episodeId == info.key } }
        val nearest = rows.minByOrNull { kotlin.math.abs(pointer - (it.offset + it.size / 2f)) } ?: return
        val index = playlist.entries.indexOfFirst { it.episodeId == nearest.key }
        boundary = index + if (pointer > nearest.offset + nearest.size / 2f) 1 else 0
    }
}
internal val LocalEntryDrag = staticCompositionLocalOf<EntryDragState?> { null }

@Composable
internal fun EntryList(playlist: Playlist, data: ScreenData, session: Session, openEpisode: (String) -> Unit, header: (LazyListScope.() -> Unit)? = null) {
    val model = LocalAppModel.current
    val list = rememberLazyListState()
    val drag = remember(list) { EntryDragState(list) }
    val edge = with(androidx.compose.ui.platform.LocalDensity.current) { 64.dp.toPx() }
    val reveal by model.reveal.collectAsState()
    var revealed by remember { mutableStateOf<Long?>(null) }
    LaunchedEffect(reveal?.token, playlist.entries) {
        if (revealed == reveal?.token) return@LaunchedEffect
        val target = reveal?.takeIf { it.route == "playlist:${playlist.id}" }?.episode
        val index = playlist.entries.indexOfFirst { it.episodeId == target }
        if (index >= 0) {
            revealed = reveal?.token
            val keyIndex = list.layoutInfo.visibleItemsInfo.firstOrNull { it.key == target }?.index
            if (keyIndex != null) list.animateScrollToItem(keyIndex)
            else list.animateScrollToItem(index + if (header == null) 0 else data.state.playlists.size + 2)
        }
    }
    LaunchedEffect(drag.source) {
        while (drag.source != null) {
            val info = list.layoutInfo
            val velocity = when {
                drag.pointer < info.viewportStartOffset + edge -> -((info.viewportStartOffset + edge - drag.pointer) / edge).coerceIn(0f, 1f) * 24f
                drag.pointer > info.viewportEndOffset - edge -> ((drag.pointer - info.viewportEndOffset + edge) / edge).coerceIn(0f, 1f) * 24f
                else -> 0f
            }
            if (velocity != 0f) list.scrollBy(velocity)
            drag.locate(playlist)
            delay(16)
        }
    }
    CompositionLocalProvider(LocalEntryDrag provides drag) {
        LazyColumn(state = list, modifier = Modifier.fillMaxSize().onGloballyPositioned { drag.viewportTop = it.positionInWindow().y }) {
            header?.invoke(this)
            if (playlist.entries.isEmpty()) item { EmptyMessage(R.string.no_entries); TextButton(onClick = { model.reveal.value = Reveal("search") }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.find_episodes)) } }
            itemsIndexed(playlist.entries, key = { _, entry -> entry.episodeId }) { index, entry ->
                Column(Modifier.fillMaxWidth().background(if (drag.source == entry.episodeId) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) {
                    if (drag.source != null && drag.boundary == index) HorizontalDivider(thickness = 3.dp, color = MaterialTheme.colorScheme.primary)
                    if (playlist.cursor == entry.episodeId) Section(stringResource(if (playlist.id == data.state.activePlaylistId) R.string.cursor_now else if (entry.position > 0) R.string.cursor_resume else R.string.cursor_here))
                    val row = data.episodes.find { it["id"] == entry.episodeId }
                    if (row == null) Hint(stringResource(R.string.metadata_pending))
                    else EpisodeRow(row, data, session, entry.position, playlist.id) { openEpisode(entry.episodeId) }
                    if (drag.source != null && index == playlist.entries.lastIndex && drag.boundary == playlist.entries.size) HorizontalDivider(thickness = 3.dp, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
internal fun EntryDragHandle(playlist: Playlist, episode: String) {
    val model = LocalAppModel.current
    val drag = LocalEntryDrag.current ?: return
    val currentPlaylist by rememberUpdatedState(playlist)
    val container = LocalPinnableContainer.current
    var pin by remember { mutableStateOf<PinnableContainer.PinnedHandle?>(null) }
    var handleTop by remember { mutableFloatStateOf(0f) }
    DisposableEffect(Unit) { onDispose { pin?.release() } }
    val modifier = Modifier.onGloballyPositioned { handleTop = it.positionInWindow().y }.pointerInput(episode, drag) {
        detectDragGesturesAfterLongPress(onDragStart = { offset ->
            pin = container?.pin()
            drag.source = episode
            drag.pointer = handleTop - drag.viewportTop + offset.y
            drag.locate(currentPlaylist)
        }, onDrag = { change, amount -> change.consume(); drag.pointer += amount.y; drag.locate(currentPlaylist) }, onDragEnd = {
            val sourceIndex = currentPlaylist.entries.indexOfFirst { it.episodeId == episode }
            val destination = (drag.boundary - if (sourceIndex < drag.boundary) 1 else 0).coerceIn(0, currentPlaylist.entries.lastIndex)
            if (sourceIndex != destination) model.moveEntry(playlist.id, episode, destination)
            drag.source = null; drag.boundary = -1; pin?.release(); pin = null
        }, onDragCancel = { drag.source = null; drag.boundary = -1; pin?.release(); pin = null })
    }
    val label = stringResource(R.string.drag_entry)
    Box(modifier.size(48.dp), contentAlignment = Alignment.Center) { Icon(painterResource(R.drawable.ic_drag), label) }
}
