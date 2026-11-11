@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.activity.ExperimentalActivityApi::class)

package app.podlist

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.traversalIndex
import android.os.SystemClock
import androidx.activity.compose.PredictiveBackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.layout.SubcomposeLayout
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.input.pointer.pointerInput
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
    val contextual = LocalContextualChrome.current?.hidden == true
    val peek by androidx.compose.animation.core.animateDpAsState(if (now == null || contextual) 0.dp else 72.dp, label = "Player chrome")
    val revision by model.revision.collectAsState()
    var addEpisode by rememberSaveable { mutableStateOf<String?>(null) }
    var pages by rememberSaveable { mutableStateOf(emptyList<String>()) }
    val page = pages.lastOrNull()
    var predictiveProgress by remember { mutableFloatStateOf(0f) }
    val sheet = rememberBottomSheetScaffoldState()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val feedback = remember(snackbar, model) { SheetFeedback(snackbar) { model.feedbackSheet = it } }
    val resources = androidx.compose.ui.platform.LocalResources.current
    val expanded = sheet.bottomSheetState.currentValue == SheetValue.Expanded || sheet.bottomSheetState.targetValue == SheetValue.Expanded
    var lastCollapse by rememberSaveable { mutableIntStateOf(collapseNavigation) }
    LaunchedEffect(collapseNavigation) {
        if (lastCollapse != collapseNavigation) {
            lastCollapse = collapseNavigation
            pages = emptyList()
            sheet.bottomSheetState.partialExpand()
        }
    }
    LaunchedEffect(contextual) { if (contextual) { pages = emptyList(); sheet.bottomSheetState.partialExpand() } }
    LaunchedEffect(session) { model.restorePlayback() }
    LaunchedEffect(model) {
        model.messages.receiveAsFlow().collectLatest { message ->
            val text = message.quantity?.let { resources.getQuantityString(message.resource, it, *message.formatArgs.toTypedArray()) }
                ?: resources.getString(message.resource, *message.formatArgs.toTypedArray())
            val result = feedback.show(message, text, actionLabel = message.undo?.let { resources.getString(message.actionResource) })
            if (result == SnackbarResult.ActionPerformed) message.undo?.invoke()
        }
    }
    LaunchedEffect(now?.error, now?.metadata?.episodeId) {
        if (now?.error == true) model.messages.send(AppMessage(R.string.playback_error, R.string.retry_playback, undo = model::togglePlayback))
    }
    LaunchedEffect(now?.metadata?.episodeId) { if (now == null) { pages = emptyList(); sheet.bottomSheetState.partialExpand() } }
    // Registered after destination navigation so it receives Back before the normal stack.
    CompositionLocalProvider(LocalSheetFeedback provides feedback, LocalAppModel provides model, LocalAddEpisode provides { addEpisode = it }, LocalPlaybackStarted provides { pages = emptyList() }) {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val height = (maxHeight - 8.dp).coerceAtLeast(72.dp)
            BottomSheetScaffold(
                scaffoldState = sheet,
                sheetPeekHeight = peek,
                sheetSwipeEnabled = now != null && !contextual,
                sheetDragHandle = null,
                sheetContent = {
                    now?.let { current ->
                        Column(Modifier.fillMaxWidth().height(height).then(if (expanded) Modifier.statusBarsPadding() else Modifier).graphicsLayer { translationY = predictiveProgress * 24.dp.toPx() }) {
                            if (!expanded && !contextual) MiniPlayer(current, session, model, expand = { pages = emptyList(); scope.launch { sheet.bottomSheetState.expand() } }, openPlaylist = {
                                scope.launch { sheet.bottomSheetState.partialExpand(); val active = withContext(Dispatchers.IO) { session.db.loadState().activePlaylistId }; openPlaylist(active) }
                            })
                            else if (!contextual) {
                                Box(Modifier.fillMaxWidth().height(20.dp), contentAlignment = Alignment.Center) { HorizontalDivider(Modifier.width(32.dp), thickness = 4.dp) }
                                val episode = page?.takeIf { it.startsWith("episode:") }?.substringAfter(':')
                                val episodeTitle = remember(episode) { CollapsingTitle() }
                                var episodeData by remember(episode) { mutableStateOf<ScreenData?>(null) }
                                LaunchedEffect(revision, episode) { episodeData = episode?.let { withContext(Dispatchers.IO) { readScreen(session.db, "episode:$it") } } }
                                Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    if (page != null) ActionIcon(R.drawable.ic_back, stringResource(R.string.back)) { pages = pages.dropLast(1) }
                                    Text(if (page == null) stringResource(R.string.now_playing_playlist, current.playlistName) else if (page.startsWith("episode:")) (if (episodeTitle.headlineVisible) null else episodeData?.episodes?.firstOrNull()?.get("title") as? String) ?: stringResource(R.string.episode) else stringResource(if (page == "chapters") R.string.chapters else R.string.entries), Modifier.weight(1f).semantics { heading() }, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, style = MaterialTheme.typography.titleMedium)
                                    UndoAction()
                                    ActionIcon(R.drawable.ic_collapse, stringResource(R.string.collapse_player)) { pages = emptyList(); scope.launch { sheet.bottomSheetState.partialExpand() } }
                                    if (episodeData != null) EpisodeOverflow(episodeData!!, session)
                                }
                                when {
                                    page?.startsWith("episode:") == true -> {
                                        episodeData?.let { CompositionLocalProvider(LocalCollapsingTitle provides episodeTitle) { EpisodeDetail(it, session) } }
                                    }
                                    page == "chapters" -> ChapterPage(current, session, model) { pages = emptyList() }
                                    page == "entries" -> PlayerEntries(current, session, model, revision, openEpisode = { pages = pages + "episode:$it" }) { pages = emptyList() }
                                    else -> NowPlaying(current, session, model) { pages = listOf(if (it == "episode") "episode:${current.metadata.episodeId}" else it) }
                                }
                            }
                        }
                    }
                },
                snackbarHost = { if (feedback.openSheets == 0) FeedbackSnackbarHost(snackbar, Modifier.imePadding()) }
            ) { padding -> Box(Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding()).then(if (contextual) Modifier.navigationBarsPadding() else Modifier)) { content() } }
            // Register on expansion, after the current tab’s stack handlers, including restored tabs.
            key(expanded) {
                PredictiveBackHandler(enabled = addEpisode == null && expanded) { events ->
                    try {
                        events.collect { predictiveProgress = it.progress }
                        if (page != null) pages = pages.dropLast(1) else sheet.bottomSheetState.partialExpand()
                    } finally { predictiveProgress = 0f }
                }
            }
            addEpisode?.let { episode -> AddSheet(episode, session, model, onDismiss = { addEpisode = null }) }
        }
    }
}

@Composable
private fun MiniPlayer(now: PlaybackUi, session: Session, model: AppModel, expand: () -> Unit, openPlaylist: () -> Unit) {
    val accessible = stringResource(R.string.open_now_playing, now.metadata.podcast ?: stringResource(R.string.app_name), now.metadata.title ?: stringResource(R.string.metadata_pending))
    val progressLabel = stringResource(R.string.playback_position)
    Column(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceContainerHigh).height(72.dp).clickable(interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }, indication = ripple(), onClickLabel = accessible, onClick = expand).semantics { isTraversalGroup = true }) {
        Row(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clickable(onClickLabel = accessible, onClick = expand).semantics { contentDescription = accessible; traversalIndex = 0f }, contentAlignment = Alignment.Center) { ArtworkImage(session, now.artwork, 48.dp, placeholderTitle = now.metadata.podcast) }
            Row(Modifier.weight(1f).semantics { isTraversalGroup = true; traversalIndex = 1f }, horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                SkipButton(false, false) { model.seek(now.position - 15) }
                val actionLabel = stringResource(if (now.error) R.string.retry_playback else if (now.buffering) R.string.buffering else if (now.playing) R.string.pause else R.string.play)
                ActionTooltip(actionLabel) {
                    FilledTonalIconButton(onClick = model::togglePlayback, modifier = Modifier.size(48.dp), colors = if (now.error) IconButtonDefaults.filledTonalIconButtonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer) else IconButtonDefaults.filledTonalIconButtonColors()) {
                        if (now.buffering) CircularProgressIndicator(Modifier.size(24.dp).semantics { contentDescription = actionLabel }, strokeWidth = 2.dp)
                        else Icon(painterResource(if (now.error) R.drawable.ic_retry else if (now.playing) R.drawable.ic_pause else R.drawable.ic_play), actionLabel)
                    }
                }
                SkipButton(true, false) { model.seek(now.position + 30) }
            }
            ActionIcon(R.drawable.ic_playlists, pluralStringResource(R.plurals.active_playlist_next, now.activeNextCount, now.activePlaylistName, now.activeNextCount), modifier = Modifier.semantics { traversalIndex = 2f }, action = openPlaylist)
        }
        LinearProgressIndicator(progress = { (now.position / (now.duration ?: Double.MAX_VALUE)).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().height(2.dp).semantics { contentDescription = progressLabel; stateDescription = duration(now.position) })
    }
}

@Composable
private fun NowPlaying(now: PlaybackUi, session: Session, model: AppModel, open: (String) -> Unit) {
    var speed by rememberSaveable { mutableStateOf(false) }
    var sleep by rememberSaveable { mutableStateOf(false) }
    val identity = stringResource(R.string.now_playing_identity, now.metadata.podcast ?: stringResource(R.string.app_name), now.metadata.title ?: stringResource(R.string.metadata_pending))
    PlayerLayout(artwork = { size ->
        Box(Modifier.semantics { contentDescription = identity }) { ArtworkImage(session, now.artwork, size, placeholderTitle = now.metadata.podcast) }
    }) {
        if (now.metadata.chapters.isNotEmpty()) Box {
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
        ChapterSeek(now, model)
        Box {
            Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
                SkipButton(false, true) { model.seek(now.position - 15) }
                ActionTooltip(stringResource(if (now.error) R.string.retry_playback else if (now.playing) R.string.pause else R.string.play)) { FilledIconButton(onClick = model::togglePlayback, modifier = Modifier.width(112.dp).height(88.dp), shape = MaterialTheme.shapes.extraLarge) { Icon(painterResource(if (now.error) R.drawable.ic_retry else if (now.playing) R.drawable.ic_pause else R.drawable.ic_play), stringResource(if (now.error) R.string.retry_playback else if (now.playing) R.string.pause else R.string.play), Modifier.size(40.dp)) } }
                SkipButton(true, true) { model.seek(now.position + 30) }
            }
        }
        if (now.buffering) Box { Text(stringResource(R.string.buffering), style = MaterialTheme.typography.bodySmall) }
        FlowRow(Modifier.fillMaxWidth().padding(horizontal = 8.dp), maxItemsInEachRow = 2,
            verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val speedLabel = stringResource(R.string.speed_accessibility, speedSetting(now.speed.toDouble()))
            LabelledAction(R.drawable.ic_speed, speedSetting(now.speed.toDouble()), accessibilityLabel = speedLabel) { speed = true }
            LabelledAction(R.drawable.ic_sleep, sleepLabel(now)) { sleep = true }
            LabelledAction(R.drawable.ic_episode, stringResource(R.string.episode)) { open("episode") }
            if (now.metadata.chapters.isNotEmpty()) LabelledAction(R.drawable.ic_chapters, stringResource(R.string.chapters)) { open("chapters") }
            LabelledAction(R.drawable.ic_entries, stringResource(R.string.entries_next, now.nextCount)) { open("entries") }
            if (now.metadata.chapters.isNotEmpty()) Spacer(Modifier.weight(1f))
        }
    }
    if (speed) EditorSheet(stringResource(R.string.episode_speed), { speed = false }) {
        ChoiceRows(PlaybackSpeeds.map { it to speedSetting(it) }, PlaybackSpeeds.firstOrNull { kotlin.math.abs(it - now.speed) < .001 } ?: now.speed.toDouble()) { model.speed(it.toFloat()) }
    }
    if (sleep) SleepDialog(now, model) { sleep = false }
}

/** Measure controls first: Artwork fills the remaining height up to a square, with a scroll fallback. */
@Composable
private fun PlayerLayout(artwork: @Composable (Dp) -> Unit, controls: @Composable () -> Unit) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val viewportHeight = maxHeight
        SubcomposeLayout(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) { constraints ->
            val width = constraints.maxWidth
            val inset = 12.dp.roundToPx()
            val gap = 16.dp.roundToPx()
            val controlGroup = subcompose("controls") {
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)) { controls() }
            }.single().measure(Constraints(maxWidth = width))
            val cap = minOf((width - 32.dp.roundToPx()).coerceAtLeast(0), 320.dp.roundToPx(), (viewportHeight.roundToPx() * .45f).toInt())
            val artworkSize = (viewportHeight.roundToPx() - controlGroup.height - 2 * inset - gap)
                .coerceIn(minOf(80.dp.roundToPx(), cap), cap)
            val image = subcompose("artwork") { artwork(artworkSize.toDp()) }
                .single().measure(Constraints.fixed(artworkSize, artworkSize))
            val height = maxOf(viewportHeight.roundToPx(), controlGroup.height + artworkSize + 2 * inset + gap)
            layout(width, height) {
                val top = (height - controlGroup.height - artworkSize - gap) / 2
                image.placeRelative((width - artworkSize) / 2, top)
                controlGroup.placeRelative(0, top + artworkSize + gap)
            }
        }
    }
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
    val drafts = LocalFormDrafts.current
    var minutes by rememberDraftText("sleep/minutes", "30")
    val value = NumberInput.parse(minutes)
    val valid = value != null && value in 1.0..1440.0
    fun submit() { if (valid) { model.sleep(SleepTimer.Until(SystemClock.elapsedRealtime() + (value * 60_000).toLong())); drafts.clear("sleep/"); close() } }
    EditorSheet(stringResource(R.string.sleep), close, done = ::submit, doneEnabled = valid, doneLabel = R.string.sleep_duration_start) {
        Text(sleepLabel(now))
        OutlinedTextField(value = minutes, onValueChange = { minutes = it }, label = { Text(stringResource(R.string.sleep_duration)) }, singleLine = true,
            isError = !valid, supportingText = if (!valid) ({ InlineError(stringResource(R.string.sleep_duration_error)) }) else null,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal, imeAction = androidx.compose.ui.text.input.ImeAction.Done),
            keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { submit() }), modifier = Modifier.fillMaxWidth())
        if (now.metadata.chapters.isNotEmpty()) ContentTextButton(onClick = { model.sleep(PlaybackPolicy.chapterSleep(now.metadata.chapters, now.position)); drafts.clear("sleep/"); close() }) { Text(stringResource(R.string.end_chapter)) }
        ContentTextButton(onClick = { model.sleep(SleepTimer.EpisodeEnd); drafts.clear("sleep/"); close() }) { Text(stringResource(R.string.end_episode)) }
        if (now.sleep != null) ContentTextButton(onClick = { model.sleep(null); drafts.clear("sleep/"); close() }) { Text(stringResource(R.string.cancel_sleep)) }
    }
}

@Composable private fun ChapterPage(now: PlaybackUi, session: Session, model: AppModel, started: () -> Unit) {
    LazyColumn {
        if (now.metadata.chapters.isEmpty()) item { EmptyState(R.string.no_chapters) }
        items(now.metadata.chapters, key = { it.start }) { chapter ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.clickable { model.seek(chapter.start); started() }, headlineContent = { Text(chapter.title, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(duration(chapter.start)) }, leadingContent = { ArtworkImage(session, chapter.artwork?.url ?: now.metadata.episodeArtwork ?: now.metadata.podcastArtwork, placeholderTitle = now.metadata.podcast) })
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
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(target.name, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(pluralStringResource(R.plurals.entry_count, target.entries.size, target.entries.size)) }, trailingContent = { if (target.id != loaded.state.activePlaylistId) ContentTextButton(onClick = { model.switchPlaylist(target.id); started() }) { Text(stringResource(R.string.switch_playlist)) } else Text(stringResource(R.string.active), style = MaterialTheme.typography.bodyMedium) })
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
    val drafts = LocalFormDrafts.current
    val draftPrefix = "add-playlist:${ids.joinToString(":")}/"
    var name by rememberDraftText(draftPrefix + "name")
    LaunchedEffect(Unit) { if (name.isNotEmpty()) target = null }
    var rejected by remember { mutableStateOf<Names.Problem?>(null) }
    var interacted by rememberDraftText(draftPrefix + "interacted", if (name.isNotEmpty()) "true" else "false")
    val problem = if (target == null) PlaylistNames.validate(name, state.playlists) ?: rejected else null
    val shownProblem = problem.takeIf { interacted == "true" || rejected != null }
    var submitting by remember { mutableStateOf(false) }
    FeedbackSheet(modifier = historyShortcuts(model), onDismissRequest = { if (!submitting) dismiss() }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        val screen = androidx.compose.ui.platform.LocalWindowInfo.current.containerSize.height
        val density = androidx.compose.ui.platform.LocalDensity.current
        val height = with(density) { screen.toDp() / 2 } - 24.dp - WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
        Column(Modifier.fillMaxWidth().heightIn(max = height.coerceAtLeast(200.dp)).padding(horizontal = 16.dp)) {
            Text(stringResource(R.string.add_to_playlist), Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge)
            LazyColumn(Modifier.weight(1f, fill = false)) {
                items(state.playlists, key = { it.id }) { playlist ->
                    ChoiceRows(listOf(playlist.id as String? to if (playlist.id == state.activePlaylistId) stringResource(R.string.m4_active_target, playlist.name) else playlist.name), target, enabled = !submitting) { target = it; rejected = null }
                }
                item { ChoiceRows(listOf(null to stringResource(R.string.new_playlist)), target, enabled = !submitting) { target = null; rejected = null } }
                if (target == null) item {
                    var fieldValue by rememberFieldValue(name)
                    OutlinedTextField(fieldValue, { if (!submitting) { fieldValue = it; name = it.text; interacted = "true"; rejected = null } }, label = { Text(stringResource(R.string.m4_name)) }, readOnly = submitting, isError = shownProblem != null,
                    supportingText = shownProblem?.let { error -> ({ InlineError(playlistProblem(error, name, state.playlists.map { it.name })) }) }, modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()), singleLine = true) }
            }
            CommitActions(Modifier.padding(vertical = 16.dp)) {
                if (target == null && name.isNotEmpty()) TextButton(modifier = Modifier.heightIn(min = 48.dp), enabled = !submitting, onClick = { drafts.clear(draftPrefix); dismiss() }) { Text(stringResource(R.string.discard_draft)) }
                for ((placement, label) in listOf(Placement.Next to R.string.play_next, Placement.Last to R.string.play_last)) FilledTonalButton(modifier = Modifier.heightIn(min = 48.dp), enabled = !submitting && problem == null, onClick = {
                    val submittedDraft = drafts.snapshot(draftPrefix)
                    submitting = true
                    model.addSeveral(ids, target, name.takeIf { target == null }, placement) { success, error ->
                        submitting = false
                        if (success) { if (drafts.clearIfUnchanged(draftPrefix, submittedDraft)) added() }
                        else rejected = error
                    }
                }) { Text(stringResource(label)) }
            }
        }
    }
}
