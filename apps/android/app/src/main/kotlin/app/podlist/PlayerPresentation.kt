@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.activity.ExperimentalActivityApi::class)

package app.podlist

import android.os.SystemClock
import androidx.activity.compose.PredictiveBackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import app.podlist.domain.State
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal val LocalAppModel = staticCompositionLocalOf<AppModel> { error("No app model") }
internal val LocalAddEpisode = staticCompositionLocalOf<(String) -> Unit> { error("No Add action") }
internal val LocalPlaybackStarted = staticCompositionLocalOf<() -> Unit> { {} }

/** Lives inside NavigationSuiteScaffold's content bounds: the navigation bar stays reachable. */
@Composable
internal fun PlayerContainer(model: AppModel, session: Session, openPlaylist: (String) -> Unit, collapseNavigation: Int, content: @Composable () -> Unit) {
    val now by model.playback.collectAsState()
    val revision by model.revision.collectAsState()
    var addEpisode by rememberSaveable { mutableStateOf<String?>(null) }
    var pages by rememberSaveable { mutableStateOf(emptyList<String>()) }
    val page = pages.lastOrNull()
    var predictiveProgress by remember { mutableFloatStateOf(0f) }
    val sheet = rememberBottomSheetScaffoldState()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val resources = androidx.compose.ui.platform.LocalResources.current
    val expanded = sheet.bottomSheetState.currentValue == SheetValue.Expanded || sheet.bottomSheetState.targetValue == SheetValue.Expanded
    LaunchedEffect(collapseNavigation) { pages = emptyList(); sheet.bottomSheetState.partialExpand() }
    LaunchedEffect(model) {
        for (message in model.messages) {
            val result = snackbar.showSnackbar(resources.getString(message.resource), actionLabel = message.undo?.let { resources.getString(R.string.undo) }, duration = SnackbarDuration.Long)
            if (result == SnackbarResult.ActionPerformed) message.undo?.invoke()
        }
    }
    LaunchedEffect(now?.metadata?.episodeId) { if (now == null) { pages = emptyList(); sheet.bottomSheetState.partialExpand() } }
    // Registered after destination navigation so it receives Back before the normal stack.
    CompositionLocalProvider(LocalAppModel provides model, LocalAddEpisode provides { addEpisode = it }, LocalPlaybackStarted provides { pages = emptyList() }) {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val height = (maxHeight - 8.dp).coerceAtLeast(72.dp)
            BottomSheetScaffold(
                scaffoldState = sheet,
                sheetPeekHeight = if (now == null) 0.dp else 72.dp,
                sheetSwipeEnabled = now != null,
                sheetDragHandle = null,
                sheetContent = {
                    now?.let { current ->
                        Column(Modifier.fillMaxWidth().height(height).then(if (expanded) Modifier.statusBarsPadding() else Modifier).graphicsLayer { translationY = predictiveProgress * 24.dp.toPx() }) {
                            if (!expanded) MiniPlayer(current, session, model, expand = { pages = emptyList(); scope.launch { sheet.bottomSheetState.expand() } }, openPlaylist = {
                                scope.launch { sheet.bottomSheetState.partialExpand(); val active = withContext(Dispatchers.IO) { session.db.loadState().activePlaylistId }; openPlaylist(active) }
                            })
                            else {
                                Box(Modifier.fillMaxWidth().height(20.dp), contentAlignment = Alignment.Center) { HorizontalDivider(Modifier.width(32.dp), thickness = 4.dp) }
                                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    if (page != null) IconButton(onClick = { pages = pages.dropLast(1) }, modifier = Modifier.size(48.dp)) { Icon(painterResource(R.drawable.ic_back), stringResource(R.string.back)) }
                                    Text(if (page == null) stringResource(R.string.now_playing_playlist, current.playlistName) else stringResource(when { page?.startsWith("episode:") == true -> R.string.episode; page == "chapters" -> R.string.chapters; else -> R.string.entries }), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                                    IconButton(onClick = { pages = emptyList(); scope.launch { sheet.bottomSheetState.partialExpand() } }, modifier = Modifier.size(48.dp)) { Icon(painterResource(R.drawable.ic_collapse), stringResource(R.string.collapse_player)) }
                                }
                                when {
                                    page?.startsWith("episode:") == true -> {
                                        val episode = page!!.substringAfter(':')
                                        var data by remember(episode) { mutableStateOf<ScreenData?>(null) }
                                        LaunchedEffect(revision, episode) { data = withContext(Dispatchers.IO) { readScreen(session.db, "episode:$episode") } }
                                        data?.let { EpisodeDetail(it, session) }
                                    }
                                    page == "chapters" -> ChapterPage(current, session, model) { pages = emptyList() }
                                    page == "entries" -> PlayerEntries(current, session, model, revision, openEpisode = { pages = pages + "episode:$it" }) { pages = emptyList() }
                                    else -> NowPlaying(current, session, model) { pages = listOf(if (it == "episode") "episode:${current.metadata.episodeId}" else it) }
                                }
                            }
                        }
                    }
                },
                snackbarHost = { SnackbarHost(snackbar) }
            ) { padding -> Box(Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding())) { content() } }
            PredictiveBackHandler(enabled = addEpisode == null && expanded) { events ->
                try {
                    events.collect { predictiveProgress = it.progress }
                    if (page != null) pages = pages.dropLast(1) else sheet.bottomSheetState.partialExpand()
                } finally { predictiveProgress = 0f }
            }
            addEpisode?.let { episode -> AddSheet(episode, session, model, onDismiss = { addEpisode = null }) }
        }
    }
}

@Composable
private fun MiniPlayer(now: PlaybackUi, session: Session, model: AppModel, expand: () -> Unit, openPlaylist: () -> Unit) {
    val accessible = stringResource(R.string.open_now_playing, now.metadata.podcast ?: stringResource(R.string.app_name), now.metadata.title ?: stringResource(R.string.metadata_pending))
    Column(Modifier.fillMaxWidth().height(72.dp).clickable(onClick = expand)) {
        Row(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clickable(onClick = expand).semantics { contentDescription = accessible }, contentAlignment = Alignment.Center) { ArtworkImage(session, now.artwork, 48.dp) }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                SkipButton(false, false) { model.seek(now.position - 15) }
                FilledIconButton(onClick = model::togglePlayback, modifier = Modifier.size(48.dp)) { Icon(painterResource(if (now.playing) R.drawable.ic_pause else R.drawable.ic_play), stringResource(if (now.playing) R.string.pause else R.string.play)) }
                SkipButton(true, false) { model.seek(now.position + 30) }
            }
            IconButton(onClick = openPlaylist, modifier = Modifier.size(48.dp)) { Icon(painterResource(R.drawable.ic_playlists), stringResource(R.string.active_playlist_next, now.activePlaylistName, now.activeNextCount)) }
        }
        LinearProgressIndicator(progress = { (now.position / (now.duration ?: Double.MAX_VALUE)).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().height(2.dp))
    }
}

@Composable
private fun NowPlaying(now: PlaybackUi, session: Session, model: AppModel, open: (String) -> Unit) {
    var speed by remember { mutableStateOf(false) }
    var sleep by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, contentPadding = PaddingValues(bottom = 12.dp)) {
        item { ArtworkImage(session, now.artwork, 216.dp) }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(enabled = now.chapterIndex > 0 || now.metadata.chapters.isNotEmpty(), onClick = {
                    val index = now.chapterIndex
                    val current = now.metadata.chapters.getOrNull(index)
                    val previous = if (current != null && now.position - current.start > 3) current else now.metadata.chapters.getOrNull(index - 1) ?: now.metadata.chapters.firstOrNull()
                    previous?.let { model.seek(it.start) }
                }, modifier = Modifier.size(48.dp)) { Icon(painterResource(R.drawable.ic_previous), stringResource(R.string.previous_chapter)) }
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(now.metadata.chapters.getOrNull(now.chapterIndex)?.title ?: stringResource(R.string.no_chapters), style = MaterialTheme.typography.titleSmall)
                    if (now.chapterIndex >= 0) Text(stringResource(R.string.chapter_number, now.chapterIndex + 1, now.metadata.chapters.size), style = MaterialTheme.typography.bodySmall)
                }
                IconButton(enabled = now.metadata.chapters.any { it.start > now.position }, onClick = { now.metadata.chapters.firstOrNull { it.start > now.position }?.let { model.seek(it.start) } }, modifier = Modifier.size(48.dp)) { Icon(painterResource(R.drawable.ic_next), stringResource(R.string.next_chapter)) }
            }
        }
        item { ChapterSeek(now, model) }
        item {
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
                SkipButton(false, true) { model.seek(now.position - 15) }
                FilledIconButton(onClick = model::togglePlayback, modifier = Modifier.width(112.dp).height(88.dp), shape = MaterialTheme.shapes.extraLarge) { Icon(painterResource(if (now.playing) R.drawable.ic_pause else R.drawable.ic_play), stringResource(if (now.playing) R.string.pause else R.string.play), Modifier.size(40.dp)) }
                SkipButton(true, true) { model.seek(now.position + 30) }
            }
        }
        if (now.error) item { Text(stringResource(R.string.playback_error), Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.error); TextButton(onClick = model::togglePlayback) { Text(stringResource(R.string.retry_playback)) } }
        else if (now.buffering) item { Text(stringResource(R.string.buffering), style = MaterialTheme.typography.bodySmall) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                TextButton(onClick = { speed = true }) { Text(stringResource(R.string.speed_value, now.speed)) }
                TextButton(onClick = { sleep = true }) { Icon(painterResource(R.drawable.ic_sleep), null); Spacer(Modifier.width(8.dp)); Text(stringResource(if (now.sleep == null) R.string.sleep else R.string.sleep_set)) }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                TextButton(onClick = { open("episode") }) { Text(stringResource(R.string.episode)) }
                TextButton(onClick = { open("chapters") }) { Text(stringResource(R.string.chapters)) }
                TextButton(onClick = { open("entries") }) { Text(stringResource(R.string.entries_next, now.nextCount)) }
            }
        }
    }
    if (speed) AlertDialog(onDismissRequest = { speed = false }, title = { Text(stringResource(R.string.episode_speed)) }, text = {
        Column { for (value in listOf(.75f, 1f, 1.25f, 1.5f, 1.75f, 2f, 2.5f, 3f)) TextButton(onClick = { model.speed(value); speed = false }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.speed_value, value)) } }
    }, confirmButton = { TextButton(onClick = { speed = false }) { Text(stringResource(R.string.close)) } })
    if (sleep) SleepDialog(now, model) { sleep = false }
}

@Composable private fun ChapterSeek(now: PlaybackUi, model: AppModel) {
    var dragging by remember { mutableStateOf<Float?>(null) }
    val seekLabel = stringResource(R.string.seek)
    val duration = (now.duration ?: 1.0).coerceAtLeast(1.0).toFloat()
    val color = MaterialTheme.colorScheme.onSurfaceVariant
    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
        Box {
            Slider(value = dragging ?: now.position.toFloat().coerceIn(0f, duration), onValueChange = { dragging = it }, onValueChangeFinished = { dragging?.let { model.seek(it.toDouble()) }; dragging = null }, valueRange = 0f..duration, enabled = now.duration != null, modifier = Modifier.fillMaxWidth().semantics { contentDescription = seekLabel })
            Canvas(Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 10.dp)) {
                now.metadata.chapters.forEach { chapter -> if (chapter.start > 0 && chapter.start < duration) {
                    val x = (chapter.start / duration * size.width).toFloat()
                    drawLine(color, androidx.compose.ui.geometry.Offset(x, size.height / 2 - 4.dp.toPx()), androidx.compose.ui.geometry.Offset(x, size.height / 2 + 4.dp.toPx()), 2.dp.toPx())
                } }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(duration(now.position), style = MaterialTheme.typography.bodySmall)
            Text(stringResource(R.string.remaining, duration(((now.duration ?: now.position) - now.position).coerceAtLeast(0.0))), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable private fun SkipButton(forward: Boolean, large: Boolean, action: () -> Unit) {
    IconButton(onClick = action, modifier = Modifier.size(if (large) 80.dp else 48.dp)) {
        Box(contentAlignment = Alignment.Center) {
            Icon(painterResource(if (forward) R.drawable.ic_skip_forward else R.drawable.ic_skip_back), stringResource(if (forward) R.string.forward_30 else R.string.back_15), Modifier.size(if (large) 60.dp else 30.dp))
            Text(stringResource(R.string.skip_number, if (forward) 30 else 15), style = if (large) MaterialTheme.typography.titleLarge else MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable private fun SleepDialog(now: PlaybackUi, model: AppModel, close: () -> Unit) {
    var minutes by rememberSaveable { mutableStateOf("30") }
    AlertDialog(onDismissRequest = close, title = { Text(stringResource(R.string.sleep)) }, text = {
        Column {
            OutlinedTextField(value = minutes, onValueChange = { minutes = it }, label = { Text(stringResource(R.string.sleep_duration)) }, singleLine = true, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number))
            TextButton(enabled = minutes.toLongOrNull()?.let { it in 1..1440 } == true, onClick = { model.sleep(SleepTimer.Until(SystemClock.elapsedRealtime() + minutes.toLong() * 60_000)); close() }) { Text(stringResource(R.string.sleep_duration_start)) }
            TextButton(onClick = { model.sleep(PlaybackPolicy.chapterSleep(now.metadata.chapters, now.position)); close() }) { Text(stringResource(R.string.end_chapter)) }
            TextButton(onClick = { model.sleep(SleepTimer.EpisodeEnd); close() }) { Text(stringResource(R.string.end_episode)) }
            if (now.sleep != null) TextButton(onClick = { model.sleep(null); close() }) { Text(stringResource(R.string.cancel_sleep)) }
        }
    }, confirmButton = { TextButton(onClick = close) { Text(stringResource(R.string.close)) } })
}

@Composable private fun ChapterPage(now: PlaybackUi, session: Session, model: AppModel, started: () -> Unit) {
    LazyColumn {
        if (now.metadata.chapters.isEmpty()) item { EmptyMessage(R.string.no_chapters) }
        items(now.metadata.chapters, key = { it.start }) { chapter ->
            ListItem(modifier = Modifier.clickable { model.seek(chapter.start); started() }, headlineContent = { Text(chapter.title) }, supportingContent = { Text(duration(chapter.start)) }, leadingContent = { ArtworkImage(session, chapter.artwork?.url ?: now.metadata.episodeArtwork ?: now.metadata.podcastArtwork) })
        }
    }
}

@Composable private fun PlayerEntries(now: PlaybackUi, session: Session, model: AppModel, revision: Long, openEpisode: (String) -> Unit, started: () -> Unit) {
    var data by remember { mutableStateOf<ScreenData?>(null) }
    LaunchedEffect(revision, now.playlistId) { data = withContext(Dispatchers.IO) { readScreen(session.db, "playlist:${now.playlistId}") } }
    val loaded = data ?: return
    LazyColumn {
        item { Section(stringResource(R.string.switch_playlist)) }
        items(loaded.state.playlists, key = { "playlist:${it.id}" }) { playlist ->
            ListItem(headlineContent = { Text(playlist.name) }, supportingContent = { Text(stringResource(R.string.entry_count, playlist.entries.size)) }, trailingContent = { if (playlist.id != loaded.state.activePlaylistId) TextButton(onClick = { model.switchPlaylist(playlist.id); started() }) { Text(stringResource(R.string.switch_playlist)) } else Text(stringResource(R.string.active), style = MaterialTheme.typography.labelSmall) })
        }
        item { Section(stringResource(R.string.entries)) }
        val playlist = loaded.state.playlists.find { it.id == now.playlistId }
        if (playlist == null || playlist.entries.isEmpty()) item { EmptyMessage(R.string.no_entries) }
        items(playlist?.entries.orEmpty(), key = { it.episodeId }) { entry ->
            val row = loaded.episodes.find { it["id"] == entry.episodeId }
            if (row == null) Hint(stringResource(R.string.metadata_pending))
            else EpisodeRow(row, loaded, session, entry.position, playlist!!.id) { openEpisode(entry.episodeId) }
        }
    }
}

@Composable private fun AddSheet(episode: String, session: Session, model: AppModel, onDismiss: () -> Unit) {
    val revision by model.revision.collectAsState()
    var state by remember { mutableStateOf<State?>(null) }
    LaunchedEffect(revision) { state = withContext(Dispatchers.IO) { session.db.loadState() } }
    var target by rememberSaveable { mutableStateOf<String?>(null) }
    var initialized by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(state) { if (!initialized && state != null) { target = state!!.activePlaylistId; initialized = true } }
    var name by rememberSaveable { mutableStateOf("") }
    var invalid by rememberSaveable { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Box {
            val screen = androidx.compose.ui.platform.LocalWindowInfo.current.containerSize.height
            val density = androidx.compose.ui.platform.LocalDensity.current
            val halfHeight = with(density) { screen.toDp() / 2 }
            Column(Modifier.fillMaxWidth().height((halfHeight - 32.dp).coerceAtLeast(200.dp)).padding(horizontal = 16.dp)) {
                Text(stringResource(R.string.add_to_playlist), style = MaterialTheme.typography.titleLarge)
                LazyColumn(Modifier.weight(1f)) {
                    items(state?.playlists.orEmpty(), key = { it.id }) { playlist ->
                        Row(Modifier.fillMaxWidth().clickable { target = playlist.id; invalid = false }, verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = target == playlist.id, onClick = { target = playlist.id; invalid = false })
                            Text(playlist.name, Modifier.weight(1f)); if (playlist.id == state?.activePlaylistId) Text(stringResource(R.string.active), style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    item { Row(Modifier.fillMaxWidth().clickable { target = null }, verticalAlignment = Alignment.CenterVertically) { RadioButton(selected = target == null && initialized, onClick = { target = null }); Text(stringResource(R.string.new_playlist)) } }
                    if (target == null && initialized) item { OutlinedTextField(name, { name = it; invalid = false }, label = { Text(stringResource(R.string.playlist_name)) }, isError = invalid, supportingText = if (invalid) { { Text(stringResource(R.string.playlist_name_error)) } } else null, modifier = Modifier.fillMaxWidth(), singleLine = true) }
                }
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    for ((placement, label) in listOf(Placement.Next to R.string.play_next, Placement.Last to R.string.play_last)) FilledTonalButton(enabled = initialized && !submitting, onClick = {
                        submitting = true
                        model.add(episode, target, if (target == null) name else null, placement) { success -> submitting = false; if (success) onDismiss() else invalid = true }
                    }) { Text(stringResource(label)) }
                }
            }
        }
    }
}
