@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.material3.adaptive.ExperimentalMaterial3AdaptiveApi::class)

package app.podlist

import app.podlist.data.updateGettingStartedProgress

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
import androidx.compose.ui.input.nestedscroll.nestedScroll
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
import app.podlist.data.FormDraftStore
import app.podlist.data.loadBrowsingContext
import app.podlist.data.saveBrowsingContext
import androidx.compose.material3.adaptive.layout.ThreePaneScaffoldDestinationItem
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
    DownloadNotificationPermission(model)
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
    val restored by produceState<BrowsingState?>(null, session) {
        value = BrowsingState(withContext(Dispatchers.IO) { session.db.loadBrowsingContext() })
    }
    val browsing = restored ?: return
    LaunchedEffect(browsing) {
        snapshotFlow { browsing.context }.collect { context -> withContext(Dispatchers.IO) { session.db.saveBrowsingContext(context) } }
    }
    val drafts by produceState<FormDraftState?>(null, session) {
        value = withContext(Dispatchers.IO) { val store = FormDraftStore(session.db); FormDraftState(store, store.load()) }
    }
    val readyDrafts = drafts ?: return
    DisposableEffect(readyDrafts) {
        model.flushFormDrafts = readyDrafts::flush
        onDispose { model.flushFormDrafts = null; readyDrafts.close() }
    }
    val undoRevision by model.undoRevision.collectAsState()
    LaunchedEffect(undoRevision) { readyDrafts.reload() }
    CompositionLocalProvider(LocalBrowsingState provides browsing, LocalFormDrafts provides readyDrafts) { ConnectedNavigation(model, session, browsing) }
}

@Composable
private fun ConnectedNavigation(model: AppModel, session: Session, browsing: BrowsingState) {
    var destination by rememberSaveable { mutableStateOf(Destination.valueOf(browsing.context.destination)) }
    LaunchedEffect(destination) { browsing.context = browsing.context.copy(destination = destination.name) }
    var collapseNavigation by rememberSaveable { mutableIntStateOf(0) }
    var requestedRoot by rememberSaveable { mutableStateOf<Destination?>(null) }
    val helpRequest by model.gettingStartedRequest.collectAsState()
    LaunchedEffect(helpRequest) { if (helpRequest?.take() != null) { destination = Destination.Views; requestedRoot = Destination.Views }; model.gettingStartedRequest.compareAndSet(helpRequest, null) }
    var incomingRoute by rememberSaveable { mutableStateOf<String?>(null) }
    val incoming by model.incoming.collectAsState()
    LaunchedEffect(incoming) { incoming?.take()?.let { request ->
        when (request) {
            is IncomingContent.Feed -> { model.incomingFeed.value = request.address; incomingRoute = "add-podcasts" }
            is IncomingContent.Opml -> { model.opml(session).read(request.uri); incomingRoute = "settings" }
        }
        destination = Destination.Library
        collapseNavigation++
        model.incoming.compareAndSet(incoming, null)
    } }
    val shortcut by model.shortcut.collectAsState()
    LaunchedEffect(shortcut) { shortcut?.let { value -> Destination.entries.find { it.name.equals(value, true) }?.let { destination = it; requestedRoot = it }; model.shortcut.value = null } }
    var revealRoute by rememberSaveable { mutableStateOf<String?>(null) }
    var revealEpisode by rememberSaveable { mutableStateOf<String?>(null) }
    var revealToken by rememberSaveable { mutableLongStateOf(0L) }
    val reveal by model.reveal.collectAsState()
    LaunchedEffect(reveal) { reveal?.take()?.let { target ->
        revealRoute = target.route
        revealEpisode = target.episode
        revealToken = target.token
        model.reveal.compareAndSet(reveal, null)
        collapseNavigation++
        if (target.route.startsWith("view:") || target.route == "views-root") destination = Destination.Views
        else if (target.route.startsWith("playlist:") || target.route.startsWith("playlist-settings:") || target.route == "playlists-root") destination = Destination.Playlists
        else if (target.route.startsWith("subscription:") || target.route == "search") destination = Destination.Library
    } }
    val cache = remember(session) { mutableStateMapOf<String, ScreenData>() }
    val tabs = rememberSaveableStateHolder()
    var requestedPlaylist by rememberSaveable { mutableStateOf<String?>(null) }
    val chrome = remember { ContextualChrome() }
    val navigation = androidx.compose.material3.adaptive.navigationsuite.rememberNavigationSuiteScaffoldState()
    LaunchedEffect(chrome.hidden) { if (chrome.hidden) navigation.hide() else navigation.show() }
    CompositionLocalProvider(LocalContextualChrome provides chrome) {
        NavigationSuiteScaffold(state = navigation, navigationSuiteItems = {
            Destination.entries.forEach { target ->
                item(selected = destination == target, onClick = { if (destination == target) requestedRoot = target; destination = target; collapseNavigation++ },
                    icon = { Icon(painterResource(target.icon), contentDescription = null) },
                    label = { Text(stringResource(target.title)) })
            }
        }) {
            PlayerContainer(model, session, openPlaylist = { requestedPlaylist = it; destination = Destination.Playlists }, collapseNavigation = collapseNavigation) {
                tabs.SaveableStateProvider(destination.name) {
                    DestinationStack(destination, model, session, cache, incomingRoute.takeIf { destination == Destination.Library }, { incomingRoute = null }, revealRoute?.let { Reveal(it, revealEpisode, revealToken) }, { revealRoute = null }, requestedPlaylist.takeIf { destination == Destination.Playlists }, consumed = { requestedPlaylist = null }, resetRoot = requestedRoot == destination, rootConsumed = { requestedRoot = null }, rootBack = { destination = Destination.Views })
                }
            }
        }
    }
}

@Composable
private fun DestinationStack(destination: Destination, model: AppModel, session: Session, cache: MutableMap<String, ScreenData>, incomingRoute: String?, incomingConsumed: () -> Unit, pendingReveal: Reveal?, revealConsumed: () -> Unit, requestedPlaylist: String?, consumed: () -> Unit, resetRoot: Boolean, rootConsumed: () -> Unit, rootBack: () -> Unit) {
    val browsing = LocalBrowsingState.current
    val drafts = LocalFormDrafts.current
    val initialHistory = remember(destination) {
        listOf(ThreePaneScaffoldDestinationItem<String>(ListDetailPaneScaffoldRole.List)) +
            browsing?.context?.stacks?.get(destination.name).orEmpty().map { ThreePaneScaffoldDestinationItem(ListDetailPaneScaffoldRole.Detail, it) }
    }
    val navigator = rememberListDetailPaneScaffoldNavigator<String>(initialDestinationHistory = initialHistory)
    val scope = rememberCoroutineScope()
    val route = navigator.currentDestination?.contentKey
    LaunchedEffect(route) { if (browsing != null) browsing.context = browsing.context.visiting(destination.name, route) }
    val revision by model.revision.collectAsState()
    val status by model.status.collectAsState()
    val data = cache[route ?: "root"]
    BackHandler(route == null && destination != Destination.Views, onBack = rootBack)
    LaunchedEffect(session, revision, route) {
        val loaded = withContext(Dispatchers.IO) { readScreen(session.db, route) }
        val id = route?.substringAfter(':')
        val available = when (route?.substringBefore(':')) {
            "view", "view-edit" -> loaded.state.views.any { it.id == id }
            "playlist", "playlist-settings" -> loaded.state.playlists.any { it.id == id }
            "subscription" -> loaded.subscriptions.any { it["id"] == id }
            "subscription-settings" -> loaded.subscriptions.any { it["id"] == id && it["unsubscribed_at"] == null }
            "episode" -> loaded.episodes.isNotEmpty()
            else -> true
        }
        if (!available && navigator.canNavigateBack(BackNavigationBehavior.PopLatest)) navigator.navigateBack(BackNavigationBehavior.PopLatest)
        else cache[route ?: "root"] = loaded
    }
    val pages = rememberSaveableStateHolder()
    suspend fun showRoot() {
        while (navigator.canNavigateBack(BackNavigationBehavior.PopLatest)) navigator.navigateBack(BackNavigationBehavior.PopLatest)
    }
    val open: (String) -> Unit = { next ->
        when (next) {
            "new-view" -> scope.launch { navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, "new-view:${drafts.pendingNewViewId()}") }
            "getting-started" -> model.showGettingStarted()
            "directory" -> scope.launch { showRoot() }
            else -> scope.launch { navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, next) }
        }
    }
    LaunchedEffect(resetRoot) { if (resetRoot) { showRoot(); rootConsumed() } }
    LaunchedEffect(pendingReveal) { pendingReveal?.let { target ->
        val sameViewEditor = (route?.startsWith("view-edit:") == true || route?.startsWith("new-view:") == true) && route.substringAfter(':') == target.route.substringAfter(':')
        if (target.route.endsWith("-root")) showRoot()
        else if (!sameViewEditor && route != target.route) navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, target.route)
        if (target.route.startsWith("playlist:")) model.entryReveal.value = target
        revealConsumed()
    } }
    LaunchedEffect(incomingRoute) { incomingRoute?.let {
        if (route != it) navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, it)
        incomingConsumed()
    } }
    val back: () -> Unit = { scope.launch { navigator.navigateBack(BackNavigationBehavior.PopLatest) } }
    LaunchedEffect(requestedPlaylist) { requestedPlaylist?.let { navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, "playlist:$it"); consumed() } }
    // This wraps ListDetailPaneScaffold and provides gesture-driven predictive back transitions.
    CompositionLocalProvider(LocalBrowsingRoute provides "${destination.name}/${route ?: "root"}") {
        SelectionProvider(route, data, session) {
            NavigableListDetailPaneScaffold(
                navigator = navigator,
                defaultBackBehavior = BackNavigationBehavior.PopLatest,
                listPane = {
                    AnimatedPane {
                        ScreenFrame(stringResource(destination.title), status, model::requestSync, addLabel = when (destination) { Destination.Views -> R.string.m4_new_view; Destination.Playlists -> R.string.new_playlist; Destination.Library -> R.string.add_podcasts }, settings = { open("settings") }, search = if (destination == Destination.Views) ({ open("search") }) else null, add = ({ when (destination) {
                            Destination.Library -> open("add-podcasts")
                            Destination.Playlists -> open("new-playlist")
                            Destination.Views -> open("new-view")
                        } })) {
                            val loaded = data
                            if (loaded == null || (destination == Destination.Views && !loaded.hasLibrary) || (status == SyncStatus.Loading && if (destination == Destination.Library) !loaded.hasLibrary else !loaded.hasState)) Loading()
                            else if (if (destination == Destination.Library) !loaded.hasLibrary else !loaded.hasState) EmptyMessage(R.string.no_synced_data)
                            else pages.SaveableStateProvider("root") {
                                CompositionLocalProvider(LocalBrowsingRoute provides "${destination.name}/root") { Directory(destination, loaded, session, open) }
                            }
                        }
                    }
                },
                detailPane = {
                    AnimatedPane {
                        val loaded = data
                        val title = when {
                            route == "settings" || route == "appearance" -> stringResource(R.string.settings)
                            route == "new-playlist" -> stringResource(R.string.new_playlist)
                            route == "search" -> stringResource(R.string.m4_search_library)
                            route == "getting-started" -> stringResource(R.string.m4_getting_started)
                            route == "select-subscriptions" -> stringResource(R.string.m4_select_subscriptions)
                            route == "listening-stats" -> stringResource(R.string.m4_listening_stats)
                            route?.startsWith("new-view:") == true -> stringResource(R.string.m4_new_view)
                            route?.startsWith("view-edit:") == true -> stringResource(R.string.m4_edit_view)
                            route?.startsWith("playlist-settings:") == true -> stringResource(R.string.playlist_settings_for, loaded?.state?.playlists?.find { it.id == route.substringAfter(':') }?.name.orEmpty())
                            route?.startsWith("subscription-settings:") == true -> stringResource(R.string.playlist_settings_for, loaded?.subscriptions?.find { it["id"] == route.substringAfter(':') }?.get("title") as? String ?: "")
                            route == "server" -> stringResource(R.string.server)
                            route == "add-podcasts" -> stringResource(R.string.add_podcasts)
                            route == "trash" -> stringResource(R.string.trash)
                            route?.startsWith("view:") == true -> loaded?.state?.views?.find { it.id == route.substringAfter(':') }?.name.orEmpty()
                            route?.startsWith("playlist:") == true -> loaded?.state?.playlists?.find { it.id == route.substringAfter(':') }?.name.orEmpty()
                            route?.startsWith("subscription:") == true -> loaded?.subscriptions?.find { it["id"] == route.substringAfter(':') }?.get("title") as? String ?: ""
                            else -> loaded?.episodes?.firstOrNull()?.get("title") as? String ?: stringResource(R.string.episode)
                        }
                        if (route?.startsWith("podcast:") == true || route?.startsWith("subscription:") == true) {
                            val result = if (route.startsWith("podcast:")) podcastFromRoute(route) else loaded?.subscriptions?.find { it["id"] == route.substringAfter(':') }?.let { row ->
                                app.podlist.data.DirectoryResult(title = row["title"] as String, author = row["author"] as? String, feedUrl = row["feed_url"] as String, artworkUrl = row["artwork_url"] as? String, source = "library")
                            }
                            if (result == null || loaded == null) Loading() else pages.SaveableStateProvider(route) {
                                PodcastPageScreen(result, loaded, session, fromSearch = route.startsWith("podcast:"), open = open, back = back)
                            }
                        } else ScreenFrame(title, status, model::requestSync, back = back, selectionData = loaded, selectionSession = session, route = route, edit = when {
                            route?.startsWith("view:") == true -> ({ open("view-edit:${route.substringAfter(':')}") })
                            route?.startsWith("playlist:") == true -> ({ open("playlist-settings:${route.substringAfter(':')}") })
                            else -> null
                        }) {
                            when {
                                route == "add-podcasts" -> AddPodcastsScreen(model, session, open)
                                route == "server" -> ServerScreen(model, session.source.server?.origin, back)
                                route == "new-playlist" && loaded != null -> NewPlaylistScreen(model, loaded, discard = back) { id -> scope.launch { navigator.navigateBack(BackNavigationBehavior.PopLatest); navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, "playlist:$id") } }
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
}

@Composable
private fun ScreenFrame(title: String, status: SyncStatus, retry: () -> Unit, addLabel: Int = R.string.create_view, back: (() -> Unit)? = null, settings: (() -> Unit)? = null, add: (() -> Unit)? = null, edit: (() -> Unit)? = null, search: (() -> Unit)? = null, selectionData: ScreenData? = null, selectionSession: Session? = null, route: String? = null, content: @Composable () -> Unit) {
    val selection = LocalEpisodeSelection.current
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    val collapsingTitle = remember(route) { CollapsingTitle() }
    val barTitle = if (route?.startsWith("episode:") == true && collapsingTitle.headlineVisible) stringResource(R.string.episode) else title
    Scaffold(modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection), topBar = {
        if (selection != null && selection.ids.isNotEmpty() && selectionData != null && selectionSession != null) {
            SelectionToolbar(selection)
        }
        else Column {
            TopAppBar(scrollBehavior = scrollBehavior, title = { Text(barTitle, Modifier.semantics { heading() }, maxLines = 1, overflow = TextOverflow.Ellipsis) }, navigationIcon = {
                if (back != null) ActionIcon(R.drawable.ic_back, stringResource(R.string.back), action = back)
            }, actions = {
                EditHistoryMenu(overflow = route?.startsWith("episode:") != true)
                if (route == "select-subscriptions" && selection != null) SelectAllAction(selection)
                if (edit != null) ActionIcon(R.drawable.ic_edit,
                    stringResource(if (route?.startsWith("playlist:") == true) R.string.playlist_settings else R.string.m4_edit_view), action = edit)
                if (route?.startsWith("episode:") == true && selectionData != null && selectionSession != null) EpisodeOverflow(selectionData, selectionSession)
                if (search != null) ActionIcon(R.drawable.ic_search, stringResource(R.string.m4_search_library), action = search)
                if (add != null) ActionIcon(R.drawable.ic_add, stringResource(addLabel), action = add)
                if (settings != null) ActionIcon(R.drawable.ic_settings, stringResource(R.string.settings), action = settings)

            })
            if (status == SyncStatus.Offline || status == SyncStatus.Error) Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(if (status == SyncStatus.Offline) R.string.offline else R.string.sync_error), Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                ContentTextButton(onClick = retry) { Text(stringResource(R.string.retry)) }
            }
        }
    }, bottomBar = {
        if (selection != null && selection.ids.isNotEmpty() && selectionData != null && selectionSession != null) {
            if (route == "select-subscriptions") SubscriptionSelectionActionBar(selection, selectionData, selectionSession)
            else SelectionActionBar(selection, selectionData, selectionSession, route)
        }
    }, contentWindowInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)) { padding ->
        CompositionLocalProvider(LocalCollapsingTitle provides collapsingTitle) {
            Box(Modifier.fillMaxSize().padding(padding)) { content() }
        }
    }

}

@Composable
private fun Directory(destination: Destination, data: ScreenData, session: Session, open: (String) -> Unit) {
    val subscriptions = data.subscriptions.filter { it["unsubscribed_at"] == null }
    fun group(mode: DownloadMode) = subscriptions.filter { subscription ->
        (data.state.downloadRules.find { it.deviceId == session.deviceId && it.subscriptionId == subscription["id"] }?.mode ?: DownloadMode.Never) == mode
    }
    val keys = buildList {
        when (destination) {
            Destination.Views -> {
                add("getting-started")
                if (data.state.views.isEmpty()) add("no-views")
                addAll(data.state.views.map { "view:${it.id}" })
            }
            Destination.Playlists -> {
                if (data.state.playlists.isEmpty()) add("no-playlists")
                addAll(data.state.playlists.map { "playlist:${it.id}" })
                add("trash")
            }
            Destination.Library -> {
                add("search")
                if (subscriptions.isEmpty()) add("no-subscriptions")
                for (mode in DownloadMode.entries) {
                    add("rule:$mode")
                    val rows = group(mode)
                    addAll(rows.map { "subscription:${it["id"]}" })
                    if (rows.isEmpty()) add("empty:$mode")
                }
                if (subscriptions.isNotEmpty()) add("select-subscriptions")
            }
        }
        add("end")
    }
    LazyColumn(state = rememberBrowsingListState(keys = keys), modifier = Modifier.fillMaxSize()) {
        when (destination) {
            Destination.Views -> {
                item(key = "getting-started") { GettingStarted(data, session, open) }
                if (data.state.views.isEmpty()) item(key = "no-views") { EmptyMessage(R.string.no_views); FilledTonalButton(onClick = { open("new-view") }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.m4_new_view)) } }
                items(data.state.views, key = { "view:${it.id}" }) { view -> NameRow(view.name, ViewSummary.distinctSummary(view.name, viewDescription(view, data))) { open("view:${view.id}") } }
            }
            Destination.Playlists -> {
                if (data.state.playlists.isEmpty()) item(key = "no-playlists") { EmptyMessage(R.string.no_playlists); FilledTonalButton(onClick = { open("new-playlist") }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.new_playlist)) } }
                items(data.state.playlists, key = { "playlist:${it.id}" }) { playlist ->
                    val details = listOfNotNull(if (playlist.id == data.state.activePlaylistId) stringResource(R.string.active) else null,
                        pluralStringResource(R.plurals.entry_count, playlist.entries.size, playlist.entries.size), stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played else R.string.keeps_entries))
                    NameRow(playlist.name, details.joinToString(" · ")) { open("playlist:${playlist.id}") }
                }
                item(key = "trash") { NameRow(stringResource(R.string.trash), pluralStringResource(R.plurals.playlist_count, PlaylistRules.availableTrash(data.state, System.currentTimeMillis()).size, PlaylistRules.availableTrash(data.state, System.currentTimeMillis()).size)) { open("trash") } }
            }
            Destination.Library -> {
                item(key = "search") { NameRow(stringResource(R.string.m4_search_library), stringResource(R.string.m4_search_hint), icon = R.drawable.ic_search) { open("search") } }
                if (subscriptions.isEmpty()) item(key = "no-subscriptions") {
                    EmptyMessage(R.string.no_subscriptions)
                    FilledTonalButton(onClick = { open("add-podcasts") }, modifier = Modifier.padding(horizontal = 16.dp)) {
                        Text(stringResource(R.string.add_podcasts))
                    }
                }
                for ((mode, title) in listOf(DownloadMode.Never to R.string.stream, DownloadMode.OnEntry to R.string.on_entry, DownloadMode.AllNew to R.string.all_new)) {
                    val group = group(mode)
                    if (group.isNotEmpty()) item(key = "rule:$mode") { Section(stringResource(title)) }
                    items(group, key = { "subscription:${it["id"]}" }) { subscription ->
                        NameRow(subscription["title"] as String, pluralStringResource(R.plurals.episode_count, (subscription["episode_count"] as Number).toInt(), (subscription["episode_count"] as Number).toInt()),
                            artwork = subscription["artwork_url"] as? String, session = session) { open("subscription:${subscription["id"]}") }
                        SubscriptionRefreshStatus(subscription, session)
                    }
                }
                val unused = listOf(DownloadMode.Never to R.string.stream, DownloadMode.OnEntry to R.string.on_entry, DownloadMode.AllNew to R.string.all_new).filter { group(it.first).isEmpty() }
                if (unused.isNotEmpty()) item(key = "unused-rules") {
                    Text(stringResource(R.string.unused_download_rules, unused.map { stringResource(it.second) }.joinToString(", ")), Modifier.padding(horizontal = 16.dp, vertical = 8.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (subscriptions.isNotEmpty()) item(key = "select-subscriptions") { NameRow(stringResource(R.string.m4_select_subscriptions), stringResource(R.string.m4_select_subscriptions_help), icon = R.drawable.ic_select_all) { open("select-subscriptions") } }
            }
        }
        item(key = "end") { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun Detail(route: String?, data: ScreenData, session: Session, open: (String) -> Unit, back: () -> Unit) {
    val id = route?.substringAfter(':')
    val model = LocalAppModel.current
    when {
        route == "settings" || route == "appearance" -> SettingsScreen(data, session, open, initialAppearance = route == "appearance")
        route == "trash" -> TrashScreen(data) { model.requestReveal(Reveal("playlists-root")) }
        route == "search" -> SearchScreen(data, session, open)
        route == "listening-stats" -> ListeningStatsScreen(data, session) { model.requestReveal(Reveal("views-root")) }
        route == "select-subscriptions" -> SelectSubscriptionsScreen(data, session) { open("add-podcasts") }
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
            if (subscription == null) EmptyMessage(R.string.missing_subscription) else SubscriptionSettingsScreen(subscription, data, session)
        }
        route?.startsWith("view:") == true -> {
            val view = data.state.views.find { it.id == id }
            LaunchedEffect(view?.id) {
                if (view != null) withContext(Dispatchers.IO) { session.db.setMeta("gettingStartedExploredView", "true"); session.db.updateGettingStartedProgress(); session.db.notifyChanged() }
            }
            if (view == null) Column { EmptyMessage(R.string.missing_view); FilledTonalButton(modifier = Modifier.padding(horizontal = 16.dp), onClick = { open("directory") }) { Text(stringResource(R.string.views)) } }
            else if (data.episodes.isEmpty() && data.subscriptions.none { it["unsubscribed_at"] == null }) Column { EmptyMessage(R.string.no_subscriptions); FilledTonalButton(modifier = Modifier.padding(horizontal = 16.dp), onClick = { open("add-podcasts") }) { Text(stringResource(R.string.add_podcasts)) } }
            else if (data.episodes.isEmpty()) Column { EmptyMessage(R.string.no_matches); FilledTonalButton(onClick = { open("view-edit:$id") }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.edit_conditions)) } }
            else EpisodeList(data.episodes, data, session, open, empty = R.string.no_matches, summary = {
                Text(pluralStringResource(R.plurals.episode_count, data.episodes.size, data.episodes.size), style = MaterialTheme.typography.titleSmall)
                Text(viewDescription(view, data, compact = false), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            })
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
    LazyColumn(state = rememberBrowsingListState(keys = (if (summary != null) listOf("summary") else emptyList()) + rows.map { it["id"] as String }), modifier = Modifier.fillMaxSize().listSelectionKeys(selection)) {
        if (summary != null) item(key = "summary") { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { summary() } }
        if (rows.isEmpty()) item { EmptyMessage(empty) }
        items(rows, key = { it["id"] as String }) { row -> EpisodeRow(row, data, session) { open("episode:${row["id"]}") } }
    }
}

@Composable
internal fun EpisodeRow(row: Row, data: ScreenData, session: Session, position: Double? = null, entryPlaylist: String? = null, showActions: Boolean = true, showArtwork: Boolean = true, showPodcast: Boolean = true, detail: Boolean = false, actionsEnabled: Boolean = true, actionBusy: Boolean = false, rowModifier: Modifier = Modifier, addAction: (() -> Unit)? = null, playAction: (() -> Unit)? = null, actionError: @Composable () -> Unit = {}, onClick: (() -> Unit)? = null) {
    val model = LocalAppModel.current
    val add = LocalAddEpisode.current
    val started = LocalPlaybackStarted.current
    val selection = LocalEpisodeSelection.current.takeIf { onClick != null }
    val selecting = selection?.ids?.isNotEmpty() == true
    val id = row["id"] as String
    val progress = position ?: data.state.playlists.flatMap { it.entries }.filter { it.episodeId == row["id"] }.maxOfOrNull { it.position } ?: 0.0
    val duration = (row["duration"] as? Number)?.toDouble()
    val stacked = LocalDensity.current.fontScale >= 1.5f
    val actions: @Composable () -> Unit = {
        if (entryPlaylist == null) ActionIcon(R.drawable.ic_playlist_add, stringResource(R.string.add_to_playlist), enabled = actionsEnabled) { if (addAction != null) addAction() else add(id) }
        else EntryMenu(data.state.playlists.first { it.id == entryPlaylist }, id)
        ActionIcon(R.drawable.ic_play, stringResource(if (entryPlaylist == null) R.string.play_now else R.string.play_from_here), enabled = actionsEnabled) {
            if (playAction != null) playAction() else {
                if (entryPlaylist == null) model.playNow(id) else model.playEntry(entryPlaylist, id)
                started()
            }
        }
    }
    val progressLabel = stringResource(R.string.playback_position)
    Column(Modifier.background(if (selecting && id in selection.ids) MaterialTheme.colorScheme.secondaryContainer else androidx.compose.ui.graphics.Color.Transparent)) {
        Row(rowModifier.fillMaxWidth().then(if (selecting) Modifier.toggleable(id in selection.ids, role = Role.Checkbox) { selection.toggle(id) }.semantics(mergeDescendants = true) {} else if (onClick != null && selection != null) Modifier.combinedClickable(onClick = onClick, onLongClickLabel = stringResource(R.string.select_episode), onLongClick = { selection.toggle(id) }) else if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            if (selecting) Checkbox(id in selection.ids, null)
            else if (entryPlaylist != null) EntryDragHandle(data.state.playlists.first { it.id == entryPlaylist }, id)
            else if (showArtwork) ArtworkImage(session, row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String, placeholderTitle = row["podcast"] as? String)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(row["title"] as String, modifier = if (detail) headlineVisibility(LocalCollapsingTitle.current) else Modifier, style = if (detail) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.titleMedium, maxLines = if (detail) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                val published = shortDate((row["published"] as Number).toLong())
                Text(listOfNotNull((row["podcast"] as? String).takeIf { showPodcast }, published, duration?.let { lengthLabel(it) }).joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                val played = row["played_at"] != null
                val state = when {
                    played -> stringResource(R.string.played)
                    progress > 0 -> stringResource(R.string.in_progress, if (duration != null) "${duration(progress)} / ${duration(duration)}" else duration(progress))
                    else -> stringResource(R.string.unplayed)
                }
                val starred = (row["starred"] as? Number)?.toInt() == 1
                Text(if (starred) "$state · ${stringResource(R.string.starred)}" else state, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (actionBusy) LinearProgressIndicator(Modifier.fillMaxWidth().then(ProgressModifier(R.string.podcast_bringing_episode)))
                if (progress > 0 && duration != null && duration > 0) LinearProgressIndicator(progress = { (progress / duration).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().padding(top = 4.dp).semantics { contentDescription = progressLabel; stateDescription = duration(progress) })
            }
            if (showActions && !selecting && !stacked) Row { actions() }
        }
        if (showActions && !selecting && stacked) Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.End) { actions() }

        actionError()
        if (!detail) HorizontalDivider()
    }
}

@Composable
internal fun EpisodeOverflow(data: ScreenData, session: Session) {
    val row = data.episodes.firstOrNull() ?: return
    val id = row["id"] as String
    var expanded by remember { mutableStateOf(false) }
    val context = LocalContext.current
    Box {
        ActionIcon(R.drawable.ic_entry_actions, stringResource(R.string.more_actions)) { expanded = true }
        DropdownMenu(expanded, onDismissRequest = { expanded = false }) {
            RedoMenuItem { expanded = false }
            DownloadMenuItem(id, session) { expanded = false }
            val shareLink = ShareLinks.episode(row["website_url"] as? String, row["podcast_website_url"] as? String, row["feed_url"] as? String, row["audio_url"] as? String)
            DropdownMenuItem(text = { Text(stringResource(R.string.share_episode)) }, enabled = shareLink != null, onClick = {
                expanded = false
                shareText(context, row["title"] as String, shareLink, includeTitle = true)
            })
        }
    }
}

@Composable
internal fun EpisodeDetail(data: ScreenData, session: Session,
    resolve: ((Row, (String) -> Unit) -> Unit)? = null, actionsEnabled: Boolean = true,
    actionBusy: Boolean = false, actionError: @Composable () -> Unit = {}) {
    val row = data.episodes.firstOrNull()
    if (row == null) { EmptyMessage(R.string.metadata_pending); return }
    val model = LocalAppModel.current
    val add = LocalAddEpisode.current
    val started = LocalPlaybackStarted.current
    val id = row["id"] as String
    fun act(action: (String) -> Unit) { if (resolve != null) resolve(row, action) else action(id) }
    LaunchedEffect(session, id) { if (resolve == null) withContext(Dispatchers.IO) { runCatching { session.source.chapters(id) } } }
    val chapters = (row["chapters"] as? String)?.let { ProtocolJson.decodeFromString<List<Chapter>>(it) }.orEmpty()
    val notes = showNotes(row["description"] as? String ?: "")
    val collapsingTitle = LocalCollapsingTitle.current
    LazyColumn(state = rememberBrowsingListState(), modifier = Modifier.fillMaxSize().then(collapsingTitle?.viewport() ?: Modifier)) {
        item {
            Column(Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = androidx.compose.ui.Alignment.Start) {
                ArtworkImage(session, row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String, 112.dp, direct = resolve != null, placeholderTitle = row["podcast"] as? String)
            }
            EpisodeRow(row, data, session, showActions = false, showArtwork = false, detail = true, actionBusy = actionBusy)
            Column(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { act { model.playNow(it); started() } }, enabled = actionsEnabled, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).padding(horizontal = 16.dp)) { Icon(painterResource(R.drawable.ic_play), null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.play_now)) }
                ActionGrid {
                    LabelledAction(R.drawable.ic_playlist_add, stringResource(R.string.add_to_playlist), enabled = actionsEnabled) { act(add) }
                    val played = data.state.episodeStates[id]?.played != null
                    LabelledAction(if (played) R.drawable.ic_played else R.drawable.ic_unplayed, stringResource(if (played) R.string.mark_unplayed else R.string.mark_played), enabled = actionsEnabled) {
                        act { model.edit(if (played) Change.MarkUnplayed(it) else Change.MarkPlayed(it, PlayedSource.User)) }
                    }
                    val starred = data.state.episodeStates[id]?.starred == true
                    LabelledAction(if (starred) R.drawable.ic_star else R.drawable.ic_star_outline, stringResource(if (starred) R.string.unstar else R.string.star), enabled = actionsEnabled) {
                        act { model.edit(Change.SetStar(it, !starred)) }
                    }
                    if (resolve == null) DownloadAction(id, session)
                    else LabelledAction(R.drawable.ic_download, stringResource(R.string.download), enabled = actionsEnabled) {
                        act { val downloads = model.downloads(session); downloads.download(it); downloads.offerRequestUndo(listOf(it), false, R.string.m4_downloads_requested) }
                    }
                }
                if (resolve == null) DownloadStatus(id, session, Modifier.padding(horizontal = 16.dp))
                actionError()

            }

        }
        if (notes.isNotBlank()) {
            item { Section(stringResource(R.string.show_notes)) }
            item { SelectionContainer { Text(notes, Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium) } }
        }
        val entries = data.state.playlists.mapNotNull { playlist -> playlist.entries.find { it.episodeId == id }?.let { playlist to it } }
        item { Section(stringResource(R.string.in_playlists)) }
        if (entries.isEmpty()) item { Hint(stringResource(R.string.not_in_playlist)) }
        items(entries, key = { it.first.id }) { (playlist, entry) ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(playlist.name, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = TextOverflow.Ellipsis) }, supportingContent = { Text(stringResource(R.string.playlist_position, duration(entry.position))) }, trailingContent = {
                ContentTextButton(onClick = { model.playEntry(playlist.id, id); started() }) { Text(stringResource(if (entry.position > 0) R.string.resume else R.string.play)) }
            })
        }
        if (chapters.isNotEmpty()) item { Section(stringResource(R.string.chapters)) }
        items(chapters, key = { it.start }) { chapter ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(chapter.title, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = TextOverflow.Ellipsis) }, supportingContent = { Text(duration(chapter.start)) }, leadingContent = { ArtworkImage(session, chapter.artwork?.url ?: row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String, placeholderTitle = row["podcast"] as? String) }, trailingContent = {
                ContentTextButton(onClick = { model.playNow(id); model.seek(chapter.start); started() }) { Text(stringResource(R.string.play)) }
            })
        }

    }
}

@Composable
internal fun NameRow(title: String, subtitle: String, artwork: String? = null, session: Session? = null, icon: Int? = null, titleStyle: androidx.compose.ui.text.TextStyle? = null, onClick: () -> Unit) {
    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.clickable(onClick = onClick), headlineContent = { Text(title, style = titleStyle ?: MaterialTheme.typography.titleMedium, maxLines = 3, overflow = TextOverflow.Ellipsis) }, supportingContent = subtitle.takeIf { it.isNotBlank() }?.let { { Text(it) } },
        leadingContent = if (session != null) { { ArtworkImage(session, artwork, placeholderTitle = title) } } else icon?.let { { Box(Modifier.size(40.dp), contentAlignment = androidx.compose.ui.Alignment.Center) { Icon(painterResource(it), null) } } })
    HorizontalDivider()
}

@Composable internal fun Hint(text: String) { Text(text, Modifier.padding(horizontal = 16.dp, vertical = 12.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
@Composable internal fun Section(text: String, inset: androidx.compose.ui.unit.Dp = 16.dp) { Text(text, Modifier.padding(start = inset, end = inset, top = 20.dp, bottom = 8.dp).semantics { heading() }, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.titleSmall.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)) }
@Composable internal fun EmptyMessage(resource: Int) { Text(stringResource(resource), Modifier.padding(16.dp), style = MaterialTheme.typography.bodyLarge) }
@Composable internal fun Loading() { Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) { CircularProgressIndicator(Modifier.then(ProgressModifier(R.string.loading))); Text(stringResource(R.string.loading)) } }

internal fun date(millis: Long): String = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withZone(ZoneId.systemDefault()).format(Instant.ofEpochMilli(millis))
@Composable internal fun lengthLabel(seconds: Double): String {
    val minutes = ((seconds + 30) / 60).toLong()
    return if (minutes >= 60) stringResource(R.string.length_hours, minutes / 60, minutes % 60) else stringResource(R.string.length_minutes, minutes)
}

internal fun shortDate(millis: Long): String {
    val zone = ZoneId.systemDefault()
    val at = Instant.ofEpochMilli(millis).atZone(zone)
    val skeleton = if (at.year == java.time.Year.now(zone).value) "MMMd" else "yMMMd"
    val pattern = android.text.format.DateFormat.getBestDateTimePattern(java.util.Locale.getDefault(), skeleton)
    return DateTimeFormatter.ofPattern(pattern).format(at).replace(' ', '\u00a0')
}

internal fun duration(seconds: Double): String { val s = seconds.toLong(); return if (s >= 3600) "%d:%02d:%02d".format(s / 3600, s / 60 % 60, s % 60) else "%d:%02d".format(s / 60, s % 60) }

@Composable internal fun sortLabel(sort: ViewSort): String = stringResource(when (sort) {
    ViewSort.PublishedDesc -> R.string.newest_first; ViewSort.PublishedAsc -> R.string.oldest_first
    ViewSort.DurationAsc -> R.string.shortest_first; ViewSort.DurationDesc -> R.string.longest_first
})

@Composable
private fun viewDescription(view: View, data: ScreenData, compact: Boolean = true): String {
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
    ViewSummary.statuses(view.filter).forEach { status ->
        conditions += stringResource(when (status) {
            ViewSummary.Status.Unplayed -> R.string.unplayed
            ViewSummary.Status.Played -> R.string.played
            ViewSummary.Status.InProgress -> R.string.in_progress_condition
            ViewSummary.Status.Starred -> R.string.starred
            ViewSummary.Status.NotStarred -> R.string.m4_not_starred
        })
    }
    if (view.filter.notInAnyPlaylist == true) conditions += stringResource(R.string.not_in_playlist)
    view.filter.minDuration?.let { conditions += stringResource(R.string.min_duration, lengthLabel(it)) }
    view.filter.maxDuration?.let { conditions += stringResource(R.string.max_duration, lengthLabel(it)) }
    if (conditions.isEmpty()) conditions += stringResource(R.string.all_episodes)
    if (view.sort != ViewSort.PublishedDesc) conditions += sortLabel(view.sort)
    view.limit?.let { conditions += stringResource(R.string.show_limit, it) }
    if (!compact) return conditions.joinToString(" · ")
    val remaining = (conditions.size - 3).coerceAtLeast(0)
    val more = pluralStringResource(R.plurals.more_conditions, remaining, remaining)
    return ViewSummary.compact(conditions) { more }
}
