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
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import app.podlist.domain.State
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.collectLatest
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.clearAndSetSemantics
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
    LaunchedEffect(session) { model.restorePlayback() }
    LaunchedEffect(model) {
        model.messages.receiveAsFlow().collectLatest { message ->
            val text = message.quantity?.let { resources.getQuantityString(message.resource, it, *message.formatArgs.toTypedArray()) }
                ?: resources.getString(message.resource, *message.formatArgs.toTypedArray())
            val result = snackbar.showSnackbar(text, actionLabel = message.undo?.let { resources.getString(message.actionResource) }, duration = SnackbarDuration.Long)
            if (result == SnackbarResult.ActionPerformed) message.undo?.invoke()
        }
    }
    LaunchedEffect(now?.error, now?.metadata?.episodeId) {
        if (now?.error == true) model.messages.send(AppMessage(R.string.playback_error, R.string.retry_playback, undo = model::togglePlayback))
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
                                    if (page != null) ActionIcon(R.drawable.ic_back, stringResource(R.string.back)) { pages = pages.dropLast(1) }
                                    Text(if (page == null) stringResource(R.string.now_playing_playlist, current.playlistName) else stringResource(when { page.startsWith("episode:") -> R.string.episode; page == "chapters" -> R.string.chapters; else -> R.string.entries }), Modifier.weight(1f).semantics { heading() }, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, style = MaterialTheme.typography.titleMedium)
                                    EditHistoryMenu()
                                    ActionIcon(R.drawable.ic_collapse, stringResource(R.string.collapse_player)) { pages = emptyList(); scope.launch { sheet.bottomSheetState.partialExpand() } }
                                }
                                when {
                                    page?.startsWith("episode:") == true -> {
                                        val episode = page.substringAfter(':')
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
                snackbarHost = { SnackbarHost(snackbar, Modifier.imePadding()) }
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
    val progressLabel = stringResource(R.string.playback_position)
    Column(Modifier.fillMaxWidth().height(72.dp).clickable(onClick = expand)) {
        Row(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clickable(onClick = expand).semantics { contentDescription = accessible }, contentAlignment = Alignment.Center) { ArtworkImage(session, now.artwork, 48.dp) }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                SkipButton(false, false) { model.seek(now.position - 15) }
                val actionLabel = stringResource(if (now.error) R.string.retry_playback else if (now.buffering) R.string.buffering else if (now.playing) R.string.pause else R.string.play)
                ActionTooltip(actionLabel) {
                    FilledIconButton(onClick = model::togglePlayback, modifier = Modifier.size(48.dp), colors = if (now.error) IconButtonDefaults.filledIconButtonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer) else IconButtonDefaults.filledIconButtonColors()) {
                        if (now.buffering) CircularProgressIndicator(Modifier.size(24.dp).semantics { contentDescription = actionLabel }, strokeWidth = 2.dp)
                        else Icon(painterResource(if (now.error) R.drawable.ic_retry else if (now.playing) R.drawable.ic_pause else R.drawable.ic_play), actionLabel)
                    }
                }
                SkipButton(true, false) { model.seek(now.position + 30) }
            }
            ActionIcon(R.drawable.ic_playlists, pluralStringResource(R.plurals.active_playlist_next, now.activeNextCount, now.activePlaylistName, now.activeNextCount), action = openPlaylist)
        }
        LinearProgressIndicator(progress = { (now.position / (now.duration ?: Double.MAX_VALUE)).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().height(2.dp).semantics { contentDescription = progressLabel; stateDescription = duration(now.position) })
    }
}

@Composable
private fun NowPlaying(now: PlaybackUi, session: Session, model: AppModel, open: (String) -> Unit) {
    var speed by rememberSaveable { mutableStateOf(false) }
    var sleep by rememberSaveable { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, contentPadding = PaddingValues(bottom = 12.dp)) {
        item { ArtworkImage(session, now.artwork, 216.dp) }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                ActionIcon(R.drawable.ic_previous, stringResource(R.string.previous_chapter), enabled = now.chapterIndex > 0 || now.metadata.chapters.isNotEmpty()) {
                    val index = now.chapterIndex
                    val current = now.metadata.chapters.getOrNull(index)
                    val previous = if (current != null && now.position - current.start > 3) current else now.metadata.chapters.getOrNull(index - 1) ?: now.metadata.chapters.firstOrNull()
                    previous?.let { model.seek(it.start) }
                }
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(now.metadata.chapters.getOrNull(now.chapterIndex)?.title ?: stringResource(R.string.no_chapters), style = MaterialTheme.typography.titleSmall, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                    if (now.chapterIndex >= 0) Text(stringResource(R.string.chapter_number, now.chapterIndex + 1, now.metadata.chapters.size), style = MaterialTheme.typography.bodySmall)
                }
                ActionIcon(R.drawable.ic_next, stringResource(R.string.next_chapter), enabled = now.metadata.chapters.any { it.start > now.position }) { now.metadata.chapters.firstOrNull { it.start > now.position }?.let { model.seek(it.start) } }
            }
        }
        item { ChapterSeek(now, model) }
        item {
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
                SkipButton(false, true) { model.seek(now.position - 15) }
                ActionTooltip(stringResource(if (now.playing) R.string.pause else R.string.play)) { FilledIconButton(onClick = model::togglePlayback, modifier = Modifier.width(112.dp).height(88.dp), shape = MaterialTheme.shapes.extraLarge) { Icon(painterResource(if (now.playing) R.drawable.ic_pause else R.drawable.ic_play), stringResource(if (now.playing) R.string.pause else R.string.play), Modifier.size(40.dp)) } }
                SkipButton(true, true) { model.seek(now.position + 30) }
            }
        }
        if (now.error) item { Text(stringResource(R.string.playback_error), Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.error); TextButton(onClick = model::togglePlayback) { Text(stringResource(R.string.retry_playback)) } }
        else if (now.buffering) item { Text(stringResource(R.string.buffering), style = MaterialTheme.typography.bodySmall) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                val speedLabel = stringResource(R.string.speed_accessibility, speedSetting(now.speed.toDouble()))
                TextButton(onClick = { speed = true }, modifier = Modifier.semantics { contentDescription = speedLabel }) { Text(speedSetting(now.speed.toDouble())) }
                TextButton(onClick = { sleep = true }) { Icon(painterResource(R.drawable.ic_sleep), null); Spacer(Modifier.width(8.dp)); Text(sleepLabel(now)) }
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
    if (speed) EditorSheet(stringResource(R.string.episode_speed), { speed = false }) {
        ChoiceRows(PlaybackSpeeds.map { it to speedSetting(it) }, PlaybackSpeeds.firstOrNull { kotlin.math.abs(it - now.speed) < .001 } ?: now.speed.toDouble()) { model.speed(it.toFloat()); speed = false }
    }
    if (sleep) SleepDialog(now, model) { sleep = false }
}

@Composable private fun ChapterSeek(now: PlaybackUi, model: AppModel) {
    var dragging by remember { mutableStateOf<Float?>(null) }
    val seekLabel = stringResource(R.string.seek)
    val duration = (now.duration ?: 1.0).coerceAtLeast(1.0).toFloat()
    val timeLabel = stringResource(R.string.seek_time, duration((dragging ?: now.position.toFloat()).toDouble()), duration(duration.toDouble()))
    val color = MaterialTheme.colorScheme.onSurfaceVariant
    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
        Box {
            Slider(value = dragging ?: now.position.toFloat().coerceIn(0f, duration), onValueChange = { dragging = it }, onValueChangeFinished = { dragging?.let { model.seek(it.toDouble()) }; dragging = null }, valueRange = 0f..duration, enabled = now.duration != null, modifier = Modifier.fillMaxWidth().semantics { contentDescription = seekLabel; stateDescription = timeLabel })
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
    ActionTooltip(stringResource(if (forward) R.string.forward_30 else R.string.back_15)) {
    IconButton(onClick = action, modifier = Modifier.size(if (large) 80.dp else 48.dp)) {
        Box(contentAlignment = Alignment.Center) {
            Icon(painterResource(if (forward) R.drawable.ic_skip_forward else R.drawable.ic_skip_back), stringResource(if (forward) R.string.forward_30 else R.string.back_15), Modifier.size(if (large) 60.dp else 30.dp))
            val density = androidx.compose.ui.platform.LocalDensity.current
            CompositionLocalProvider(androidx.compose.ui.platform.LocalDensity provides androidx.compose.ui.unit.Density(density.density, 1f)) {
                Text(stringResource(R.string.skip_number, if (forward) 30 else 15), style = if (large) MaterialTheme.typography.titleLarge else MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp).clearAndSetSemantics {})
            }
        }
    }
    }
}

@Composable private fun sleepLabel(now: PlaybackUi): String {
    var clock by remember { mutableLongStateOf(SystemClock.elapsedRealtime()) }
    LaunchedEffect(now.sleep) { while (true) { clock = SystemClock.elapsedRealtime(); kotlinx.coroutines.delay(1000) } }
    return when (val timer = now.sleep) {
        is SleepTimer.Until -> stringResource(R.string.sleep_remaining, duration(((timer.elapsedRealtimeMillis - clock) / 1000.0).coerceAtLeast(0.0)))
        is SleepTimer.ChapterEnd -> stringResource(R.string.sleep_remaining, duration(((timer.position - now.position) / now.speed).coerceAtLeast(0.0)))
        SleepTimer.EpisodeEnd -> now.duration?.let { stringResource(R.string.sleep_remaining, duration(((it - now.position) / now.speed).coerceAtLeast(0.0))) } ?: stringResource(R.string.end_episode)
        null -> stringResource(R.string.sleep)
    }
}

@Composable private fun SleepDialog(now: PlaybackUi, model: AppModel, close: () -> Unit) {
    var minutes by rememberSaveable { mutableStateOf("30") }
    val value = NumberInput.parse(minutes)
    val valid = value != null && value in 1.0..1440.0
    fun submit() { if (valid) { model.sleep(SleepTimer.Until(SystemClock.elapsedRealtime() + (value * 60_000).toLong())); close() } }
    EditorSheet(stringResource(R.string.sleep), close) {
        Text(sleepLabel(now))
        OutlinedTextField(value = minutes, onValueChange = { minutes = it }, label = { Text(stringResource(R.string.sleep_duration)) }, singleLine = true,
            isError = !valid, supportingText = if (!valid) ({ Text(stringResource(R.string.sleep_duration_error)) }) else null,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal, imeAction = androidx.compose.ui.text.input.ImeAction.Done),
            keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { submit() }), modifier = Modifier.fillMaxWidth())
        Button(enabled = valid, onClick = ::submit) { Text(stringResource(R.string.sleep_duration_start)) }
        TextButton(onClick = { model.sleep(PlaybackPolicy.chapterSleep(now.metadata.chapters, now.position)); close() }) { Text(stringResource(R.string.end_chapter)) }
        TextButton(onClick = { model.sleep(SleepTimer.EpisodeEnd); close() }) { Text(stringResource(R.string.end_episode)) }
        if (now.sleep != null) TextButton(onClick = { model.sleep(null); close() }) { Text(stringResource(R.string.cancel_sleep)) }
    }
}

@Composable private fun ChapterPage(now: PlaybackUi, session: Session, model: AppModel, started: () -> Unit) {
    LazyColumn {
        if (now.metadata.chapters.isEmpty()) item { EmptyMessage(R.string.no_chapters) }
        items(now.metadata.chapters, key = { it.start }) { chapter ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.clickable { model.seek(chapter.start); started() }, headlineContent = { Text(chapter.title, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(duration(chapter.start)) }, leadingContent = { ArtworkImage(session, chapter.artwork?.url ?: now.metadata.episodeArtwork ?: now.metadata.podcastArtwork) })
        }
    }
}

@Composable private fun PlayerEntries(now: PlaybackUi, session: Session, model: AppModel, revision: Long, openEpisode: (String) -> Unit, started: () -> Unit) {
    var data by remember { mutableStateOf<ScreenData?>(null) }
    LaunchedEffect(revision, now.playlistId) { data = withContext(Dispatchers.IO) { readScreen(session.db, "playlist:${now.playlistId}") } }
    val loaded = data ?: return
    val playlist = loaded.state.playlists.find { it.id == now.playlistId } ?: return
    EntryList(playlist, loaded, session, openEpisode, header = {
        item { Section(stringResource(R.string.switch_playlist)) }
        items(loaded.state.playlists, key = { "playlist:${it.id}" }) { target ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(target.name, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(pluralStringResource(R.plurals.entry_count, target.entries.size, target.entries.size)) }, trailingContent = { if (target.id != loaded.state.activePlaylistId) TextButton(onClick = { model.switchPlaylist(target.id); started() }) { Text(stringResource(R.string.switch_playlist)) } else Text(stringResource(R.string.active), style = MaterialTheme.typography.bodyMedium) })
        }
        item { Section(stringResource(R.string.entries)) }
    })
}

@Composable private fun AddSheet(episode: String, session: Session, model: AppModel, onDismiss: () -> Unit) {
    val revision by model.revision.collectAsState()
    var state by remember { mutableStateOf<State?>(null) }
    LaunchedEffect(revision) { state = withContext(Dispatchers.IO) { session.db.loadState() } }
    state?.let { PlaylistAddSheet(listOf(episode), it, model, onDismiss, onDismiss) }
}

@Composable
internal fun PlaylistAddSheet(ids: List<String>, state: State, model: AppModel, dismiss: () -> Unit, added: () -> Unit) {
    var target by rememberSaveable { mutableStateOf<String?>(state.activePlaylistId) }
    var name by rememberSaveable { mutableStateOf("") }
    var invalid by rememberSaveable { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    ModalBottomSheet(modifier = historyShortcuts(model), onDismissRequest = dismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), dragHandle = {
        Box(Modifier.fillMaxWidth().height(24.dp), contentAlignment = Alignment.Center) { HorizontalDivider(Modifier.width(32.dp), thickness = 4.dp) }
    }) {
        val screen = androidx.compose.ui.platform.LocalWindowInfo.current.containerSize.height
        val density = androidx.compose.ui.platform.LocalDensity.current
        val height = with(density) { screen.toDp() / 2 } - 24.dp - WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
        Column(Modifier.fillMaxWidth().heightIn(max = height.coerceAtLeast(200.dp)).padding(horizontal = 16.dp)) {
            Text(stringResource(R.string.add_to_playlist), Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge)
            LazyColumn(Modifier.weight(1f)) {
                items(state.playlists, key = { it.id }) { playlist ->
                    ChoiceRows(listOf(playlist.id as String? to if (playlist.id == state.activePlaylistId) stringResource(R.string.m4_active_target, playlist.name) else playlist.name), target) { target = it; invalid = false }
                }
                item { ChoiceRows(listOf(null to stringResource(R.string.new_playlist)), target) { target = null; invalid = false } }
                if (target == null) item { OutlinedTextField(name, { name = it; invalid = false }, label = { Text(stringResource(R.string.playlist_name)) }, isError = invalid,
                    supportingText = if (invalid) ({ Text(stringResource(R.string.playlist_name_error)) }) else null, modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()), singleLine = true) }
            }
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                for ((placement, label) in listOf(Placement.Next to R.string.play_next, Placement.Last to R.string.play_last)) FilledTonalButton(enabled = !submitting, onClick = {
                    submitting = true
                    model.addSeveral(ids, target, name.takeIf { target == null }, placement) { success -> submitting = false; if (success) added() else invalid = true }
                }) { Text(stringResource(label)) }
            }
        }
    }
}
