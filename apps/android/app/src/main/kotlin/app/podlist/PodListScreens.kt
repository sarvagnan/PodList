@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.material3.adaptive.ExperimentalMaterial3AdaptiveApi::class)

package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.material3.adaptive.layout.AnimatedPane
import androidx.compose.material3.adaptive.layout.ListDetailPaneScaffoldRole
import androidx.compose.material3.adaptive.navigation.BackNavigationBehavior
import androidx.compose.material3.adaptive.navigation.NavigableListDetailPaneScaffold
import androidx.compose.material3.adaptive.navigation.rememberListDetailPaneScaffoldNavigator
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.Row
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private enum class Destination(val title: Int, val icon: Int) {
    Views(R.string.views, R.drawable.ic_views),
    Playlists(R.string.playlists, R.drawable.ic_playlists),
    Library(R.string.library, R.drawable.ic_library)
}

@Composable
fun PodListShell(model: AppModel) {
    val starting by model.starting.collectAsState()
    val session by model.session.collectAsState()
    val bringOver by model.bringOver.collectAsState()
    val bringOverVisible by model.bringOverVisible.collectAsState()
    Surface(Modifier.fillMaxSize()) {
        when {
            starting -> Loading()
            session == null -> WelcomeScreen(model)
            bringOverVisible && bringOver != null -> BringOverScreen(model, bringOver!!)
            else -> key(session!!.source.key) { ConnectedShell(model, session!!) }
        }
    }
}

@Composable
private fun ConnectedShell(model: AppModel, session: Session) {
    var destination by rememberSaveable { mutableStateOf(Destination.Views) }
    var requestedRoot by remember { mutableStateOf<Destination?>(null) }
    val helpRequest by model.gettingStartedRequest.collectAsState()
    LaunchedEffect(helpRequest) { if (helpRequest > 0) { destination = Destination.Views; requestedRoot = Destination.Views } }
    val shortcut by model.shortcut.collectAsState()
    LaunchedEffect(shortcut) { shortcut?.let { value -> Destination.entries.find { it.name.equals(value, true) }?.let { destination = it; requestedRoot = it }; model.shortcut.value = null } }
    val tabs = rememberSaveableStateHolder()
    var requestedPlaylist by rememberSaveable { mutableStateOf<String?>(null) }
    var collapseNavigation by remember { mutableIntStateOf(0) }
    NavigationSuiteScaffold(navigationSuiteItems = {
        Destination.entries.forEach { target ->
            item(selected = destination == target, onClick = { destination = target; collapseNavigation++ },
                icon = { Icon(painterResource(target.icon), contentDescription = null) },
                label = { Text(stringResource(target.title)) })
        }
    }) {
        PlayerContainer(model, session, openPlaylist = { requestedPlaylist = it; destination = Destination.Playlists }, collapseNavigation = collapseNavigation) {
            tabs.SaveableStateProvider(destination.name) {
                DestinationStack(destination, model, session, requestedPlaylist.takeIf { destination == Destination.Playlists }, consumed = { requestedPlaylist = null }, resetRoot = requestedRoot == destination, rootConsumed = { requestedRoot = null })
            }
        }
    }
}

@Composable
private fun DestinationStack(destination: Destination, model: AppModel, session: Session, requestedPlaylist: String?, consumed: () -> Unit, resetRoot: Boolean, rootConsumed: () -> Unit) {
    val navigator = rememberListDetailPaneScaffoldNavigator<String>()
    val scope = rememberCoroutineScope()
    val route = navigator.currentDestination?.contentKey
    val revision by model.revision.collectAsState()
    val status by model.status.collectAsState()
    var data by remember(session, route) { mutableStateOf<ScreenData?>(null) }
    LaunchedEffect(session, revision, route) {
        data = withContext(Dispatchers.IO) { readScreen(session.db, route) }
    }
    val pages = rememberSaveableStateHolder()
    suspend fun showRoot() {
        while (navigator.canNavigateBack(BackNavigationBehavior.PopLatest)) navigator.navigateBack(BackNavigationBehavior.PopLatest)
    }
    val open: (String) -> Unit = { next ->
        when (next) {
            "getting-started" -> model.showGettingStarted()
            "directory" -> scope.launch { showRoot() }
            else -> scope.launch { navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, next) }
        }
    }
    LaunchedEffect(resetRoot) { if (resetRoot) { showRoot(); rootConsumed() } }
    val back: () -> Unit = { scope.launch { navigator.navigateBack(BackNavigationBehavior.PopLatest) } }
    LaunchedEffect(requestedPlaylist) { requestedPlaylist?.let { navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, "playlist:$it"); consumed() } }
    // This wraps ListDetailPaneScaffold and provides gesture-driven predictive back transitions.
    SelectionProvider(route, data, session) {
    NavigableListDetailPaneScaffold(
        navigator = navigator,
        defaultBackBehavior = BackNavigationBehavior.PopLatest,
        listPane = {
            AnimatedPane {
                ScreenFrame(stringResource(destination.title), status, model::requestSync, settings = { open("settings") }, add = { when (destination) {
                    Destination.Library -> open("add-podcasts")
                    Destination.Playlists -> open("new-playlist")
                    Destination.Views -> scope.launch {
                        val id = java.util.UUID.randomUUID().toString()
                        val name = model.getApplication<android.app.Application>().getString(R.string.m4_new_view)
                        withContext(Dispatchers.IO) { session.db.record(Change.SaveView(View(id, name, ViewFilter(), ViewSort.PublishedDesc, null)), System.currentTimeMillis()) }
                        open("view-edit:$id")
                    }
                } }) {
                    val loaded = data
                    if (loaded == null || (status == SyncStatus.Loading && if (destination == Destination.Library) !loaded.hasLibrary else !loaded.hasState)) Loading()
                    else if (if (destination == Destination.Library) !loaded.hasLibrary else !loaded.hasState) EmptyMessage(R.string.no_synced_data)
                    else pages.SaveableStateProvider("root") { Directory(destination, loaded, session, open) }
                }
            }
        },
        detailPane = {
            AnimatedPane {
                val loaded = data
                val title = when {
                    route == "settings" -> stringResource(R.string.settings)
                    route == "new-playlist" -> stringResource(R.string.new_playlist)
                    route == "search" -> stringResource(R.string.m4_search_library)
                    route == "getting-started" -> stringResource(R.string.m4_getting_started)
                    route == "select-subscriptions" -> stringResource(R.string.m4_select_subscriptions)
                    route == "listening-stats" -> stringResource(R.string.m4_listening_stats)
                    route?.startsWith("view-edit:") == true -> stringResource(R.string.m4_edit_view)
                    route?.startsWith("playlist-settings:") == true -> stringResource(R.string.m4_playlist_settings)
                    route?.startsWith("subscription-settings:") == true -> stringResource(R.string.m4_subscription_settings)
                    route == "server" -> stringResource(R.string.server)
                    route == "add-podcasts" -> stringResource(R.string.add_podcasts)
                    route == "trash" -> stringResource(R.string.trash)
                    route?.startsWith("view:") == true -> loaded?.state?.views?.find { it.id == route.substringAfter(':') }?.name.orEmpty()
                    route?.startsWith("playlist:") == true -> loaded?.state?.playlists?.find { it.id == route.substringAfter(':') }?.name.orEmpty()
                    route?.startsWith("subscription:") == true -> loaded?.subscriptions?.find { it["id"] == route.substringAfter(':') }?.get("title") as? String ?: ""
                    else -> stringResource(R.string.episode)
                }
                ScreenFrame(title, status, model::requestSync, back = back, selectionData = loaded, selectionSession = session, route = route, edit = when {
                    route?.startsWith("view:") == true -> ({ open("view-edit:${route.substringAfter(':')}") })
                    route?.startsWith("playlist:") == true -> ({ open("playlist-settings:${route.substringAfter(':')}") })
                    route?.startsWith("subscription:") == true -> ({ open("subscription-settings:${route.substringAfter(':')}") })
                    else -> null
                }) {
                    when {
                        route == "add-podcasts" -> AddPodcastsScreen(model, session)
                        route == "server" -> ServerScreen(model, session.source.server?.origin, back)
                        route == "new-playlist" -> NewPlaylistScreen(model) { open("playlist:$it") }
                        loaded == null -> Loading()
                        else -> pages.SaveableStateProvider(route ?: "detail") {
                            Detail(route, loaded, session, open, back)
                        }
                    }
                }
            }
        }
    )
}
}

@Composable
private fun ScreenFrame(title: String, status: SyncStatus, retry: () -> Unit, back: (() -> Unit)? = null, settings: (() -> Unit)? = null, add: (() -> Unit)? = null, edit: (() -> Unit)? = null, selectionData: ScreenData? = null, selectionSession: Session? = null, route: String? = null, content: @Composable () -> Unit) {
    val selection = LocalEpisodeSelection.current
    Scaffold(topBar = {
        if (selection != null && selection.ids.isNotEmpty() && selectionData != null && selectionSession != null) SelectionToolbar(selection, selectionData, selectionSession, route)
        else TopAppBar(title = { Text(title) }, navigationIcon = {
            if (back != null) IconButton(onClick = back) { Icon(painterResource(R.drawable.ic_back), stringResource(R.string.back)) }
        }, actions = {
            if (edit != null) IconButton(onClick = edit) { Icon(painterResource(R.drawable.ic_edit), stringResource(R.string.m4_edit)) }
            if (add != null) IconButton(onClick = add) { Icon(painterResource(R.drawable.ic_add), stringResource(R.string.m4_create)) }
            if (settings != null) IconButton(onClick = settings) { Icon(painterResource(R.drawable.ic_settings), stringResource(R.string.settings)) }
        })
    }, contentWindowInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (status != SyncStatus.Ready) {
                Surface(color = if (status == SyncStatus.Error) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceContainer) {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(stringResource(when (status) {
                            SyncStatus.Loading -> R.string.syncing
                            SyncStatus.Offline -> R.string.offline
                            else -> R.string.sync_error
                        }), Modifier.weight(1f).padding(vertical = 12.dp), style = MaterialTheme.typography.bodySmall)
                        if (status != SyncStatus.Loading) TextButton(onClick = retry) { Text(stringResource(R.string.retry)) }
                    }
                }
            }
            Box(Modifier.weight(1f)) { content() }
        }
    }
}

@Composable
private fun Directory(destination: Destination, data: ScreenData, session: Session, open: (String) -> Unit) {
    LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
        item { Hint(stringResource(when (destination) { Destination.Views -> R.string.views_hint; Destination.Playlists -> R.string.playlists_hint; Destination.Library -> R.string.library_hint })) }
        when (destination) {
            Destination.Views -> {
                item { GettingStarted(data, session, open) }
                if (data.state.views.isEmpty()) item { EmptyMessage(R.string.no_views) }
                items(data.state.views, key = { "view:${it.id}" }) { view -> NameRow(view.name, sortLabel(view.sort)) { open("view:${view.id}") } }
            }
            Destination.Playlists -> {
                if (data.state.playlists.isEmpty()) item { EmptyMessage(R.string.no_playlists) }
                items(data.state.playlists, key = { "playlist:${it.id}" }) { playlist ->
                    val details = listOfNotNull(if (playlist.id == data.state.activePlaylistId) stringResource(R.string.active) else null,
                        pluralStringResource(R.plurals.entry_count, playlist.entries.size, playlist.entries.size), stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played else R.string.keeps_entries))
                    NameRow(playlist.name, details.joinToString(" · ")) { open("playlist:${playlist.id}") }
                }
                item { NameRow(stringResource(R.string.trash), pluralStringResource(R.plurals.playlist_count, PlaylistRules.availableTrash(data.state, System.currentTimeMillis()).size, PlaylistRules.availableTrash(data.state, System.currentTimeMillis()).size)) { open("trash") } }
            }
            Destination.Library -> {
                item { NameRow(stringResource(R.string.m4_search_library), stringResource(R.string.m4_search_hint)) { open("search") } }
                val subscriptions = data.subscriptions.filter { it["unsubscribed_at"] == null }
                if (subscriptions.isEmpty()) item { EmptyMessage(R.string.no_subscriptions) }
                val device = session.deviceId
                for ((mode, title) in listOf(DownloadMode.OnEntry to R.string.on_entry, DownloadMode.Never to R.string.stream, DownloadMode.AllNew to R.string.all_new)) {
                    item { Section(stringResource(title)) }
                    val group = subscriptions.filter { subscription ->
                        (data.state.downloadRules.find { it.deviceId == device && it.subscriptionId == subscription["id"] }?.mode ?: DownloadMode.Never) == mode
                    }
                    if (group.isEmpty()) item { Hint(stringResource(R.string.empty_rule)) }
                    items(group, key = { "subscription:${it["id"]}" }) { subscription ->
                        NameRow(subscription["title"] as String, pluralStringResource(R.plurals.episode_count, (subscription["episode_count"] as Number).toInt(), (subscription["episode_count"] as Number).toInt()),
                            artwork = subscription["artwork_url"] as? String, session = session) { open("subscription:${subscription["id"]}") }
                    }
                }
                item { NameRow(stringResource(R.string.add_podcasts), stringResource(R.string.m4_add_podcasts_hint)) { open("add-podcasts") } }
                item { NameRow(stringResource(R.string.m4_select_subscriptions), stringResource(R.string.m4_select_subscriptions_help)) { open("select-subscriptions") } }
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun Detail(route: String?, data: ScreenData, session: Session, open: (String) -> Unit, back: () -> Unit) {
    val id = route?.substringAfter(':')
    when {
        route == "settings" -> SettingsScreen(data, session, open)
        route == "trash" -> TrashScreen(data)
        route == "search" -> SearchScreen(data, session, open)
        route == "listening-stats" -> ListeningStatsScreen(data, session)
        route == "select-subscriptions" -> SelectSubscriptionsScreen(data, session)
        route?.startsWith("view-edit:") == true -> {
            val view = data.state.views.find { it.id == id }
            if (view == null) EmptyMessage(R.string.missing_view) else ViewEditor(view, data, session, done = back, deleted = { open("directory") })
        }
        route?.startsWith("playlist-settings:") == true -> {
            val playlist = data.state.playlists.find { it.id == id }
            if (playlist == null) EmptyMessage(R.string.missing_playlist) else PlaylistSettingsScreen(playlist, data) { open("directory") }
        }
        route?.startsWith("subscription-settings:") == true -> {
            val subscription = data.subscriptions.find { it["id"] == id }
            if (subscription == null) EmptyMessage(R.string.missing_subscription) else SubscriptionSettingsScreen(subscription, data, session) { open("directory") }
        }
        route?.startsWith("view:") == true -> {
            val view = data.state.views.find { it.id == id }
            if (view == null) Column { EmptyMessage(R.string.missing_view); TextButton(onClick = { open("directory") }) { Text(stringResource(R.string.views)) } }
            else if (data.episodes.isEmpty() && data.subscriptions.none { it["unsubscribed_at"] == null }) Column { EmptyMessage(R.string.no_subscriptions); TextButton(onClick = { open("add-podcasts") }) { Text(stringResource(R.string.add_podcasts)) } }
            else EpisodeList(data.episodes, data, session, open, empty = R.string.no_matches, summary = {
                Text(pluralStringResource(R.plurals.episode_count, data.episodes.size, data.episodes.size), style = MaterialTheme.typography.titleSmall)
                Text(viewDescription(view, data), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            })
        }
        route?.startsWith("subscription:") == true -> {
            if (data.subscriptions.none { it["id"] == id }) EmptyMessage(R.string.missing_subscription)
            else EpisodeList(data.episodes, data, session, open, empty = R.string.no_episodes, summary = { Text(pluralStringResource(R.plurals.episode_count, data.episodes.size, data.episodes.size)) })
        }
        route?.startsWith("playlist:") == true -> {
            val playlist = data.state.playlists.find { it.id == id }
            if (playlist == null) EmptyMessage(R.string.missing_playlist)
            else PlaylistPage(playlist, data, session, open)
        }

        route?.startsWith("episode:") == true -> EpisodeDetail(data, session)
    }
}

@Composable
internal fun EpisodeList(rows: List<Row>, data: ScreenData, session: Session, open: (String) -> Unit, empty: Int, summary: (@Composable () -> Unit)? = null) {
    val selection = LocalEpisodeSelection.current
    SideEffect { selection?.order = rows.map { it["id"] as String }; if (selection != null) selection.ids = selection.ids.intersect(selection.order.toSet()) }
    LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
        if (summary != null) item { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { summary() } }
        if (rows.isEmpty()) item { EmptyMessage(empty) }
        items(rows, key = { it["id"] as String }) { row -> EpisodeRow(row, data, session) { open("episode:${row["id"]}") } }
    }
}

@Composable
internal fun EpisodeRow(row: Row, data: ScreenData, session: Session, position: Double? = null, entryPlaylist: String? = null, showActions: Boolean = true, onClick: (() -> Unit)? = null) {
    val model = LocalAppModel.current
    val add = LocalAddEpisode.current
    val started = LocalPlaybackStarted.current
    val selection = LocalEpisodeSelection.current.takeIf { onClick != null }
    val selecting = selection?.ids?.isNotEmpty() == true
    val id = row["id"] as String
    val progress = position ?: data.state.playlists.flatMap { it.entries }.filter { it.episodeId == row["id"] }.maxOfOrNull { it.position } ?: 0.0
    val duration = (row["duration"] as? Number)?.toDouble()
    Column {
        Row(Modifier.fillMaxWidth().then(if (onClick != null) Modifier.combinedClickable(onClick = { if (selecting) selection.toggle(id) else onClick() }, onLongClick = { selection?.toggle(id) }) else Modifier).padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            if (selecting) Checkbox(id in selection.ids, { selection.toggle(id) })
            else ArtworkImage(session, row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(row["title"] as String, style = MaterialTheme.typography.titleMedium)
                val published = shortDate((row["published"] as Number).toLong())
                Text(listOfNotNull(row["podcast"] as String, published, duration?.let { lengthLabel(it) }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                val played = row["played_at"] != null
                val state = when {
                    played -> stringResource(R.string.played)
                    progress > 0 -> stringResource(R.string.in_progress, if (duration != null) "${duration(progress)} / ${duration(duration)}" else duration(progress))
                    else -> stringResource(R.string.unplayed)
                }
                val starred = (row["starred"] as? Number)?.toInt() == 1
                Text(if (starred) "$state · ${stringResource(R.string.starred)}" else state, style = MaterialTheme.typography.bodySmall, color = if (played) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant)
                if (progress > 0 && duration != null && duration > 0) LinearProgressIndicator(progress = { (progress / duration).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().padding(top = 4.dp))
            }
            if (showActions && !selecting) Row {
                IconButton(onClick = { add(row["id"] as String) }, modifier = Modifier.size(48.dp)) { Icon(painterResource(R.drawable.ic_add), stringResource(R.string.add_to_playlist)) }
                IconButton(onClick = {
                    if (entryPlaylist == null) model.playNow(row["id"] as String) else model.playEntry(entryPlaylist, row["id"] as String)
                    started()
                }, modifier = Modifier.size(48.dp)) { Icon(painterResource(R.drawable.ic_play), stringResource(if (entryPlaylist == null) R.string.play_now else R.string.play_from_here)) }
                if (entryPlaylist != null) EntryMenu(data.state.playlists.first { it.id == entryPlaylist }, row["id"] as String)
            }
        }
        HorizontalDivider()
    }
}

@Composable
internal fun EpisodeDetail(data: ScreenData, session: Session) {
    val row = data.episodes.firstOrNull()
    if (row == null) { EmptyMessage(R.string.metadata_pending); return }
    val model = LocalAppModel.current
    val add = LocalAddEpisode.current
    val started = LocalPlaybackStarted.current
    val id = row["id"] as String
    LaunchedEffect(session, id) { withContext(Dispatchers.IO) { runCatching { session.source.chapters(id) } } }
    val chapters = (row["chapters"] as? String)?.let { ProtocolJson.decodeFromString<List<Chapter>>(it) }.orEmpty()
    LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
        item {
            Column(Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                ArtworkImage(session, row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String, 192.dp)
            }
            EpisodeRow(row, data, session, showActions = false)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                TextButton(onClick = { model.playNow(id); started() }) { Text(stringResource(R.string.play_now)) }
                TextButton(onClick = { add(id) }) { Text(stringResource(R.string.add_to_playlist)) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                val played = data.state.episodeStates[id]?.played != null
                TextButton(onClick = { model.edit(if (played) Change.MarkUnplayed(id) else Change.MarkPlayed(id, PlayedSource.User)) }) { Text(stringResource(if (played) R.string.mark_unplayed else R.string.mark_played)) }
                val starred = data.state.episodeStates[id]?.starred == true
                TextButton(onClick = { model.edit(Change.SetStar(id, !starred)) }) { Text(stringResource(if (starred) R.string.unstar else R.string.star)) }
            }
            DownloadAction(id, session)
        }
        val entries = data.state.playlists.mapNotNull { playlist -> playlist.entries.find { it.episodeId == id }?.let { playlist to it } }
        item { Section(stringResource(R.string.in_playlists)) }
        if (entries.isEmpty()) item { Hint(stringResource(R.string.not_in_playlist)) }
        items(entries, key = { it.first.id }) { (playlist, entry) ->
            ListItem(headlineContent = { Text(playlist.name) }, supportingContent = { Text(stringResource(R.string.playlist_position, duration(entry.position))) }, trailingContent = {
                TextButton(onClick = { model.playEntry(playlist.id, id); started() }) { Text(stringResource(R.string.resume)) }
            })
        }
        item { Section(stringResource(R.string.chapters)) }
        if (chapters.isEmpty()) item { Hint(stringResource(R.string.no_chapters)) }
        items(chapters, key = { it.start }) { chapter ->
            ListItem(headlineContent = { Text(chapter.title) }, supportingContent = { Text(duration(chapter.start)) }, leadingContent = { ArtworkImage(session, chapter.artwork?.url ?: row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String) }, trailingContent = {
                TextButton(onClick = { model.playNow(id); model.seek(chapter.start); started() }) { Text(stringResource(R.string.play)) }
            })
        }
        item { Section(stringResource(R.string.show_notes)) }
        item { Text(android.text.Html.fromHtml(row["description"] as? String ?: "", android.text.Html.FROM_HTML_MODE_COMPACT).toString(), Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium) }
    }
}

@Composable
internal fun NameRow(title: String, subtitle: String, artwork: String? = null, session: Session? = null, onClick: () -> Unit) {
    ListItem(modifier = Modifier.clickable(onClick = onClick), headlineContent = { Text(title) }, supportingContent = { Text(subtitle) },
        leadingContent = if (session != null) { { ArtworkImage(session, artwork) } } else null)
    HorizontalDivider()
}

@Composable internal fun Hint(text: String) { Text(text, Modifier.padding(horizontal = 16.dp, vertical = 12.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
@Composable internal fun Section(text: String, inset: androidx.compose.ui.unit.Dp = 16.dp) { Text(text, Modifier.padding(start = inset, end = inset, top = 20.dp, bottom = 8.dp), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleSmall) }
@Composable internal fun EmptyMessage(resource: Int) { Text(stringResource(resource), Modifier.padding(24.dp), style = MaterialTheme.typography.bodyLarge) }
@Composable internal fun Loading() { Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) { CircularProgressIndicator(); Text(stringResource(R.string.loading)) } }

internal fun date(millis: Long): String = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withZone(ZoneId.systemDefault()).format(Instant.ofEpochMilli(millis))
@Composable private fun lengthLabel(seconds: Double): String {
    val minutes = ((seconds + 30) / 60).toLong()
    return if (minutes >= 60) stringResource(R.string.length_hours, minutes / 60, minutes % 60) else stringResource(R.string.length_minutes, minutes)
}

private fun shortDate(millis: Long): String {
    val zone = ZoneId.systemDefault()
    val at = Instant.ofEpochMilli(millis).atZone(zone)
    val skeleton = if (at.year == java.time.Year.now(zone).value) "MMMd" else "yMMMd"
    val pattern = android.text.format.DateFormat.getBestDateTimePattern(java.util.Locale.getDefault(), skeleton)
    return DateTimeFormatter.ofPattern(pattern).format(at)
}

internal fun duration(seconds: Double): String { val s = seconds.toLong(); return if (s >= 3600) "%d:%02d:%02d".format(s / 3600, s / 60 % 60, s % 60) else "%d:%02d".format(s / 60, s % 60) }

@Composable internal fun sortLabel(sort: ViewSort): String = stringResource(when (sort) {
    ViewSort.PublishedDesc -> R.string.newest_first; ViewSort.PublishedAsc -> R.string.oldest_first
    ViewSort.DurationAsc -> R.string.shortest_first; ViewSort.DurationDesc -> R.string.longest_first
})

@Composable
private fun viewDescription(view: View, data: ScreenData): String {
    val conditions = mutableListOf<String>()
    when (val published = view.filter.published) {
        is PublishedFilter.LastDays -> conditions += stringResource(R.string.published_days, published.days)
        is PublishedFilter.Between -> conditions += stringResource(R.string.published_between, published.from?.let(::date) ?: stringResource(R.string.any), published.to?.let(::date) ?: stringResource(R.string.any))
        null -> Unit
    }
    view.filter.podcasts?.let { filter ->
        val names = filter.subscriptionIds.map { id -> data.subscriptions.find { it["id"] == id }?.get("title") as? String ?: stringResource(R.string.unavailable) }
        conditions += stringResource(if (filter.mode == PodcastMode.Include) R.string.podcasts_include else R.string.podcasts_exclude, names.joinToString(", "))
    }
    view.filter.text?.let { conditions += stringResource(R.string.mentions, it) }
    view.filter.played?.let { conditions += stringResource(R.string.played_condition, stringResource(when (it) { PlayedFilter.Unplayed -> R.string.unplayed; PlayedFilter.Played -> R.string.played; PlayedFilter.InProgress -> R.string.in_progress_condition })) }
    view.filter.starred?.let { conditions += stringResource(R.string.starred_condition, stringResource(if (it) R.string.yes else R.string.no)) }
    if (view.filter.notInAnyPlaylist == true) conditions += stringResource(R.string.not_in_playlist)
    view.filter.minDuration?.let { conditions += stringResource(R.string.min_duration, duration(it)) }
    view.filter.maxDuration?.let { conditions += stringResource(R.string.max_duration, duration(it)) }
    if (conditions.isEmpty()) conditions += stringResource(R.string.any)
    conditions += sortLabel(view.sort)
    view.limit?.let { conditions += stringResource(R.string.show_limit, it) }
    return conditions.joinToString(" · ")
}
