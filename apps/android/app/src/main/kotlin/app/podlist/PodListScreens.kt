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
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalContext
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
    var collapseNavigation by remember { mutableIntStateOf(0) }
    var requestedRoot by remember { mutableStateOf<Destination?>(null) }
    val helpRequest by model.gettingStartedRequest.collectAsState()
    LaunchedEffect(helpRequest) { if (helpRequest > 0) { destination = Destination.Views; requestedRoot = Destination.Views } }
    val shortcut by model.shortcut.collectAsState()
    LaunchedEffect(shortcut) { shortcut?.let { value -> Destination.entries.find { it.name.equals(value, true) }?.let { destination = it; requestedRoot = it }; model.shortcut.value = null } }
    val reveal by model.reveal.collectAsState()
    LaunchedEffect(reveal?.token) { reveal?.let { target ->
        collapseNavigation++
        if (target.route.startsWith("view:") || target.route == "views-root") destination = Destination.Views
        else if (target.route.startsWith("playlist:") || target.route.startsWith("playlist-settings:") || target.route == "playlists-root") destination = Destination.Playlists
        else if (target.route.startsWith("subscription:") || target.route == "search") destination = Destination.Library
    } }
    val cache = remember(session) { mutableStateMapOf<String, ScreenData>() }
    val tabs = rememberSaveableStateHolder()
    var requestedPlaylist by rememberSaveable { mutableStateOf<String?>(null) }
    NavigationSuiteScaffold(navigationSuiteItems = {
        Destination.entries.forEach { target ->
            item(selected = destination == target, onClick = { if (destination == target) requestedRoot = target; destination = target; collapseNavigation++ },
                icon = { Icon(painterResource(target.icon), contentDescription = null) },
                label = { Text(stringResource(target.title)) })
        }
    }) {
        PlayerContainer(model, session, openPlaylist = { requestedPlaylist = it; destination = Destination.Playlists }, collapseNavigation = collapseNavigation) {
            tabs.SaveableStateProvider(destination.name) {
                DestinationStack(destination, model, session, cache, requestedPlaylist.takeIf { destination == Destination.Playlists }, consumed = { requestedPlaylist = null }, resetRoot = requestedRoot == destination, rootConsumed = { requestedRoot = null }, rootBack = { destination = Destination.Views })
            }
        }
    }
}

@Composable
private fun DestinationStack(destination: Destination, model: AppModel, session: Session, cache: MutableMap<String, ScreenData>, requestedPlaylist: String?, consumed: () -> Unit, resetRoot: Boolean, rootConsumed: () -> Unit, rootBack: () -> Unit) {
    val navigator = rememberListDetailPaneScaffoldNavigator<String>()
    val scope = rememberCoroutineScope()
    val route = navigator.currentDestination?.contentKey
    val revision by model.revision.collectAsState()
    val status by model.status.collectAsState()
    val data = cache[route ?: "root"]
    BackHandler(route == null && destination != Destination.Views, onBack = rootBack)
    LaunchedEffect(session, revision, route) {
        cache[route ?: "root"] = withContext(Dispatchers.IO) { readScreen(session.db, route) }
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
    val reveal by model.reveal.collectAsState()
    LaunchedEffect(reveal) { reveal?.let { target ->
        val owns = when { (target.route.startsWith("view:") || target.route == "views-root") -> destination == Destination.Views; (target.route.startsWith("playlist:") || target.route.startsWith("playlist-settings:") || target.route == "playlists-root") -> destination == Destination.Playlists; (target.route.startsWith("subscription:") || target.route == "search") -> destination == Destination.Library; else -> true }
        if (owns && model.revealedToken != target.token) {
            model.revealedToken = target.token
            val sameViewEditor = (route?.startsWith("view-edit:") == true || route?.startsWith("new-view:") == true) && route.substringAfter(':') == target.route.substringAfter(':')
            if (target.route.endsWith("-root")) showRoot()
            else if (!sameViewEditor && route != target.route) navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, target.route)
        }
    } }
    val back: () -> Unit = { scope.launch { navigator.navigateBack(BackNavigationBehavior.PopLatest) } }
    LaunchedEffect(requestedPlaylist) { requestedPlaylist?.let { navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, "playlist:$it"); consumed() } }
    // This wraps ListDetailPaneScaffold and provides gesture-driven predictive back transitions.
    SelectionProvider(route, data, session) {
    NavigableListDetailPaneScaffold(
        navigator = navigator,
        defaultBackBehavior = BackNavigationBehavior.PopLatest,
        listPane = {
            AnimatedPane {
                ScreenFrame(stringResource(destination.title), status, model::requestSync, addLabel = when (destination) { Destination.Views -> R.string.m4_new_view; Destination.Playlists -> R.string.new_playlist; Destination.Library -> R.string.add_podcasts }, settings = { open("settings") }, add = { when (destination) {
                    Destination.Library -> open("add-podcasts")
                    Destination.Playlists -> open("new-playlist")
                    Destination.Views -> open("new-view:${java.util.UUID.randomUUID()}")
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
                    route?.startsWith("view-edit:") == true || route?.startsWith("new-view:") == true -> stringResource(R.string.m4_edit_view)
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
                        route == "new-playlist" -> NewPlaylistScreen(model) { id -> scope.launch { navigator.navigateBack(BackNavigationBehavior.PopLatest); navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, "playlist:$id") } }
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
private fun ScreenFrame(title: String, status: SyncStatus, retry: () -> Unit, addLabel: Int = R.string.m4_create, back: (() -> Unit)? = null, settings: (() -> Unit)? = null, add: (() -> Unit)? = null, edit: (() -> Unit)? = null, selectionData: ScreenData? = null, selectionSession: Session? = null, route: String? = null, content: @Composable () -> Unit) {
    val selection = LocalEpisodeSelection.current
    Scaffold(topBar = {
        if (selection != null && selection.ids.isNotEmpty() && selectionData != null && selectionSession != null) SelectionToolbar(selection, selectionData, selectionSession, route)
        else TopAppBar(title = { Column {
            Text(title, Modifier.semantics { heading() }, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (status == SyncStatus.Offline || status == SyncStatus.Error) Text(stringResource(if (status == SyncStatus.Offline) R.string.offline else R.string.sync_error), style = MaterialTheme.typography.bodySmall)
        } }, navigationIcon = {
            if (back != null) ActionIcon(R.drawable.ic_back, stringResource(R.string.back), action = back)
        }, actions = {
            if (edit != null) ActionIcon(R.drawable.ic_edit, stringResource(R.string.m4_edit), action = edit)
            if (add != null) ActionIcon(R.drawable.ic_add, stringResource(addLabel), action = add)
            if (settings != null) ActionIcon(R.drawable.ic_settings, stringResource(R.string.settings), action = settings)
            if (status == SyncStatus.Offline || status == SyncStatus.Error) TextButton(onClick = retry) { Text(stringResource(R.string.retry)) }
        })
    }, contentWindowInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) { content() }
    }

}

@Composable
private fun Directory(destination: Destination, data: ScreenData, session: Session, open: (String) -> Unit) {
    LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
        when (destination) {
            Destination.Views -> {
                item { GettingStarted(data, session, open) }
                if (data.state.views.isEmpty()) item { EmptyMessage(R.string.no_views); TextButton(onClick = { open("new-view:${java.util.UUID.randomUUID()}") }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.m4_new_view)) } }
                items(data.state.views, key = { "view:${it.id}" }) { view -> NameRow(view.name, sortLabel(view.sort)) { open("view:${view.id}") } }
            }
            Destination.Playlists -> {
                if (data.state.playlists.isEmpty()) item { EmptyMessage(R.string.no_playlists); TextButton(onClick = { open("new-playlist") }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.new_playlist)) } }
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
        route?.startsWith("view-edit:") == true || route?.startsWith("new-view:") == true -> {
            val view = data.state.views.find { it.id == id } ?: if (route.startsWith("new-view:")) View(id!!, stringResource(R.string.m4_new_view), ViewFilter(), ViewSort.PublishedDesc, null) else null
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
            else if (data.episodes.isEmpty()) Column { EmptyMessage(R.string.no_matches); TextButton(onClick = { open("view-edit:$id") }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.edit_conditions)) } }
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
internal fun EpisodeRow(row: Row, data: ScreenData, session: Session, position: Double? = null, entryPlaylist: String? = null, showActions: Boolean = true, showArtwork: Boolean = true, onClick: (() -> Unit)? = null) {
    val model = LocalAppModel.current
    val add = LocalAddEpisode.current
    val started = LocalPlaybackStarted.current
    val selection = LocalEpisodeSelection.current.takeIf { onClick != null }
    val selecting = selection?.ids?.isNotEmpty() == true
    val id = row["id"] as String
    val progress = position ?: data.state.playlists.flatMap { it.entries }.filter { it.episodeId == row["id"] }.maxOfOrNull { it.position } ?: 0.0
    val duration = (row["duration"] as? Number)?.toDouble()
    val stacked = LocalDensity.current.fontScale >= 1.5f || entryPlaylist != null
    val actions: @Composable () -> Unit = {
        ActionIcon(R.drawable.ic_add, stringResource(R.string.add_to_playlist)) { add(id) }
        ActionIcon(R.drawable.ic_play, stringResource(if (entryPlaylist == null) R.string.play_now else R.string.play_from_here)) {
            if (entryPlaylist == null) model.playNow(id) else model.playEntry(entryPlaylist, id)
            started()
        }
        if (entryPlaylist != null) EntryMenu(data.state.playlists.first { it.id == entryPlaylist }, id)
    }
    Column {
        Row(Modifier.fillMaxWidth().then(if (selecting) Modifier.toggleable(id in selection.ids, role = Role.Checkbox) { selection.toggle(id) }.semantics(mergeDescendants = true) {} else if (onClick != null) Modifier.combinedClickable(onClick = onClick, onLongClickLabel = stringResource(R.string.select_episode), onLongClick = { selection?.toggle(id) }) else Modifier).padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            if (selecting) Checkbox(id in selection.ids, null)
            else if (showArtwork) ArtworkImage(session, row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(row["title"] as String, style = MaterialTheme.typography.titleMedium, maxLines = if (showArtwork) 3 else Int.MAX_VALUE, overflow = TextOverflow.Ellipsis)
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
            if (showActions && !selecting && !stacked) Row { actions() }
        }
        if (showActions && !selecting && stacked) Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.End) { actions() }

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
            EpisodeRow(row, data, session, showActions = false, showArtwork = false)
            Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Button(onClick = { model.playNow(id); started() }, modifier = Modifier.fillMaxWidth()) { Icon(painterResource(R.drawable.ic_play), null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.play_now)) }
                DetailAction(R.drawable.ic_add, stringResource(R.string.add_to_playlist)) { add(id) }
                val played = data.state.episodeStates[id]?.played != null
                DetailAction(R.drawable.ic_check, stringResource(if (played) R.string.mark_unplayed else R.string.mark_played)) { model.edit(if (played) Change.MarkUnplayed(id) else Change.MarkPlayed(id, PlayedSource.User)) }
                val starred = data.state.episodeStates[id]?.starred == true
                DetailAction(R.drawable.ic_star, stringResource(if (starred) R.string.unstar else R.string.star)) { model.edit(Change.SetStar(id, !starred)) }
                val context = LocalContext.current
                val shareLink = (row["guid"] as? String)?.takeIf { it.startsWith("https://") || it.startsWith("http://") } ?: row["audio_url"] as? String
                if (shareLink != null) DetailAction(R.drawable.ic_share, stringResource(R.string.share_episode)) { context.startActivity(android.content.Intent.createChooser(android.content.Intent(android.content.Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(android.content.Intent.EXTRA_TEXT, shareLink); putExtra(android.content.Intent.EXTRA_TITLE, row["title"] as String) }, null)) }
            }
            DownloadAction(id, session)
        }
        val entries = data.state.playlists.mapNotNull { playlist -> playlist.entries.find { it.episodeId == id }?.let { playlist to it } }
        item { Section(stringResource(R.string.in_playlists)) }
        if (entries.isEmpty()) item { Hint(stringResource(R.string.not_in_playlist)) }
        items(entries, key = { it.first.id }) { (playlist, entry) ->
            ListItem(headlineContent = { Text(playlist.name, maxLines = 3, overflow = TextOverflow.Ellipsis) }, supportingContent = { Text(stringResource(R.string.playlist_position, duration(entry.position))) }, trailingContent = {
                TextButton(onClick = { model.playEntry(playlist.id, id); started() }) { Text(stringResource(R.string.resume)) }
            })
        }
        if (chapters.isNotEmpty()) item { Section(stringResource(R.string.chapters)) }
        items(chapters, key = { it.start }) { chapter ->
            ListItem(headlineContent = { Text(chapter.title, maxLines = 3, overflow = TextOverflow.Ellipsis) }, supportingContent = { Text(duration(chapter.start)) }, leadingContent = { ArtworkImage(session, chapter.artwork?.url ?: row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String) }, trailingContent = {
                TextButton(onClick = { model.playNow(id); model.seek(chapter.start); started() }) { Text(stringResource(R.string.play)) }
            })
        }
        item { Section(stringResource(R.string.show_notes)) }
        item { SelectionContainer {
            Text(showNotes(row["description"] as? String ?: ""), Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium)
        } }
    }
}

@Composable
internal fun NameRow(title: String, subtitle: String, artwork: String? = null, session: Session? = null, onClick: () -> Unit) {
    ListItem(modifier = Modifier.clickable(onClick = onClick), headlineContent = { Text(title, maxLines = 3, overflow = TextOverflow.Ellipsis) }, supportingContent = { Text(subtitle) },
        leadingContent = if (session != null) { { ArtworkImage(session, artwork) } } else null)
    HorizontalDivider()
}

@Composable internal fun Hint(text: String) { Text(text, Modifier.padding(horizontal = 16.dp, vertical = 12.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
@Composable internal fun Section(text: String, inset: androidx.compose.ui.unit.Dp = 16.dp) { Text(text, Modifier.padding(start = inset, end = inset, top = 20.dp, bottom = 8.dp).semantics { heading() }, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleSmall) }
@Composable internal fun EmptyMessage(resource: Int) { Text(stringResource(resource), Modifier.padding(16.dp), style = MaterialTheme.typography.bodyLarge) }
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
