package app.podlist

import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.zIndex
import androidx.compose.ui.semantics.*
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
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
    var grabOffset by mutableFloatStateOf(0f)
    var sourceTop by mutableFloatStateOf(0f)
    var retained by mutableStateOf<String?>(null)
    fun locate(playlist: Playlist) {
        val rows = list.layoutInfo.visibleItemsInfo.filter { info -> playlist.entries.any { it.episodeId == info.key } }
        val nearest = rows.minByOrNull { kotlin.math.abs(pointer - (it.offset + it.size / 2f)) } ?: return
        val index = playlist.entries.indexOfFirst { it.episodeId == nearest.key }
        boundary = index + if (pointer > nearest.offset + nearest.size / 2f) 1 else 0
    }
}
internal val LocalEntryDrag = staticCompositionLocalOf<EntryDragState?> { null }

@Composable
internal fun EntryList(playlist: Playlist, data: ScreenData, session: Session, openEpisode: (String) -> Unit, header: (LazyListScope.() -> Unit)? = null, reveal: Reveal? = null, revealConsumed: () -> Unit = {}) {
    val model = LocalAppModel.current
    val list = rememberBrowsingListState("entries:${playlist.id}", if (header == null) playlist.entries.map { it.episodeId } else null)
    val drag = remember(list) { EntryDragState(list) }
    val edge = with(androidx.compose.ui.platform.LocalDensity.current) { 64.dp.toPx() }
    var revealed by rememberSaveable { mutableStateOf<Long?>(null) }
    LaunchedEffect(reveal?.token, playlist.entries) {
        if (revealed == reveal?.token) return@LaunchedEffect
        val target = reveal?.takeIf { it.route == "playlist:${playlist.id}" }?.episode
        val index = playlist.entries.indexOfFirst { it.episodeId == target }
        if (index >= 0) {
            drag.retained = target
            revealed = reveal?.token
            list.scrollToItem(index + if (header == null) 0 else data.state.playlists.size + 2)
            revealConsumed()
        }
    }
    LaunchedEffect(drag.retained) {
        if (drag.retained != null) { delay(1800); drag.retained = null }
    }
    LaunchedEffect(drag.source) {
        while (drag.source != null) {
            val info = list.layoutInfo
            val velocity = when {
                drag.pointer < info.viewportStartOffset + edge -> -((info.viewportStartOffset + edge - drag.pointer) / edge).coerceIn(0f, 1f) * 24f
                drag.pointer > info.viewportEndOffset - edge -> ((drag.pointer - info.viewportEndOffset + edge) / edge).coerceIn(0f, 1f) * 24f
                else -> 0f
            }
            if (velocity != 0f) drag.sourceTop -= list.scrollBy(velocity)
            drag.locate(playlist)
            delay(16)
        }
    }
    val selection = LocalEpisodeSelection.current
    SideEffect {
        selection?.order = playlist.entries.map { it.episodeId }
        if (selection != null) selection.ids = selection.ids.intersect(selection.order.toSet())
    }
    CompositionLocalProvider(LocalEntryDrag provides drag) {
        LazyColumn(state = list, modifier = Modifier.fillMaxSize().listSelectionKeys(selection).onGloballyPositioned { drag.viewportTop = it.positionInWindow().y }) {
            header?.invoke(this)
            if (playlist.entries.isEmpty()) item { EmptyMessage(R.string.no_entries); FilledTonalButton(onClick = { model.requestReveal(Reveal("search")) }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.find_episodes)) } }
            itemsIndexed(playlist.entries, key = { _, entry -> entry.episodeId }) { index, entry ->
                val focus = remember { FocusRequester() }
                val moving = drag.source == entry.episodeId
                val marked = drag.retained == entry.episodeId
                val currentLabel = stringResource(if (playlist.id == data.state.activePlaylistId) R.string.cursor_now else R.string.cursor_here)
                val movedLabel = stringResource(R.string.entry_destination, index + 1, playlist.entries.size)
                val row = data.episodes.find { it["id"] == entry.episodeId }
                LaunchedEffect(marked, playlist.entries, row != null) { if (marked && drag.source == null && row != null) focus.requestFocus() }
                Column(Modifier.animateItem().fillMaxWidth().zIndex(if (moving) 1f else 0f).graphicsLayer {
                    if (moving) {
                        val top = list.layoutInfo.visibleItemsInfo.find { it.key == entry.episodeId }?.offset?.toFloat() ?: drag.sourceTop
                        translationY = drag.pointer - drag.grabOffset - top
                        shadowElevation = 8.dp.toPx()
                    } else { translationY = 0f; shadowElevation = 0f }
                }.background(if (moving || marked) MaterialTheme.colorScheme.primaryContainer else if (playlist.cursor == entry.episodeId) MaterialTheme.colorScheme.secondaryContainer else androidx.compose.ui.graphics.Color.Transparent)
                    .semantics { if (playlist.cursor == entry.episodeId) stateDescription = currentLabel; if (marked) { stateDescription = movedLabel; liveRegion = LiveRegionMode.Polite } }) {
                    if (drag.source != null && drag.boundary == index) HorizontalDivider(thickness = 3.dp, color = MaterialTheme.colorScheme.primary)
                    if (playlist.cursor == entry.episodeId) Text(currentLabel, Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                    if (row == null) Hint(stringResource(R.string.metadata_pending))
                    else EpisodeRow(row, data, session, entry.position, playlist.id, rowModifier = Modifier.focusRequester(focus)) { openEpisode(entry.episodeId) }
                    if (drag.source != null && index == playlist.entries.lastIndex && drag.boundary == playlist.entries.size) HorizontalDivider(thickness = 3.dp, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
internal fun EntryDragHandle(playlist: Playlist, episode: String) {
    val model = LocalAppModel.current
    val haptic = androidx.compose.ui.platform.LocalHapticFeedback.current
    val drag = LocalEntryDrag.current ?: return
    val currentPlaylist by rememberUpdatedState(playlist)
    val container = LocalPinnableContainer.current
    var pin by remember { mutableStateOf<PinnableContainer.PinnedHandle?>(null) }
    var handleTop by remember { mutableFloatStateOf(0f) }
    DisposableEffect(Unit) { onDispose { pin?.release() } }
    val modifier = Modifier.onGloballyPositioned { handleTop = it.positionInWindow().y }.pointerInput(episode, drag) {
        detectDragGestures(onDragStart = { offset ->
            haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
            pin = container?.pin()
            drag.source = episode
            drag.pointer = handleTop - drag.viewportTop + offset.y
            drag.sourceTop = drag.list.layoutInfo.visibleItemsInfo.find { it.key == episode }?.offset?.toFloat() ?: drag.pointer
            drag.grabOffset = drag.pointer - drag.sourceTop
            drag.locate(currentPlaylist)
        }, onDrag = { change, amount -> change.consume(); drag.pointer += amount.y; drag.locate(currentPlaylist) }, onDragEnd = {
            val sourceIndex = currentPlaylist.entries.indexOfFirst { it.episodeId == episode }
            val destination = (drag.boundary - if (sourceIndex < drag.boundary) 1 else 0).coerceIn(0, currentPlaylist.entries.lastIndex)
            if (sourceIndex != destination) model.moveEntry(playlist.id, episode, destination)
            haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
            drag.retained = episode
            drag.source = null; drag.boundary = -1; pin?.release(); pin = null
        }, onDragCancel = { drag.source = null; drag.boundary = -1; pin?.release(); pin = null })
    }
    val label = stringResource(R.string.drag_entry)
    val up = stringResource(R.string.move_up)
    val down = stringResource(R.string.move_down)
    Box(modifier.size(48.dp).semantics {
        customActions = listOf(
            CustomAccessibilityAction(up) { val index = playlist.entries.indexOfFirst { it.episodeId == episode }; if (index > 0) { model.moveEntry(playlist.id, episode, index - 1); true } else false },
            CustomAccessibilityAction(down) { val index = playlist.entries.indexOfFirst { it.episodeId == episode }; if (index < playlist.entries.lastIndex) { model.moveEntry(playlist.id, episode, index + 1); true } else false }
        )
    }, contentAlignment = Alignment.Center) { Icon(painterResource(R.drawable.ic_drag), label) }
}
